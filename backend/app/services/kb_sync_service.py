from __future__ import annotations

import asyncio
import hashlib
import html
import io
import logging
import re
import time
import uuid
from datetime import datetime, timezone
from html.parser import HTMLParser
from typing import Any, Dict, List, Optional, Set, Tuple
from urllib.parse import urljoin, urlparse

import httpx
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session_factory
from app.models.db_models import KBEntry, KBSource, KBSyncLog, QuestionReview, ResponseWorkspace, utcnow
from app.models.schemas import (
    KBEntryCreate,
    KBEntryResponse,
    KBSourceCreate,
    KBSourceResponse,
    KBSourceUpdate,
    KBSyncLogResponse,
)
from app.services.document_parser_service import DocumentParserService

logger = logging.getLogger(__name__)


class CleanHTMLToMarkdownParser(HTMLParser):
    """
    Lightweight, dependency-free HTML-to-structured-text extractor using Python's standard library.
    Strips scripts, styles, navigation bars, footers, forms, and tracking pixels.
    """

    IGNORE_TAGS = {
        "script", "style", "nav", "footer", "header", "aside",
        "noscript", "svg", "form", "button", "iframe"
    }

    BLOCK_TAGS = {"p", "div", "section", "article", "li", "blockquote", "pre"}
    HEADING_TAGS = {"h1": "# ", "h2": "## ", "h3": "### ", "h4": "#### ", "h5": "##### ", "h6": "###### "}

    def __init__(self):
        super().__init__()
        self._ignore_depth = 0
        self._pieces: List[str] = []
        self._title = ""
        self._in_title = False

    def handle_starttag(self, tag: str, attrs: List[Tuple[str, Optional[str]]]):
        tag_lower = tag.lower()
        if tag_lower in self.IGNORE_TAGS:
            self._ignore_depth += 1
            return

        if self._ignore_depth > 0:
            return

        if tag_lower == "title":
            self._in_title = True
        elif tag_lower in self.HEADING_TAGS:
            self._pieces.append(f"\n\n{self.HEADING_TAGS[tag_lower]}")
        elif tag_lower in self.BLOCK_TAGS:
            self._pieces.append("\n\n")
        elif tag_lower == "br":
            self._pieces.append("\n")

    def handle_endtag(self, tag: str):
        tag_lower = tag.lower()
        if tag_lower in self.IGNORE_TAGS:
            self._ignore_depth = max(0, self._ignore_depth - 1)
            return

        if self._ignore_depth > 0:
            return

        if tag_lower == "title":
            self._in_title = False
        elif tag_lower in self.BLOCK_TAGS or tag_lower in self.HEADING_TAGS:
            self._pieces.append("\n")

    def handle_data(self, data: str):
        if self._ignore_depth > 0:
            return

        text = data.strip()
        if not text:
            return

        if self._in_title:
            self._title = (self._title + " " + text).strip()
        else:
            self._pieces.append(text + " ")

    def get_clean_text(self) -> Tuple[str, str]:
        raw = "".join(self._pieces)
        cleaned = re.sub(r"\n{3,}", "\n\n", raw).strip()
        return self._title, html.unescape(cleaned)


