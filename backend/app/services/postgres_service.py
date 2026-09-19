from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy import delete, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

logger = logging.getLogger(__name__)

from app.models.db_models import AuditLogModel, KBEntry, QuestionReview, ResponseWorkspace, RoadmapInitiativeModel, WorkspaceSettingsModel
from app.models.schemas import (
    KBEntryBase,
    KBEntryCreate,
    KBEntryUpdate,
    QuestionReviewItem,
    WorkspaceCreate,
    WorkspaceSummaryResponse,
    WorkspaceUpdatePayload,
    RoadmapInitiativeCreate,
    RoadmapInitiativeUpdate,
    WorkspaceSettingsUpdate,
)

import json
from pathlib import Path

SEEDS_DIR = Path(__file__).resolve().parent.parent / "data" / "seeds"


def _load_json_seed(filename: str) -> list:
    filepath = SEEDS_DIR / filename
    if not filepath.exists():
        logger.warning("Seed file not found: %s", filepath)
        return []
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as exc:
        logger.warning("Failed to load seed file %s: %s", filepath, exc)
        return []


class PostgresService:
    @staticmethod
    def load_roadmap_seeds() -> List[Dict[str, Any]]:
        return _load_json_seed("roadmap_initiatives.json")

    @staticmethod
    def load_kb_seeds() -> List[Dict[str, Any]]:
        return _load_json_seed("kb_seeds.json")

    @staticmethod
    def load_workspace_seeds() -> List[Dict[str, Any]]:
        return _load_json_seed("workspaces.json")

    @staticmethod
    def load_audit_log_seeds() -> List[Dict[str, Any]]:
        return _load_json_seed("audit_logs.json")

    @staticmethod
    async def sync_roadmap_seeds(session: AsyncSession, tenant_id: str = "default") -> int:
        """
        Synchronizes all canonical initiatives from seed files into PostgreSQL.
        Inserts new seeds if missing, or updates baseline fields if existing, ensuring
        PostgreSQL is always the authoritative source of truth.
        """
        synced_count = 0
        for s in PostgresService.load_roadmap_seeds():
            existing = await PostgresService.get_roadmap_initiative(session, s["id"])
            if existing is None:
                init_obj = RoadmapInitiativeModel(
                    id=s["id"],
                    tenant_id=tenant_id,
                    title=s["title"],
                    stage=s["stage"],
                    theme=s["theme"],
                    priority=s["priority"],
                    target_persona=s["target_persona"],
                    quarter=s["quarter"],
                    summary=s["summary"],
                    problem_statement=s["problem_statement"],
                    user_story=s["user_story"],
                    success_metrics=s["success_metrics"],
                    acceptance_criteria=s["acceptance_criteria"],
                    technical_architecture=s["technical_architecture"],
                    rice_reach=s["rice_reach"],
                    rice_impact=s["rice_impact"],
                    rice_confidence=s["rice_confidence"],
                    rice_effort=s["rice_effort"],
                    rice_score=s["rice_score"],
                    upvotes=s["upvotes"],
                    tags=s["tags"],
                )
                session.add(init_obj)
                synced_count += 1
            else:
                existing.tenant_id = tenant_id
                existing.title = s["title"]
                existing.stage = s["stage"]
                existing.theme = s["theme"]
                existing.priority = s["priority"]
                existing.target_persona = s["target_persona"]
                existing.quarter = s["quarter"]
                existing.summary = s["summary"]
                existing.problem_statement = s["problem_statement"]
                existing.user_story = s["user_story"]
                existing.success_metrics = s["success_metrics"]
                existing.acceptance_criteria = s["acceptance_criteria"]
                existing.technical_architecture = s["technical_architecture"]
                existing.rice_reach = s["rice_reach"]
                existing.rice_impact = s["rice_impact"]
                existing.rice_confidence = s["rice_confidence"]
                existing.rice_effort = s["rice_effort"]
                existing.rice_score = s["rice_score"]
                existing.tags = s["tags"]
                synced_count += 1
        await session.commit()
        return synced_count

    @staticmethod
    async def seed_roadmap_if_empty(session: AsyncSession, tenant_id: str = "default") -> None:
        await PostgresService.sync_roadmap_seeds(session, tenant_id)

    @staticmethod
    async def list_roadmap_initiatives(
        session: AsyncSession,
        tenant_id: str = "default",
        stage: Optional[str] = None,
        theme: Optional[str] = None,
    ) -> List[RoadmapInitiativeModel]:
        await PostgresService.sync_roadmap_seeds(session, tenant_id)
        stmt = select(RoadmapInitiativeModel).where(RoadmapInitiativeModel.tenant_id == tenant_id)
        if stage:
            stmt = stmt.where(RoadmapInitiativeModel.stage == stage)
        if theme:
            stmt = stmt.where(RoadmapInitiativeModel.theme == theme)
        stmt = stmt.order_by(RoadmapInitiativeModel.created_at.desc())
        res = await session.execute(stmt)
        return list(res.scalars().all())
        stmt = stmt.order_by(RoadmapInitiativeModel.created_at.desc())
        res = await session.execute(stmt)
        return list(res.scalars().all())

    @staticmethod
    async def get_roadmap_initiative(session: AsyncSession, initiative_id: str) -> Optional[RoadmapInitiativeModel]:
        res = await session.execute(
            select(RoadmapInitiativeModel).where(RoadmapInitiativeModel.id == initiative_id)
        )
        return res.scalars().first()

    @staticmethod
    async def create_roadmap_initiative(
        session: AsyncSession,
        item: RoadmapInitiativeCreate,
    ) -> RoadmapInitiativeModel:
        item_id = item.id or f"custom-{uuid.uuid4().hex[:8]}"
        init_obj = RoadmapInitiativeModel(
            id=item_id,
            tenant_id=item.tenant_id,
            title=item.title,
            stage=item.stage,
            theme=item.theme,
            priority=item.priority,
            target_persona=item.target_persona,
            quarter=item.quarter,
            summary=item.summary,
            problem_statement=item.problem_statement,
            user_story=item.user_story,
            success_metrics=item.success_metrics,
            acceptance_criteria=item.acceptance_criteria,
            technical_architecture=item.technical_architecture or "To be determined during technical refinement spike with engineering leads.",
            rice_reach=item.rice.reach,
            rice_impact=item.rice.impact,
            rice_confidence=item.rice.confidence,
            rice_effort=item.rice.effort,
            rice_score=item.rice.score,
            upvotes=item.upvotes,
            tags=item.tags,
        )
        session.add(init_obj)
        await session.commit()
        await session.refresh(init_obj)
        return init_obj

    @staticmethod
    async def update_roadmap_initiative(
        session: AsyncSession,
        initiative_id: str,
        updates: RoadmapInitiativeUpdate,
    ) -> Optional[RoadmapInitiativeModel]:
        init_obj = await PostgresService.get_roadmap_initiative(session, initiative_id)
        if not init_obj:
            return None

        data = updates.model_dump(exclude_unset=True)
        if "rice" in data and data["rice"]:
            rice_data = data.pop("rice")
            init_obj.rice_reach = rice_data.get("reach", init_obj.rice_reach)
            init_obj.rice_impact = rice_data.get("impact", init_obj.rice_impact)
            init_obj.rice_confidence = rice_data.get("confidence", init_obj.rice_confidence)
            init_obj.rice_effort = rice_data.get("effort", init_obj.rice_effort)
            init_obj.rice_score = rice_data.get("score", init_obj.rice_score)

        for field, val in data.items():
            if hasattr(init_obj, field) and val is not None:
                setattr(init_obj, field, val)

        await session.commit()
        await session.refresh(init_obj)
        return init_obj

    @staticmethod
    async def upvote_roadmap_initiative(
        session: AsyncSession,
        initiative_id: str,
        delta: int = 1,
    ) -> Optional[RoadmapInitiativeModel]:
        init_obj = await PostgresService.get_roadmap_initiative(session, initiative_id)
        if not init_obj:
            return None
        init_obj.upvotes = max(0, init_obj.upvotes + delta)
        await session.commit()
        await session.refresh(init_obj)
        return init_obj

    @staticmethod
    async def reset_roadmap_initiatives(session: AsyncSession, tenant_id: str = "default") -> None:
        await session.execute(
            delete(RoadmapInitiativeModel).where(RoadmapInitiativeModel.tenant_id == tenant_id)
        )
        await session.commit()
        await PostgresService.seed_roadmap_if_empty(session, tenant_id)

    @staticmethod
    async def create_kb_entry(session: AsyncSession, entry: KBEntryCreate) -> KBEntry:
        doc_id = entry.id or f"kb-{uuid.uuid4().hex[:8]}"
        db_entry = KBEntry(
            id=doc_id,
            tenant_id=entry.tenant_id,
            question=entry.question,
            answer=entry.answer,
            category=entry.category,
            metadata_json=entry.metadata,
        )
        session.add(db_entry)
        await session.commit()
        await session.refresh(db_entry)
        return db_entry

    @staticmethod
    async def get_kb_entry(session: AsyncSession, entry_id: str) -> Optional[KBEntry]:
        result = await session.execute(select(KBEntry).where(KBEntry.id == entry_id))
        return result.scalars().first()

    @staticmethod
    async def get_kb_entries_by_ids(session: AsyncSession, entry_ids: List[str]) -> List[KBEntry]:
        if not entry_ids:
            return []
        result = await session.execute(select(KBEntry).where(KBEntry.id.in_(entry_ids)))
        return list(result.scalars().all())

    @staticmethod
    async def seed_kb_if_empty(session: AsyncSession, tenant_id: str = "acme-corp") -> int:
        """
        Auto-seeds canonical compliance and architecture Q&A pairs for default tenants
        if no entries exist in PostgreSQL.
        """
        if tenant_id not in ("acme-corp", "enterprise-corp"):
            return 0
        try:
            count_stmt = select(func.count(KBEntry.id)).where(KBEntry.tenant_id == tenant_id)
            count_res = await session.execute(count_stmt)
            count = count_res.scalar() or 0
            if count > 0:
                return 0

            synced = 0
            for item in PostgresService.load_kb_seeds():
                entry = KBEntry(
                    id=f"seed-{tenant_id}-{synced + 1}",
                    tenant_id=tenant_id,
                    question=item["question"],
                    answer=item["answer"],
                    category=item.get("category", "General"),
                    metadata_json={
                        "source_file": item.get("source_file"),
                        "format": item.get("format", "TXT"),
                        "category": item.get("category", "General"),
                        "is_golden_qa": True,
                    },
                )
                session.add(entry)
                synced += 1
            await session.commit()
            logger.info("Auto-seeded %d canonical knowledge base entries for tenant '%s'", synced, tenant_id)
            return synced
        except Exception as exc:
            logger.warning("Auto-seed KB failed for tenant '%s': %s", tenant_id, exc)
            return 0

    @staticmethod
    async def list_kb_entries(
        session: AsyncSession,
        tenant_id: str,
        limit: int = 100,
        offset: int = 0,
    ) -> List[KBEntry]:
        try:
            await PostgresService.seed_kb_if_empty(session, tenant_id)
        except Exception:
            pass

        stmt = (
            select(KBEntry)
            .where(KBEntry.tenant_id == tenant_id)
            .order_by(KBEntry.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        result = await session.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def get_kb_stats(
        session: AsyncSession,
        tenant_id: str,
    ) -> Dict[str, Any]:
        """
        Aggregates live Knowledge Base statistics for a tenant:
        - total_records: count of indexed entries
        - total_sources: number of unique source files/documents
        - categories_count: count of distinct categories
        """
        try:
            await PostgresService.seed_kb_if_empty(session, tenant_id)
        except Exception as seed_err:
            logger.warning("Could not auto-seed KB in get_kb_stats: %s", seed_err)

        try:
            count_stmt = select(func.count(KBEntry.id)).where(KBEntry.tenant_id == tenant_id)
            count_res = await session.execute(count_stmt)
            total_records = count_res.scalar() or 0

            source_stmt = select(KBEntry.metadata_json).where(KBEntry.tenant_id == tenant_id)
            source_res = await session.execute(source_stmt)
            sources = set()
            for meta in source_res.scalars():
                if isinstance(meta, dict):
                    src = meta.get("source_file") or meta.get("filename") or meta.get("source") or meta.get("source_url")
                    if src:
                        sources.add(src)

            # Also check KBSource table if configured
            try:
                from app.models.db_models import KBSource
                src_tbl_stmt = select(KBSource.name).where(KBSource.tenant_id == tenant_id)
                src_tbl_res = await session.execute(src_tbl_stmt)
                for s_name in src_tbl_res.scalars():
                    if s_name:
                        sources.add(s_name)
            except Exception:
                pass

            cat_stmt = select(func.count(func.distinct(KBEntry.category))).where(KBEntry.tenant_id == tenant_id)
            cat_res = await session.execute(cat_stmt)
            cat_count = cat_res.scalar() or 0

            return {
                "tenant_id": tenant_id,
                "total_records": total_records,
                "total_sources": len(sources),
                "categories_count": cat_count,
                "sync_status": "synced" if total_records > 0 else "ready",
            }
        except Exception as exc:
            logger.warning("Error fetching KB stats: %s", exc)
            return {
                "tenant_id": tenant_id,
                "total_records": 0,
                "total_sources": 0,
                "categories_count": 0,
                "sync_status": "ready",
            }

    @staticmethod
    async def update_kb_entry(
        session: AsyncSession,
        entry_id: str,
        update_data: KBEntryUpdate,
    ) -> Optional[KBEntry]:
        entry = await PostgresService.get_kb_entry(session, entry_id)
        if not entry:
            return None
        if update_data.question is not None:
            entry.question = update_data.question
        if update_data.answer is not None:
            entry.answer = update_data.answer
        if update_data.category is not None:
            entry.category = update_data.category
        if update_data.metadata is not None:
            entry.metadata_json = update_data.metadata
        await session.commit()
        await session.refresh(entry)
        return entry

    @staticmethod
    async def delete_kb_entry(session: AsyncSession, entry_id: str) -> bool:
        entry = await PostgresService.get_kb_entry(session, entry_id)
        if not entry:
            return False
        await session.delete(entry)
        await session.commit()
        return True

    @staticmethod
    async def create_batch_kb_entries(
        session: AsyncSession,
        tenant_id: str,
        entries: List[KBEntryBase],
    ) -> List[KBEntry]:
        created: List[KBEntry] = []
        for item in entries:
            doc_id = f"kb-{uuid.uuid4().hex[:8]}"
            db_entry = KBEntry(
                id=doc_id,
                tenant_id=tenant_id,
                question=item.question,
                answer=item.answer,
                category=item.category,
                metadata_json=item.metadata,
            )
            session.add(db_entry)
            created.append(db_entry)
        await session.commit()
        for e in created:
            await session.refresh(e)
        return created

    # --- Workspaces and Reviews ---

    @staticmethod
    async def save_workspace(
        session: AsyncSession,
        workspace_data: WorkspaceCreate,
    ) -> ResponseWorkspace:
        result = await session.execute(
            select(ResponseWorkspace)
            .where(ResponseWorkspace.id == workspace_data.id)
            .options(selectinload(ResponseWorkspace.reviews))
        )
        workspace = result.scalars().first()

        if not workspace:
            workspace = ResponseWorkspace(
                id=workspace_data.id,
                tenant_id=workspace_data.tenant_id,
                title=workspace_data.title,
                source_mode=workspace_data.source_mode,
                source_url=workspace_data.source_url,
            )
            session.add(workspace)
            await session.flush()
        else:
            workspace.title = workspace_data.title
            workspace.source_mode = workspace_data.source_mode
            workspace.source_url = workspace_data.source_url
            # Remove previous reviews if replacing
            await session.execute(
                delete(QuestionReview).where(QuestionReview.workspace_id == workspace.id)
            )

        for q in workspace_data.questions:
            review = QuestionReview(
                workspace_id=workspace.id,
                question_index=q.question_index,
                question_text=q.question_text,
                suggested_answer=q.suggested_answer,
                final_answer=q.final_answer,
                review_status=q.review_status,
                assigned_role=q.assigned_role,
                confidence_score=q.confidence_score,
                sources_json=q.sources,
            )
            session.add(review)

        await session.commit()
        refreshed = await PostgresService.get_workspace(session, workspace.id)
        return refreshed or workspace

    @staticmethod
    async def get_workspace(
        session: AsyncSession,
        workspace_id: str,
    ) -> Optional[ResponseWorkspace]:
        result = await session.execute(
            select(ResponseWorkspace)
            .where(ResponseWorkspace.id == workspace_id)
            .options(selectinload(ResponseWorkspace.reviews))
        )
        return result.scalars().first()

    @staticmethod
    async def seed_workspaces_if_empty(session: AsyncSession, tenant_id: str = "acme-corp") -> int:
        """
        Auto-seeds default workspaces for tenant if no workspaces exist in PostgreSQL.
        """
        try:
            count_stmt = select(func.count(ResponseWorkspace.id)).where(ResponseWorkspace.tenant_id == tenant_id)
            count_res = await session.execute(count_stmt)
            count = count_res.scalar() or 0
            if count > 0:
                return 0

            seeds = PostgresService.load_workspace_seeds()
            synced = 0
            for item in seeds:
                ws = ResponseWorkspace(
                    id=item["id"],
                    tenant_id=tenant_id,
                    title=item["title"],
                    source_mode="url" if item.get("color") == "blue" else "upload",
                    source_url="",
                )
                session.add(ws)
                synced += 1
            await session.commit()
            logger.info("Auto-seeded %d workspaces for tenant '%s'", synced, tenant_id)
            return synced
        except Exception as exc:
            logger.warning("Auto-seed workspaces failed for tenant '%s': %s", tenant_id, exc)
            return 0

    @staticmethod
    async def list_workspaces(
        session: AsyncSession,
        tenant_id: str,
        limit: int = 10,
    ) -> List[ResponseWorkspace]:
        try:
            await PostgresService.seed_workspaces_if_empty(session, tenant_id)
        except Exception:
            pass

        result = await session.execute(
            select(ResponseWorkspace)
            .where(ResponseWorkspace.tenant_id == tenant_id)
            .options(selectinload(ResponseWorkspace.reviews))
            .order_by(ResponseWorkspace.updated_at.desc())
            .limit(limit)
        )
        return list(result.scalars().all())

    @staticmethod
    def calculate_workspace_summary(w: ResponseWorkspace) -> WorkspaceSummaryResponse:
        total = len(w.reviews) if w.reviews else 0
        approved = sum(1 for r in (w.reviews or []) if r.review_status == "Approved")
        in_review = sum(1 for r in (w.reviews or []) if r.review_status == "In Review")
        changes_req = sum(1 for r in (w.reviews or []) if r.review_status == "Changes Requested")
        drafts = sum(1 for r in (w.reviews or []) if r.review_status in ("Draft", None, ""))
        pct = round((approved / total) * 100, 1) if total > 0 else 0.0

        if total > 0 and approved == total:
            status = "Approved"
        elif changes_req > 0:
            status = "Changes Requested"
        elif in_review > 0:
            status = "In Review"
        else:
            status = "Draft"

        roles = sorted(list({r.assigned_role for r in (w.reviews or []) if r.assigned_role}))
        color = "blue" if w.source_mode == "url" else ("green" if w.title.lower().endswith(".csv") else "orange")

        return WorkspaceSummaryResponse(
            id=w.id,
            tenant_id=w.tenant_id,
            title=w.title,
            source_mode=w.source_mode,
            source_url=w.source_url,
            total_questions=total,
            approved_count=approved,
            in_review_count=in_review,
            changes_requested_count=changes_req,
            draft_count=drafts,
            completion_percentage=pct,
            status=status,
            assigned_roles=roles,
            created_at=w.created_at,
            updated_at=w.updated_at,
            color=color,
        )

    @staticmethod
    async def list_workspace_summaries(
        session: AsyncSession,
        tenant_id: str,
        limit: int = 50,
        search: Optional[str] = None,
        status_filter: Optional[str] = None,
    ) -> List[WorkspaceSummaryResponse]:
        query = (
            select(ResponseWorkspace)
            .where(ResponseWorkspace.tenant_id == tenant_id)
            .options(selectinload(ResponseWorkspace.reviews))
            .order_by(ResponseWorkspace.updated_at.desc())
        )
        if search and search.strip():
            term = f"%{search.strip()}%"
            query = query.where(
                or_(
                    ResponseWorkspace.title.ilike(term),
                    ResponseWorkspace.source_url.ilike(term),
                )
            )
        if limit:
            query = query.limit(limit)

        result = await session.execute(query)
        workspaces = list(result.scalars().all())

        summaries = [PostgresService.calculate_workspace_summary(w) for w in workspaces]
        if status_filter and status_filter.lower() != "all":
            summaries = [s for s in summaries if s.status.lower() == status_filter.lower()]

        return summaries

    @staticmethod
    async def delete_workspace(
        session: AsyncSession,
        workspace_id: str,
        tenant_id: Optional[str] = None,
    ) -> bool:
        stmt = select(ResponseWorkspace).where(ResponseWorkspace.id == workspace_id)
        if tenant_id:
            stmt = stmt.where(ResponseWorkspace.tenant_id == tenant_id)
        result = await session.execute(stmt)
        workspace = result.scalars().first()
        if not workspace:
            return False
        await session.delete(workspace)
        await session.commit()
        return True

    @staticmethod
    async def duplicate_workspace(
        session: AsyncSession,
        workspace_id: str,
        tenant_id: Optional[str] = None,
    ) -> Optional[ResponseWorkspace]:
        orig = await PostgresService.get_workspace(session, workspace_id)
        if not orig:
            return None
        if tenant_id and orig.tenant_id != tenant_id:
            return None

        new_id = f"rfp-{int(datetime.now(timezone.utc).timestamp())}-{uuid.uuid4().hex[:4]}"
        new_title = f"{orig.title} (Copy)"
        new_workspace = ResponseWorkspace(
            id=new_id,
            tenant_id=orig.tenant_id,
            title=new_title,
            source_mode=orig.source_mode,
            source_url=orig.source_url,
        )
        session.add(new_workspace)
        await session.flush()

        for q in orig.reviews:
            new_review = QuestionReview(
                id=str(uuid.uuid4()),
                workspace_id=new_id,
                question_index=q.question_index,
                question_text=q.question_text,
                suggested_answer=q.suggested_answer,
                final_answer=q.final_answer,
                review_status="Draft",
                assigned_role=q.assigned_role,
                confidence_score=q.confidence_score,
                sources_json=q.sources_json,
                is_promoted_to_kb=False,
            )
            session.add(new_review)

        await session.commit()
        return await PostgresService.get_workspace(session, new_id)

    @staticmethod
    async def update_workspace_details(
        session: AsyncSession,
        workspace_id: str,
        payload: WorkspaceUpdatePayload,
        tenant_id: Optional[str] = None,
    ) -> Optional[ResponseWorkspace]:
        workspace = await PostgresService.get_workspace(session, workspace_id)
        if not workspace:
            return None
        if tenant_id and workspace.tenant_id != tenant_id:
            return None

        if payload.title is not None:
            workspace.title = payload.title
        if payload.source_mode is not None:
            workspace.source_mode = payload.source_mode
        if payload.source_url is not None:
            workspace.source_url = payload.source_url

        if payload.questions is not None:
            await session.execute(
                delete(QuestionReview).where(QuestionReview.workspace_id == workspace.id)
            )
            for q in payload.questions:
                review = QuestionReview(
                    workspace_id=workspace.id,
                    question_index=q.question_index,
                    question_text=q.question_text,
                    suggested_answer=q.suggested_answer,
                    final_answer=q.final_answer,
                    review_status=q.review_status,
                    assigned_role=q.assigned_role,
                    confidence_score=q.confidence_score,
                    sources_json=q.sources,
                )
                session.add(review)
        else:
            if payload.answers or payload.review_statuses:
                for rev in workspace.reviews:
                    q_text = rev.question_text
                    if payload.answers and q_text in payload.answers:
                        rev.final_answer = payload.answers[q_text]
                    if payload.review_statuses and q_text in payload.review_statuses:
                        rev.review_status = payload.review_statuses[q_text]

        await session.commit()
        return await PostgresService.get_workspace(session, workspace.id)

    @staticmethod
    async def update_question_review(
        session: AsyncSession,
        workspace_id: str,
        question_index: int,
        final_answer: Optional[str] = None,
        review_status: Optional[str] = None,
        assigned_role: Optional[str] = None,
    ) -> Optional[QuestionReview]:
        result = await session.execute(
            select(QuestionReview).where(
                QuestionReview.workspace_id == workspace_id,
                QuestionReview.question_index == question_index,
            )
        )
        review = result.scalars().first()
        if not review:
            return None

        if final_answer is not None:
            review.final_answer = final_answer
        if review_status is not None:
            review.review_status = review_status
        if assigned_role is not None:
            review.assigned_role = assigned_role

        await session.commit()
        await session.refresh(review)
        return review

    @staticmethod
    async def promote_question_to_kb(
        session: AsyncSession,
        workspace_id: str,
        question_index: int,
        category: str = "Golden Q&A",
    ) -> Tuple[KBEntry, QuestionReview]:
        workspace_res = await session.execute(
            select(ResponseWorkspace).where(ResponseWorkspace.id == workspace_id)
        )
        workspace = workspace_res.scalars().first()
        if not workspace:
            raise ValueError(f"Workspace '{workspace_id}' not found.")

        review_res = await session.execute(
            select(QuestionReview).where(
                QuestionReview.workspace_id == workspace_id,
                QuestionReview.question_index == question_index,
            )
        )
        review = review_res.scalars().first()
        if not review:
            raise ValueError(f"Question index {question_index} not found in workspace '{workspace_id}'.")

        answer_text = review.final_answer or review.suggested_answer or ""
        if not answer_text.strip():
            raise ValueError("Cannot promote an empty answer to the Knowledge Base.")

        kb_id = review.promoted_kb_id or f"kb-gold-{uuid.uuid4().hex[:8]}"

        existing_kb = await session.execute(select(KBEntry).where(KBEntry.id == kb_id))
        kb_entry = existing_kb.scalars().first()

        metadata_dict = {
            "origin_workspace_id": workspace.id,
            "origin_question_index": question_index,
            "approved_by_role": review.assigned_role or "Proposal Drafter",
            "is_golden_qa": True,
            "promoted_at": datetime.now(timezone.utc).isoformat(),
        }

        if kb_entry:
            kb_entry.question = review.question_text
            kb_entry.answer = answer_text
            kb_entry.category = category
            kb_entry.metadata_json = metadata_dict
        else:
            kb_entry = KBEntry(
                id=kb_id,
                tenant_id=workspace.tenant_id,
                question=review.question_text,
                answer=answer_text,
                category=category,
                metadata_json=metadata_dict,
            )
            session.add(kb_entry)

        review.is_promoted_to_kb = True
        review.promoted_kb_id = kb_id
        if review.review_status != "Approved":
            review.review_status = "Approved"

        await session.commit()
        await session.refresh(kb_entry)
        await session.refresh(review)
        return kb_entry, review

    @staticmethod
    async def get_golden_qa_exemplars(
        session: AsyncSession,
        tenant_id: str = "acme-corp",
        limit: int = 3,
    ) -> List[KBEntry]:
        """
        Retrieves top SME-approved Golden Q&A entries for a tenant to be used as dynamic few-shot exemplars.
        """
        stmt = (
            select(KBEntry)
            .where(
                KBEntry.tenant_id == tenant_id,
                KBEntry.category == "Golden Q&A",
            )
            .order_by(KBEntry.updated_at.desc())
            .limit(limit)
        )
        res = await session.execute(stmt)
        entries = list(res.scalars().all())
        if not entries:
            q_stmt = (
                select(QuestionReview)
                .join(ResponseWorkspace, ResponseWorkspace.id == QuestionReview.workspace_id)
                .where(
                    ResponseWorkspace.tenant_id == tenant_id,
                    QuestionReview.is_promoted_to_kb == True,
                )
                .order_by(QuestionReview.updated_at.desc())
                .limit(limit)
            )
            q_res = await session.execute(q_stmt)
            promoted_reviews = list(q_res.scalars().all())
            entries = [
                KBEntry(
                    id=r.promoted_kb_id or f"kb-gold-{r.id}",
                    tenant_id=tenant_id,
                    question=r.question_text,
                    answer=r.final_answer or r.suggested_answer or "",
                    category="Golden Q&A",
                    metadata_json={"is_golden_qa": True, "approved_by_role": r.assigned_role},
                )
                for r in promoted_reviews
            ]
        return entries

    # --- Audit Logging (PostgreSQL) ---

    @staticmethod
    async def create_audit_log(
        session: AsyncSession,
        tenant_id: str,
        user_role: str,
        action: str,
        details: str,
        event_type: str = "import",
    ) -> AuditLogModel:
        log_entry = AuditLogModel(
            id=f"audit-{uuid.uuid4().hex[:10]}",
            tenant_id=tenant_id,
            user_role=user_role,
            action=action,
            details=details,
            event_type=event_type,
        )
        session.add(log_entry)
        await session.commit()
        await session.refresh(log_entry)
        return log_entry

    @staticmethod
    async def seed_audit_logs_if_empty(session: AsyncSession, tenant_id: str = "acme-corp") -> int:
        """
        Auto-seeds initial audit log records for tenant if table is empty.
        """
        try:
            count_stmt = select(func.count(AuditLogModel.id)).where(AuditLogModel.tenant_id == tenant_id)
            count_res = await session.execute(count_stmt)
            count = count_res.scalar() or 0
            if count > 0:
                return 0

            seeds = PostgresService.load_audit_log_seeds()
            synced = 0
            for item in seeds:
                log_obj = AuditLogModel(
                    tenant_id=tenant_id,
                    user_role=item.get("user_role", "Proposal Drafter"),
                    action=item["action"],
                    details=item["details"],
                    event_type=item.get("event_type", "import"),
                )
                session.add(log_obj)
                synced += 1
            await session.commit()
            logger.info("Auto-seeded %d audit logs for tenant '%s'", synced, tenant_id)
            return synced
        except Exception as exc:
            logger.warning("Auto-seed audit logs failed for tenant '%s': %s", tenant_id, exc)
            return 0

    @staticmethod
    async def list_audit_logs(
        session: AsyncSession,
        tenant_id: str,
        limit: int = 50,
    ) -> List[AuditLogModel]:
        try:
            await PostgresService.seed_audit_logs_if_empty(session, tenant_id)
        except Exception:
            pass

        result = await session.execute(
            select(AuditLogModel)
            .where(AuditLogModel.tenant_id == tenant_id)
            .order_by(AuditLogModel.created_at.desc())
            .limit(limit)
        )
        return list(result.scalars().all())

    @staticmethod
    async def get_workspace_settings(
        session: AsyncSession,
        tenant_id: str,
    ) -> WorkspaceSettingsModel:
        stmt = select(WorkspaceSettingsModel).where(WorkspaceSettingsModel.tenant_id == tenant_id)
        res = await session.execute(stmt)
        settings = res.scalar_one_or_none()
        if not settings:
            settings = WorkspaceSettingsModel(
                tenant_id=tenant_id,
                company_name="Acme Corporation" if tenant_id == "acme-corp" else tenant_id.replace("-", " ").title(),
            )
            session.add(settings)
            await session.commit()
            await session.refresh(settings)
        return settings

    @staticmethod
    async def update_workspace_settings(
        session: AsyncSession,
        tenant_id: str,
        update_data: WorkspaceSettingsUpdate,
    ) -> WorkspaceSettingsModel:
        settings = await PostgresService.get_workspace_settings(session, tenant_id)
        data = update_data.model_dump(exclude_unset=True)
        for key, value in data.items():
            if hasattr(settings, key) and value is not None:
                setattr(settings, key, value)
        await session.commit()
        await session.refresh(settings)
        return settings