class KBSyncService:
    """
    Automated Knowledge Base Synchronization and Multi-Source Ingestion Engine.
    Handles continuous ingestion from Web trust portals, GitHub repos, Cloud storage,
    and RFP SME answer harvesting with delta hashing and atomic pruning across
    PostgreSQL, Algolia, and Pinecone.
    """

    def __init__(self):
        # In-memory storage fallback for offline/test environments
        self._in_memory_sources: Dict[str, Dict[str, Any]] = {}
        self._in_memory_logs: Dict[str, List[Dict[str, Any]]] = {}

    # --------------------------------------------------------------------------
    # Source Management (CRUD)
    # --------------------------------------------------------------------------

    async def list_sources(self, tenant_id: str, db: Optional[AsyncSession] = None) -> List[KBSourceResponse]:
        sources: List[KBSourceResponse] = []

        if db:
            try:
                result = await db.execute(
                    select(KBSource).where(KBSource.tenant_id == tenant_id).order_by(KBSource.created_at.desc())
                )
                db_sources = result.scalars().all()
                for s in db_sources:
                    sources.append(
                        KBSourceResponse(
                            id=s.id,
                            tenant_id=s.tenant_id,
                            name=s.name,
                            source_type=s.source_type,
                            config=s.config_json or {},
                            schedule_frequency=s.schedule_frequency,
                            status=s.status,
                            last_synced_at=s.last_synced_at,
                            last_error=s.last_error,
                            metrics=s.metrics_json or {},
                            created_at=s.created_at,
                            updated_at=s.updated_at,
                        )
                    )
                if sources:
                    return sources
            except Exception as exc:
                logger.warning("PostgreSQL list_sources error, falling back to memory: %s", exc)

        # In-memory fallback
        mem_list = self._in_memory_sources.get(tenant_id, {})
        return [KBSourceResponse(**src) for src in mem_list.values()]

    async def get_source(self, tenant_id: str, source_id: str, db: Optional[AsyncSession] = None) -> Optional[KBSourceResponse]:
        if db:
            try:
                result = await db.execute(
                    select(KBSource).where(KBSource.tenant_id == tenant_id, KBSource.id == source_id)
                )
                s = result.scalar_one_or_none()
                if s:
                    return KBSourceResponse(
                        id=s.id,
                        tenant_id=s.tenant_id,
                        name=s.name,
                        source_type=s.source_type,
                        config=s.config_json or {},
                        schedule_frequency=s.schedule_frequency,
                        status=s.status,
                        last_synced_at=s.last_synced_at,
                        last_error=s.last_error,
                        metrics=s.metrics_json or {},
                        created_at=s.created_at,
                        updated_at=s.updated_at,
                    )
            except Exception as exc:
                logger.warning("PostgreSQL get_source error: %s", exc)

        mem = self._in_memory_sources.get(tenant_id, {}).get(source_id)
        return KBSourceResponse(**mem) if mem else None

    async def create_source(
        self,
        tenant_id: str,
        payload: KBSourceCreate,
        db: Optional[AsyncSession] = None,
    ) -> KBSourceResponse:
        source_id = f"src-{uuid.uuid4().hex[:8]}"
        now = datetime.now(timezone.utc)
        record_data = {
            "id": source_id,
            "tenant_id": tenant_id,
            "name": payload.name,
            "source_type": payload.source_type,
            "config": payload.config,
            "schedule_frequency": payload.schedule_frequency,
            "status": "idle",
            "last_synced_at": None,
            "last_error": None,
            "metrics": {"documents_count": 0, "chunks_count": 0, "last_duration_sec": 0.0},
            "created_at": now,
            "updated_at": now,
        }

        if db:
            try:
                db_model = KBSource(
                    id=source_id,
                    tenant_id=tenant_id,
                    name=payload.name,
                    source_type=payload.source_type,
                    config_json=payload.config,
                    schedule_frequency=payload.schedule_frequency,
                    status="idle",
                    created_at=now,
                    updated_at=now,
                )
                db.add(db_model)
                await db.commit()
            except Exception as exc:
                logger.warning("PostgreSQL create_source failed, storing in memory: %s", exc)

        if tenant_id not in self._in_memory_sources:
            self._in_memory_sources[tenant_id] = {}
        self._in_memory_sources[tenant_id][source_id] = record_data

        return KBSourceResponse(**record_data)

    async def update_source(
        self,
        tenant_id: str,
        source_id: str,
        payload: KBSourceUpdate,
        db: Optional[AsyncSession] = None,
    ) -> Optional[KBSourceResponse]:
        now = datetime.now(timezone.utc)
        if db:
            try:
                result = await db.execute(
                    select(KBSource).where(KBSource.tenant_id == tenant_id, KBSource.id == source_id)
                )
                s = result.scalar_one_or_none()
                if s:
                    if payload.name is not None:
                        s.name = payload.name
                    if payload.config is not None:
                        s.config_json = payload.config
                    if payload.schedule_frequency is not None:
                        s.schedule_frequency = payload.schedule_frequency
                    if payload.status is not None:
                        s.status = payload.status
                    s.updated_at = now
                    await db.commit()
                    return KBSourceResponse(
                        id=s.id,
                        tenant_id=s.tenant_id,
                        name=s.name,
                        source_type=s.source_type,
                        config=s.config_json or {},
                        schedule_frequency=s.schedule_frequency,
                        status=s.status,
                        last_synced_at=s.last_synced_at,
                        last_error=s.last_error,
                        metrics=s.metrics_json or {},
                        created_at=s.created_at,
                        updated_at=s.updated_at,
                    )
            except Exception as exc:
                logger.warning("PostgreSQL update_source failed: %s", exc)

        mem = self._in_memory_sources.get(tenant_id, {}).get(source_id)
        if mem:
            if payload.name is not None:
                mem["name"] = payload.name
            if payload.config is not None:
                mem["config"] = payload.config
            if payload.schedule_frequency is not None:
                mem["schedule_frequency"] = payload.schedule_frequency
            if payload.status is not None:
                mem["status"] = payload.status
            mem["updated_at"] = now
            return KBSourceResponse(**mem)
        return None

    async def delete_source(
        self,
        tenant_id: str,
        source_id: str,
        prune_chunks: bool = True,
        db: Optional[AsyncSession] = None,
        algolia_service: Any = None,
        pinecone_service: Any = None,
    ) -> bool:
        if prune_chunks:
            await self._prune_all_source_chunks(tenant_id, source_id, db, algolia_service, pinecone_service)

        deleted = False
        if db:
            try:
                await db.execute(
                    delete(KBSource).where(KBSource.tenant_id == tenant_id, KBSource.id == source_id)
                )
                await db.commit()
                deleted = True
            except Exception as exc:
                logger.warning("PostgreSQL delete_source failed: %s", exc)

        if tenant_id in self._in_memory_sources and source_id in self._in_memory_sources[tenant_id]:
            del self._in_memory_sources[tenant_id][source_id]
            deleted = True

        return deleted

    async def get_source_logs(
        self,
        tenant_id: str,
        source_id: str,
        limit: int = 20,
        db: Optional[AsyncSession] = None,
    ) -> List[KBSyncLogResponse]:
        logs: List[KBSyncLogResponse] = []
        if db:
            try:
                result = await db.execute(
                    select(KBSyncLog)
                    .where(KBSyncLog.tenant_id == tenant_id, KBSyncLog.source_id == source_id)
                    .order_by(KBSyncLog.started_at.desc())
                    .limit(limit)
                )
                db_logs = result.scalars().all()
                for l in db_logs:
                    logs.append(
                        KBSyncLogResponse(
                            id=l.id,
                            source_id=l.source_id,
                            tenant_id=l.tenant_id,
                            status=l.status,
                            started_at=l.started_at,
                            completed_at=l.completed_at,
                            duration_seconds=l.duration_seconds,
                            documents_scanned=l.documents_scanned,
                            chunks_created=l.chunks_created,
                            chunks_updated=l.chunks_updated,
                            chunks_pruned=l.chunks_pruned,
                            error_details=l.error_details,
                        )
                    )
                if logs:
                    return logs
            except Exception as exc:
                logger.warning("PostgreSQL get_source_logs error: %s", exc)

        mem_logs = self._in_memory_logs.get(source_id, [])
        return [KBSyncLogResponse(**l) for l in sorted(mem_logs, key=lambda x: x["started_at"], reverse=True)[:limit]]

    # --------------------------------------------------------------------------
    # Sync Orchestration & Connector Execution
    # --------------------------------------------------------------------------

    async def execute_sync(
        self,
        tenant_id: str,
        source_id: str,
        db: Optional[AsyncSession] = None,
        algolia_service: Any = None,
        pinecone_service: Any = None,
        hybrid_search_service: Any = None,
    ) -> KBSyncLogResponse:
        """
        Executes end-to-end synchronization for a given source:
        1. Fetches and parses documents via specific source connector.
        2. Computes passage hashes for smart delta indexing.
        3. Indexes new/updated entries in PostgreSQL, Algolia, and Pinecone.
        4. Prunes stale chunks that no longer exist in the source document.
        5. Logs metrics and updates source health status.
        """
        source = await self.get_source(tenant_id, source_id, db)
        if not source:
            raise ValueError(f"Source '{source_id}' not found for tenant '{tenant_id}'.")

        start_time = time.time()
        now = datetime.now(timezone.utc)
        log_id = f"synclog-{uuid.uuid4().hex[:8]}"

        # Mark source as syncing
        await self._update_source_status(tenant_id, source_id, "syncing", db=db)

        log_data = {
            "id": log_id,
            "source_id": source_id,
            "tenant_id": tenant_id,
            "status": "running",
            "started_at": now,
            "completed_at": None,
            "duration_seconds": 0.0,
            "documents_scanned": 0,
            "chunks_created": 0,
            "chunks_updated": 0,
            "chunks_pruned": 0,
            "error_details": None,
        }

        try:
            # 1. Execute specific connector
            extracted_entries, docs_scanned = await self._run_connector(
                source_type=source.source_type,
                config=source.config,
                tenant_id=tenant_id,
                source_id=source_id,
                db=db,
            )
            log_data["documents_scanned"] = docs_scanned

            # 2. Smart delta indexing across stores
            created_count, updated_count, pruned_count = await self._apply_delta_sync(
                tenant_id=tenant_id,
                source_id=source_id,
                entries=extracted_entries,
                db=db,
                algolia_service=algolia_service,
                pinecone_service=pinecone_service,
                hybrid_search_service=hybrid_search_service,
            )

            duration = round(time.time() - start_time, 2)
            log_data["status"] = "completed"
            log_data["completed_at"] = datetime.now(timezone.utc)
            log_data["duration_seconds"] = duration
            log_data["chunks_created"] = created_count
            log_data["chunks_updated"] = updated_count
            log_data["chunks_pruned"] = pruned_count

            # Update source record
            await self._update_source_success(
                tenant_id=tenant_id,
                source_id=source_id,
                documents_count=docs_scanned,
                chunks_count=len(extracted_entries),
                duration_sec=duration,
                db=db,
            )

        except Exception as exc:
            duration = round(time.time() - start_time, 2)
            logger.error("Sync failed for source '%s': %s", source_id, exc, exc_info=True)
            log_data["status"] = "failed"
            log_data["completed_at"] = datetime.now(timezone.utc)
            log_data["duration_seconds"] = duration
            log_data["error_details"] = str(exc)

            await self._update_source_error(
                tenant_id=tenant_id,
                source_id=source_id,
                error_msg=str(exc),
                db=db,
            )

        # Persist log
        await self._persist_log(log_data, db=db)
        return KBSyncLogResponse(**log_data)

    # --------------------------------------------------------------------------
    # Source Connectors
    # --------------------------------------------------------------------------

    async def _run_connector(
        self,
        source_type: str,
        config: Dict[str, Any],
        tenant_id: str,
        source_id: str,
        db: Optional[AsyncSession] = None,
    ) -> Tuple[List[KBEntryCreate], int]:
        if source_type == "web_crawler":
            return await self._crawl_web_source(config, tenant_id, source_id)
        elif source_type == "github_docs":
            return await self._crawl_github_source(config, tenant_id, source_id)
        elif source_type == "rfp_harvest":
            return await self._harvest_rfp_answers(config, tenant_id, source_id, db=db)
        elif source_type == "cloud_storage":
            return await self._crawl_cloud_storage(config, tenant_id, source_id)
        else:
            raise ValueError(f"Unsupported source_type '{source_type}'.")

    async def _crawl_web_source(
        self, config: Dict[str, Any], tenant_id: str, source_id: str
    ) -> Tuple[List[KBEntryCreate], int]:
        """
        Crawls configured URLs or trust portal endpoints.
        Extracts clean text and breaks it into standard 300-500 token semantic passages.
        """
        urls = config.get("urls") or []
        if isinstance(urls, str):
            urls = [urls]
        if not urls and config.get("url"):
            urls = [config["url"]]

        if not urls:
            raise ValueError("Web crawler configuration must include at least one URL ('url' or 'urls').")

        category_override = config.get("category")
        headers = {"User-Agent": "RFPEngine-KnowledgeSync/1.0 (+https://rfpengine.aroadmap.dev)"}
        auth_token = config.get("auth_token")
        if auth_token:
            headers["Authorization"] = f"Bearer {auth_token}"

        all_entries: List[KBEntryCreate] = []
        docs_scanned = 0

        async with httpx.AsyncClient(timeout=15.0, headers=headers, follow_redirects=True) as client:
            for target_url in urls:
                docs_scanned += 1
                try:
                    resp = await client.get(target_url)
                    if resp.status_code != 200:
                        logger.warning("Web crawl returned status %d for %s", resp.status_code, target_url)
                        continue

                    parser = CleanHTMLToMarkdownParser()
                    parser.feed(resp.text)
                    page_title, clean_text = parser.get_clean_text()
                    title = page_title or urlparse(target_url).path.strip("/").replace("-", " ").title() or "Trust Portal Doc"

                    if not clean_text or len(clean_text) < 50:
                        continue

                    # Chunk into 300-500 token passages (~1600 characters with 200 char overlap)
                    chunks = self._chunk_text(clean_text, chunk_size=1600, overlap=200)
                    category = category_override or DocumentParserService.infer_category(target_url, clean_text[:1000])

                    for idx, chunk in enumerate(chunks, start=1):
                        passage_title = f"{title} (Part {idx})" if len(chunks) > 1 else title
                        content_hash = hashlib.sha256(f"{target_url}::{chunk}".encode("utf-8")).hexdigest()[:12]
                        entry_id = f"kb-web-{source_id[:6]}-{content_hash}"

                        all_entries.append(
                            KBEntryCreate(
                                id=entry_id,
                                tenant_id=tenant_id,
                                title=passage_title,
                                content=chunk,
                                category=category,
                                metadata={
                                    "source_id": source_id,
                                    "source_type": "web_crawler",
                                    "source_url": target_url,
                                    "chunk_index": idx,
                                    "total_chunks": len(chunks),
                                    "synced_at": datetime.now(timezone.utc).isoformat(),
                                },
                            )
                        )
                except Exception as exc:
                    logger.warning("Web crawl error for %s: %s", target_url, exc)

        return all_entries, docs_scanned

    async def _crawl_github_source(
        self, config: Dict[str, Any], tenant_id: str, source_id: str
    ) -> Tuple[List[KBEntryCreate], int]:
        """
        Pulls markdown specifications, security policies, and docs from a GitHub repository.
        """
        repo = config.get("repo")  # e.g. "acme/security-docs"
        branch = config.get("branch", "main")
        files = config.get("files") or ["README.md", "SECURITY.md", "docs/architecture.md"]
        category_override = config.get("category")

        if not repo:
            raise ValueError("GitHub Docs connector requires 'repo' (e.g. 'org/repo').")

        all_entries: List[KBEntryCreate] = []
        docs_scanned = 0
        headers = {"User-Agent": "RFPEngine-GitHubSync/1.0"}
        token = config.get("github_token")
        if token:
            headers["Authorization"] = f"token {token}"

        async with httpx.AsyncClient(timeout=15.0, headers=headers, follow_redirects=True) as client:
            for file_path in files:
                docs_scanned += 1
                raw_url = f"https://raw.githubusercontent.com/{repo}/{branch}/{file_path.lstrip('/')}"
                try:
                    resp = await client.get(raw_url)
                    if resp.status_code != 200:
                        logger.warning("GitHub raw fetch failed with status %d for %s", resp.status_code, raw_url)
                        continue

                    content_bytes = resp.content
                    filename = file_path.split("/")[-1]
                    parsed = DocumentParserService.parse_document(
                        content=content_bytes,
                        filename=filename,
                        tenant_id=tenant_id,
                        default_category=category_override,
                    )
                    for p in parsed:
                        content_hash = hashlib.sha256(f"{file_path}::{p.content}".encode("utf-8")).hexdigest()[:12]
                        entry_id = f"kb-git-{source_id[:6]}-{content_hash}"
                        p.id = entry_id
                        p.metadata = p.metadata or {}
                        p.metadata.update({
                            "source_id": source_id,
                            "source_type": "github_docs",
                            "repo": repo,
                            "branch": branch,
                            "file_path": file_path,
                            "synced_at": datetime.now(timezone.utc).isoformat(),
                        })
                        all_entries.append(p)
                except Exception as exc:
                    logger.warning("GitHub sync error for %s: %s", file_path, exc)

        return all_entries, docs_scanned

    async def _harvest_rfp_answers(
        self, config: Dict[str, Any], tenant_id: str, source_id: str, db: Optional[AsyncSession] = None
    ) -> Tuple[List[KBEntryCreate], int]:
        """
        Harvests SME-approved responses from completed proposal workspaces into canonical Golden Q&A.
        """
        all_entries: List[KBEntryCreate] = []
        workspaces_scanned = 0

        if db:
            try:
                # Find approved questions across workspaces for this tenant
                query = (
                    select(QuestionReview, ResponseWorkspace)
                    .join(ResponseWorkspace, QuestionReview.workspace_id == ResponseWorkspace.id)
                    .where(
                        ResponseWorkspace.tenant_id == tenant_id,
                        QuestionReview.review_status == "Approved",
                    )
                )
                result = await db.execute(query)
                rows = result.all()
                workspaces_seen = set()

                for rev, ws in rows:
                    workspaces_seen.add(ws.id)
                    question_text = rev.edited_question or rev.original_question
                    answer_text = rev.edited_answer or rev.original_answer or ""
                    if not question_text or not answer_text:
                        continue

                    content_hash = hashlib.sha256(f"{ws.id}::{question_text}::{answer_text}".encode("utf-8")).hexdigest()[:12]
                    entry_id = f"kb-gold-{source_id[:6]}-{content_hash}"

                    all_entries.append(
                        KBEntryCreate(
                            id=entry_id,
                            tenant_id=tenant_id,
                            title=question_text,
                            content=answer_text,
                            category="Golden Q&A",
                            metadata={
                                "source_id": source_id,
                                "source_type": "rfp_harvest",
                                "source_workspace_id": ws.id,
                                "workspace_title": ws.title,
                                "question_index": rev.question_index,
                                "is_golden_qa": True,
                                "approved_by": rev.reviewed_by or "Security SME",
                                "synced_at": datetime.now(timezone.utc).isoformat(),
                            },
                        )
                    )
                workspaces_scanned = len(workspaces_seen)
            except Exception as exc:
                logger.warning("RFP answer harvesting failed in DB: %s", exc)

        return all_entries, workspaces_scanned

    async def _crawl_cloud_storage(
        self, config: Dict[str, Any], tenant_id: str, source_id: str
    ) -> Tuple[List[KBEntryCreate], int]:
        """
        Scans simulated cloud storage directory / local sample files.
        """
        folder_path = config.get("folder_path") or config.get("bucket_prefix")
        category_override = config.get("category")
        all_entries: List[KBEntryCreate] = []
        docs_scanned = 0

        if folder_path:
            from pathlib import Path
            p = Path(folder_path)
            if p.exists() and p.is_dir():
                for f in p.glob("*.*"):
                    if f.suffix.lower() in DocumentParserService.ALLOWED_EXTENSIONS:
                        docs_scanned += 1
                        try:
                            content = f.read_bytes()
                            parsed = DocumentParserService.parse_document(
                                content=content,
                                filename=f.name,
                                tenant_id=tenant_id,
                                default_category=category_override,
                            )
                            for entry in parsed:
                                content_hash = hashlib.sha256(f"{f.name}::{entry.content}".encode("utf-8")).hexdigest()[:12]
                                entry.id = f"kb-cld-{source_id[:6]}-{content_hash}"
                                entry.metadata = entry.metadata or {}
                                entry.metadata.update({
                                    "source_id": source_id,
                                    "source_type": "cloud_storage",
                                    "file_name": f.name,
                                    "synced_at": datetime.now(timezone.utc).isoformat(),
                                })
                                all_entries.append(entry)
                        except Exception as exc:
                            logger.warning("Cloud storage sync failed for file %s: %s", f.name, exc)

        return all_entries, docs_scanned

    # --------------------------------------------------------------------------
    # Delta Synchronization & Storage Pruning
    # --------------------------------------------------------------------------

    async def _apply_delta_sync(
        self,
        tenant_id: str,
        source_id: str,
        entries: List[KBEntryCreate],
        db: Optional[AsyncSession] = None,
        algolia_service: Any = None,
        pinecone_service: Any = None,
        hybrid_search_service: Any = None,
    ) -> Tuple[int, int, int]:
        """
        Compares incoming entries with existing source entries.
        Indexes new/updated entries and prunes obsolete entries.
        Returns: (created_count, updated_count, pruned_count)
        """
        active_ids: Set[str] = {e.id for e in entries if e.id}
        existing_ids: Set[str] = set()

        # 1. Identify existing IDs for this source
        if db:
            try:
                query = select(KBEntry.id, KBEntry.metadata_json).where(KBEntry.tenant_id == tenant_id)
                res = await db.execute(query)
                for eid, meta in res.all():
                    if meta and meta.get("source_id") == source_id:
                        existing_ids.add(eid)
            except Exception as exc:
                logger.warning("Failed to query existing source entries: %s", exc)

        stale_ids = existing_ids - active_ids
        pruned_count = len(stale_ids)
        created_count = len(active_ids - existing_ids)
        updated_count = len(active_ids & existing_ids)

        # 2. Prune obsolete chunks
        if stale_ids:
            if db:
                try:
                    await db.execute(delete(KBEntry).where(KBEntry.id.in_(stale_ids)))
                    await db.commit()
                except Exception as exc:
                    logger.warning("PostgreSQL prune failed: %s", exc)

            if algolia_service and algolia_service.is_configured():
                for sid in stale_ids:
                    try:
                        await algolia_service.delete_document(sid)
                    except Exception:
                        pass

            if pinecone_service and pinecone_service.is_configured():
                for sid in stale_ids:
                    try:
                        await pinecone_service.delete_vector(sid)
                    except Exception:
                        pass

        # 3. Index incoming entries
        if entries:
            pg_entries: List[KBEntry] = []
            alg_docs: List[Dict[str, Any]] = []
            embed_texts: List[str] = []
            doc_ids: List[str] = []

            for e in entries:
                doc_id = e.id or f"kb-sync-{uuid.uuid4().hex[:8]}"
                doc_ids.append(doc_id)
                title = e.title or e.question or "Untitled"
                content = e.content or e.answer or ""

                pg_entries.append(
                    KBEntry(
                        id=doc_id,
                        tenant_id=tenant_id,
                        question=title,
                        answer=content,
                        category=e.category,
                        metadata_json=e.metadata or {},
                    )
                )

                alg_docs.append({
                    "id": doc_id,
                    "tenant_id": tenant_id,
                    "title": title,
                    "content": content,
                    "question": title,
                    "answer": content,
                    "category": e.category or "",
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "metadata": e.metadata or {},
                })

                embed_texts.append(f"Topic: {title}\n{content}")

            # PostgreSQL
            if db:
                try:
                    for entry_obj in pg_entries:
                        await db.merge(entry_obj)
                    await db.commit()
                except Exception as exc:
                    logger.error("PostgreSQL upsert error during sync: %s", exc)

            # Algolia
            if algolia_service and algolia_service.is_configured():
                try:
                    await algolia_service.bulk_index_documents(alg_docs)
                except Exception as exc:
                    logger.warning("Algolia bulk index failed during sync: %s", exc)

            # Pinecone
            if pinecone_service and pinecone_service.is_configured() and hybrid_search_service:
                try:
                    embeddings = await hybrid_search_service.generate_embeddings_batch(embed_texts)
                    vectors: List[Dict[str, Any]] = []
                    for i, emb in enumerate(embeddings):
                        if emb:
                            entry_meta = entries[i].metadata or {}
                            vectors.append({
                                "id": doc_ids[i],
                                "values": emb,
                                "metadata": {
                                    "tenant_id": tenant_id,
                                    "doc_id": doc_ids[i],
                                    "title": entries[i].title or "",
                                    "content": (entries[i].content or "")[:1000],
                                    "category": entries[i].category or "",
                                    "is_golden_qa": entry_meta.get("is_golden_qa", False),
                                },
                            })
                    if vectors:
                        await pinecone_service.bulk_upsert_vectors(vectors)
                except Exception as exc:
                    logger.warning("Pinecone bulk vector upsert failed during sync: %s", exc)

        return created_count, updated_count, pruned_count

    async def _prune_all_source_chunks(
        self,
        tenant_id: str,
        source_id: str,
        db: Optional[AsyncSession] = None,
        algolia_service: Any = None,
        pinecone_service: Any = None,
    ):
        stale_ids: Set[str] = set()
        if db:
            try:
                query = select(KBEntry.id, KBEntry.metadata_json).where(KBEntry.tenant_id == tenant_id)
                res = await db.execute(query)
                for eid, meta in res.all():
                    if meta and meta.get("source_id") == source_id:
                        stale_ids.add(eid)

                if stale_ids:
                    await db.execute(delete(KBEntry).where(KBEntry.id.in_(stale_ids)))
                    await db.commit()
            except Exception as exc:
                logger.warning("PostgreSQL prune all failed for source %s: %s", source_id, exc)

        if algolia_service and algolia_service.is_configured():
            for sid in stale_ids:
                try:
                    await algolia_service.delete_document(sid)
                except Exception:
                    pass

        if pinecone_service and pinecone_service.is_configured():
            for sid in stale_ids:
                try:
                    await pinecone_service.delete_vector(sid)
                except Exception:
                    pass

    # --------------------------------------------------------------------------
    # Helper Status & Persistence Methods
    # --------------------------------------------------------------------------

    def _chunk_text(self, text: str, chunk_size: int = 1600, overlap: int = 200) -> List[str]:
        if len(text) <= chunk_size:
            return [text]

        chunks: List[str] = []
        start = 0
        while start < len(text):
            end = start + chunk_size
            if end >= len(text):
                chunks.append(text[start:].strip())
                break

            # Find paragraph or sentence boundary
            boundary = text.rfind("\n\n", start + chunk_size // 2, end)
            if boundary == -1:
                boundary = text.rfind(". ", start + chunk_size // 2, end)
            if boundary == -1 or boundary <= start:
                boundary = end
            else:
                boundary += 1

            chunk_content = text[start:boundary].strip()
            if chunk_content:
                chunks.append(chunk_content)
            start = max(start + 1, boundary - overlap)

        return chunks

    async def _update_source_status(
        self, tenant_id: str, source_id: str, status: str, db: Optional[AsyncSession] = None
    ):
        now = datetime.now(timezone.utc)
        if db:
            try:
                res = await db.execute(
                    select(KBSource).where(KBSource.tenant_id == tenant_id, KBSource.id == source_id)
                )
                s = res.scalar_one_or_none()
                if s:
                    s.status = status
                    s.updated_at = now
                    await db.commit()
            except Exception:
                pass

        if tenant_id in self._in_memory_sources and source_id in self._in_memory_sources[tenant_id]:
            self._in_memory_sources[tenant_id][source_id]["status"] = status
            self._in_memory_sources[tenant_id][source_id]["updated_at"] = now

    async def _update_source_success(
        self,
        tenant_id: str,
        source_id: str,
        documents_count: int,
        chunks_count: int,
        duration_sec: float,
        db: Optional[AsyncSession] = None,
    ):
        now = datetime.now(timezone.utc)
        metrics = {
            "documents_count": documents_count,
            "chunks_count": chunks_count,
            "last_duration_sec": duration_sec,
        }
        if db:
            try:
                res = await db.execute(
                    select(KBSource).where(KBSource.tenant_id == tenant_id, KBSource.id == source_id)
                )
                s = res.scalar_one_or_none()
                if s:
                    s.status = "success"
                    s.last_synced_at = now
                    s.last_error = None
                    s.metrics_json = metrics
                    s.updated_at = now
                    await db.commit()
            except Exception:
                pass

        if tenant_id in self._in_memory_sources and source_id in self._in_memory_sources[tenant_id]:
            src = self._in_memory_sources[tenant_id][source_id]
            src["status"] = "success"
            src["last_synced_at"] = now
            src["last_error"] = None
            src["metrics"] = metrics
            src["updated_at"] = now

    async def _update_source_error(
        self, tenant_id: str, source_id: str, error_msg: str, db: Optional[AsyncSession] = None
    ):
        now = datetime.now(timezone.utc)
        if db:
            try:
                res = await db.execute(
                    select(KBSource).where(KBSource.tenant_id == tenant_id, KBSource.id == source_id)
                )
                s = res.scalar_one_or_none()
                if s:
                    s.status = "error"
                    s.last_error = error_msg
                    s.updated_at = now
                    await db.commit()
            except Exception:
                pass

        if tenant_id in self._in_memory_sources and source_id in self._in_memory_sources[tenant_id]:
            src = self._in_memory_sources[tenant_id][source_id]
            src["status"] = "error"
            src["last_error"] = error_msg
            src["updated_at"] = now

    async def _persist_log(self, log_dict: Dict[str, Any], db: Optional[AsyncSession] = None):
        source_id = log_dict["source_id"]
        if db:
            try:
                log_model = KBSyncLog(
                    id=log_dict["id"],
                    source_id=source_id,
                    tenant_id=log_dict["tenant_id"],
                    status=log_dict["status"],
                    started_at=log_dict["started_at"],
                    completed_at=log_dict.get("completed_at"),
                    duration_seconds=log_dict.get("duration_seconds", 0.0),
                    documents_scanned=log_dict.get("documents_scanned", 0),
                    chunks_created=log_dict.get("chunks_created", 0),
                    chunks_updated=log_dict.get("chunks_updated", 0),
                    chunks_pruned=log_dict.get("chunks_pruned", 0),
                    error_details=log_dict.get("error_details"),
                )
                db.add(log_model)
                await db.commit()
            except Exception as exc:
                logger.warning("Could not persist KBSyncLog to DB: %s", exc)

        if source_id not in self._in_memory_logs:
            self._in_memory_logs[source_id] = []
        self._in_memory_logs[source_id].append(log_dict)


# Global singleton
kb_sync_service = KBSyncService()

