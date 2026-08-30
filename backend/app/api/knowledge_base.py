from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    Request,
    UploadFile,
    status,
)
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db_session, get_session_factory
from app.models.db_models import KBEntry
from app.models.schemas import (
    KBEntryCreate,
    KBEntryResponse,
    KBBatchImportRequest,
    KBUploadResponse,
)
from app.services.document_parser_service import DocumentParserService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/knowledge-base", tags=["Knowledge Base"])


@router.get("", response_model=List[KBEntryResponse])
async def list_knowledge_base_entries(
    request: Request,
    tenant_id: str = Query(default="acme-corp", description="Tenant ID"),
    limit: int = Query(default=100, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db_session),
) -> List[KBEntryResponse]:
    """
    Lists indexed knowledge entries from PostgreSQL (primary System of Record),
    falling back to Elastic Cloud if the database is unavailable.
    """
    docs: List[Dict[str, Any]] = []

    # 1. Primary: PostgreSQL
    try:
        query = (
            select(KBEntry)
            .where(KBEntry.tenant_id == tenant_id)
            .order_by(KBEntry.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
        result = await db.execute(query)
        pg_entries = result.scalars().all()
        if pg_entries:
            docs = [
                {
                    "id": e.id,
                    "tenant_id": e.tenant_id,
                    "title": e.title or e.question,
                    "content": e.content or e.answer,
                    "question": e.title or e.question,
                    "answer": e.content or e.answer,
                    "category": e.category or "",
                    "metadata": e.metadata_json or {},
                    "created_at": e.created_at.isoformat() if e.created_at else None,
                    "updated_at": e.updated_at.isoformat() if e.updated_at else None,
                }
                for e in pg_entries
            ]
    except Exception as pg_err:
        logger.warning("PostgreSQL list query failed, attempting Elasticsearch fallback: %s", pg_err)

    # 2. Fallback: Elasticsearch
    if not docs:
        es_service = getattr(request.app.state, "elasticsearch", None)
        if es_service:
            try:
                docs = await es_service.list_documents(tenant_id=tenant_id, limit=limit, offset=offset)
            except Exception as es_err:
                logger.warning("Elasticsearch list fallback failed: %s", es_err)

    return [
        KBEntryResponse(
            id=d["id"],
            tenant_id=d["tenant_id"],
            title=d.get("title") or d.get("question", ""),
            content=d.get("content") or d.get("answer", ""),
            question=d.get("title") or d.get("question", ""),
            answer=d.get("content") or d.get("answer", ""),
            category=d.get("category", ""),
            metadata=d.get("metadata", {}),
            created_at=d.get("created_at"),
            updated_at=d.get("updated_at"),
        )
        for d in docs
    ]


@router.get("/{entry_id}", response_model=KBEntryResponse)
async def get_knowledge_base_entry(
    request: Request,
    entry_id: str,
    db: AsyncSession = Depends(get_db_session),
) -> KBEntryResponse:
    """
    Retrieves a knowledge entry from PostgreSQL (primary), falling back to Elasticsearch.
    """
    # 1. Primary: PostgreSQL
    try:
        result = await db.execute(select(KBEntry).where(KBEntry.id == entry_id))
        entry = result.scalar_one_or_none()
        if entry:
            return KBEntryResponse(
                id=entry.id,
                tenant_id=entry.tenant_id,
                title=entry.title or entry.question,
                content=entry.content or entry.answer,
                question=entry.title or entry.question,
                answer=entry.content or entry.answer,
                category=entry.category or "",
                metadata=entry.metadata_json or {},
                created_at=entry.created_at.isoformat() if entry.created_at else None,
                updated_at=entry.updated_at.isoformat() if entry.updated_at else None,
            )
    except Exception as pg_err:
        logger.warning("PostgreSQL get failed for %s: %s", entry_id, pg_err)

    # 2. Fallback: Elasticsearch
    es_service = getattr(request.app.state, "elasticsearch", None)
    if es_service:
        doc = await es_service.get_document(entry_id)
        if doc:
            return KBEntryResponse(
                id=doc["id"],
                tenant_id=doc["tenant_id"],
                title=doc.get("title") or doc.get("question", ""),
                content=doc.get("content") or doc.get("answer", ""),
                question=doc.get("title") or doc.get("question", ""),
                answer=doc.get("content") or doc.get("answer", ""),
                category=doc.get("category", ""),
                metadata=doc.get("metadata", {}),
            )

    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Knowledge entry not found")


@router.post("", response_model=KBEntryResponse, status_code=status.HTTP_201_CREATED)
async def create_knowledge_base_entry(
    request: Request,
    payload: KBEntryCreate,
    db: AsyncSession = Depends(get_db_session),
) -> KBEntryResponse:
    """
    Indexes a single knowledge entry across PostgreSQL, Elastic Cloud, and Pinecone.
    """
    doc_id = payload.id or f"kb-{uuid.uuid4().hex[:8]}"
    title = payload.title or payload.question or "Untitled Passage"
    content = payload.content or payload.answer or ""

    # 1. Persist to PostgreSQL (System of Record)
    try:
        entry = KBEntry(
            id=doc_id,
            tenant_id=payload.tenant_id,
            question=title,
            answer=content,
            category=payload.category,
            metadata_json=payload.metadata or {},
        )
        db.add(entry)
        await db.commit()
    except Exception as pg_err:
        logger.error("Failed to insert KBEntry in PostgreSQL: %s", pg_err)

    # 2. Index in Elasticsearch (BM25 Lexical Search)
    es_service = getattr(request.app.state, "elasticsearch", None)
    if es_service:
        try:
            await es_service.index_document(
                doc_id=doc_id,
                tenant_id=payload.tenant_id,
                question=title,
                answer=content,
                category=payload.category,
                metadata=payload.metadata or {},
            )
        except Exception as es_err:
            logger.warning("Elasticsearch index_document failed for %s: %s", doc_id, es_err)

    # 3. Vectorize and index in Pinecone (Dense Vector Search)
    hybrid_search = getattr(request.app.state, "hybrid_search", None)
    pinecone_service = getattr(request.app.state, "pinecone", None)
    if pinecone_service and pinecone_service.is_configured() and hybrid_search:
        try:
            embed_text = f"Topic: {title}\n{content}"
            embedding = await hybrid_search.generate_embedding(embed_text)
            if embedding:
                await pinecone_service.upsert_vector(
                    doc_id=doc_id,
                    vector=embedding,
                    metadata={
                        "tenant_id": payload.tenant_id,
                        "doc_id": doc_id,
                        "title": title,
                        "content": content[:1000],
                        "question": title,
                        "answer": content[:1000],
                        "category": payload.category or "",
                    },
                )
        except Exception as pc_err:
            logger.warning("Pinecone upsert_vector failed for %s: %s", doc_id, pc_err)

    return KBEntryResponse(
        id=doc_id,
        tenant_id=payload.tenant_id,
        title=title,
        content=content,
        question=title,
        answer=content,
        category=payload.category,
        metadata=payload.metadata,
    )


@router.post("/batch", response_model=List[KBEntryResponse], status_code=status.HTTP_201_CREATED)
@router.post("/bulk", response_model=List[KBEntryResponse], status_code=status.HTTP_201_CREATED)
async def batch_import_knowledge_base(
    request: Request,
    payload: KBBatchImportRequest,
    db: AsyncSession = Depends(get_db_session),
) -> List[KBEntryResponse]:
    """
    Batch indexes knowledge entries across PostgreSQL, Elastic Cloud, and Pinecone.
    """
    es_service = getattr(request.app.state, "elasticsearch", None)
    pinecone_service = getattr(request.app.state, "pinecone", None)
    hybrid_search = getattr(request.app.state, "hybrid_search", None)

    created_responses: List[KBEntryResponse] = []
    pg_models: List[KBEntry] = []
    es_docs: List[Dict[str, Any]] = []
    embed_prompts: List[str] = []
    doc_ids: List[str] = []

    for entry in payload.entries:
        doc_id = getattr(entry, "id", None) or f"kb-{uuid.uuid4().hex[:8]}"
        doc_ids.append(doc_id)
        title = entry.title or entry.question or "Untitled Passage"
        content = entry.content or entry.answer or ""

        pg_models.append(
            KBEntry(
                id=doc_id,
                tenant_id=payload.tenant_id,
                question=title,
                answer=content,
                category=entry.category,
                metadata_json=entry.metadata or {},
            )
        )

        es_docs.append({
            "id": doc_id,
            "tenant_id": payload.tenant_id,
            "title": title,
            "content": content,
            "question": title,
            "answer": content,
            "category": entry.category or "",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "metadata": entry.metadata or {},
        })

        embed_prompts.append(f"Topic: {title}\n{content}")

        created_responses.append(
            KBEntryResponse(
                id=doc_id,
                tenant_id=payload.tenant_id,
                title=title,
                content=content,
                question=title,
                answer=content,
                category=entry.category,
                metadata=entry.metadata,
            )
        )

    # 1. Bulk Insert into PostgreSQL
    try:
        db.add_all(pg_models)
        await db.commit()
    except Exception as pg_err:
        logger.error("PostgreSQL batch insert failed: %s", pg_err)

    # 2. Bulk Index into Elasticsearch
    if es_service:
        try:
            await es_service.bulk_index_documents(es_docs)
        except Exception as es_err:
            logger.warning("Elasticsearch bulk index failed: %s", es_err)

    # 3. Bulk Vector Upsert into Pinecone
    if pinecone_service and pinecone_service.is_configured() and hybrid_search:
        try:
            embeddings = await hybrid_search.generate_embeddings_batch(embed_prompts)
            pc_vectors: List[Dict[str, Any]] = []
            for i, p in enumerate(payload.entries):
                emb = embeddings[i] if i < len(embeddings) else None
                if emb:
                    p_title = p.title or p.question or ""
                    p_content = p.content or p.answer or ""
                    pc_vectors.append({
                        "id": doc_ids[i],
                        "values": emb,
                        "metadata": {
                            "tenant_id": payload.tenant_id,
                            "doc_id": doc_ids[i],
                            "title": p_title,
                            "content": p_content[:1000],
                            "question": p_title,
                            "answer": p_content[:1000],
                            "category": p.category or "",
                        },
                    })
            if pc_vectors:
                await pinecone_service.bulk_upsert_vectors(pc_vectors)
        except Exception as pc_err:
            logger.warning("Pinecone bulk vector upsert failed: %s", pc_err)

    return created_responses


@router.post("/upload", response_model=KBUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_knowledge_base_file(
    request: Request,
    file: UploadFile = File(..., description="Document file (.csv, .tsv, .json, .jsonl, .pdf, .docx, .txt, .md)"),
    tenant_id: str = Form(default="acme-corp", description="Tenant ID"),
    category: Optional[str] = Form(default=None, description="Optional default category override"),
) -> KBUploadResponse:
    """
    Parses an uploaded document, chunks it into 300-500 token passages, and synchronizes
    all chunks across PostgreSQL (System of Record), Elastic Cloud (BM25), and Pinecone (Dense Vectors).
    """
    content = await file.read()
    if not content:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty.")

    # 1. Parse document into structured passages
    try:
        parsed_entries = DocumentParserService.parse_document(
            content=content,
            filename=file.filename or "uploaded_document",
            tenant_id=tenant_id,
            default_category=category,
        )
    except Exception as exc:
        logger.error("Document parsing failed for '%s': %s", file.filename, exc)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Failed to parse document: {exc}",
        )

    if not parsed_entries:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not extract any valid knowledge records or chunks from the uploaded file.",
        )

    es_service = getattr(request.app.state, "elasticsearch", None)
    pinecone_service = getattr(request.app.state, "pinecone", None)
    hybrid_search = getattr(request.app.state, "hybrid_search", None)

    created_responses: List[KBEntryResponse] = []
    pg_models: List[KBEntry] = []
    es_docs: List[Dict[str, Any]] = []
    embed_prompts: List[str] = []
    doc_ids: List[str] = []

    for entry in parsed_entries:
        doc_id = entry.id or f"kb-{uuid.uuid4().hex[:8]}"
        doc_ids.append(doc_id)
        title = entry.title or entry.question or "Untitled Passage"
        passage_content = entry.content or entry.answer or ""

        pg_models.append(
            KBEntry(
                id=doc_id,
                tenant_id=entry.tenant_id,
                question=title,
                answer=passage_content,
                category=entry.category,
                metadata_json=entry.metadata or {},
            )
        )

        es_docs.append({
            "id": doc_id,
            "tenant_id": entry.tenant_id,
            "title": title,
            "content": passage_content,
            "question": title,
            "answer": passage_content,
            "category": entry.category or "",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "metadata": entry.metadata or {},
        })

        embed_prompts.append(f"Topic: {title}\n{passage_content}")

        created_responses.append(
            KBEntryResponse(
                id=doc_id,
                tenant_id=entry.tenant_id,
                title=title,
                content=passage_content,
                question=title,
                answer=passage_content,
                category=entry.category,
                metadata=entry.metadata,
            )
        )

    # 2a. Bulk Persist to PostgreSQL (System of Record)
    try:
        session_factory = get_session_factory()
        async with session_factory() as session:
            async with session.begin():
                session.add_all(pg_models)
    except Exception as pg_err:
        logger.warning("PostgreSQL bulk insert failed for uploaded file '%s': %s", file.filename, pg_err)

    # 2b. Bulk Index into Elastic Cloud
    if es_service:
        try:
            await es_service.bulk_index_documents(es_docs)
        except Exception as es_err:
            logger.warning("Elasticsearch bulk indexing error: %s", es_err)

    # 2c. Batch Embed & Bulk Upsert into Pinecone Serverless
    if pinecone_service and pinecone_service.is_configured() and hybrid_search:
        try:
            embeddings = await hybrid_search.generate_embeddings_batch(embed_prompts)
            pc_vectors: List[Dict[str, Any]] = []
            for i, entry in enumerate(parsed_entries):
                emb = embeddings[i] if i < len(embeddings) else None
                if emb:
                    p_title = entry.title or entry.question or ""
                    p_content = entry.content or entry.answer or ""
                    pc_vectors.append({
                        "id": doc_ids[i],
                        "values": emb,
                        "metadata": {
                            "tenant_id": entry.tenant_id,
                            "doc_id": doc_ids[i],
                            "title": p_title,
                            "content": p_content[:1000],
                            "question": p_title,
                            "answer": p_content[:1000],
                            "category": entry.category or "",
                            "source_file": file.filename or "uploaded_file",
                            "page_number": entry.metadata.get("page_number", 1) if entry.metadata else 1,
                        },
                    })
            if pc_vectors:
                await pinecone_service.bulk_upsert_vectors(pc_vectors)
        except Exception as pc_err:
            logger.warning("Pinecone bulk vector upsert error: %s", pc_err)

    categories_found = sorted({e.category for e in created_responses if e.category})

    return KBUploadResponse(
        filename=file.filename or "uploaded_file",
        records_created=len(created_responses),
        tenant_id=tenant_id,
        categories=categories_found,
        preview=created_responses[:10],
    )


@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_knowledge_base_entry(
    request: Request,
    entry_id: str,
    db: AsyncSession = Depends(get_db_session),
) -> None:
    """
    Deletes an entry across PostgreSQL, Elastic Cloud, and Pinecone.
    """
    # 1. Delete from PostgreSQL
    try:
        await db.execute(delete(KBEntry).where(KBEntry.id == entry_id))
        await db.commit()
    except Exception as pg_err:
        logger.warning("PostgreSQL delete failed for %s: %s", entry_id, pg_err)

    # 2. Delete from Elasticsearch
    es_service = getattr(request.app.state, "elasticsearch", None)
    if es_service:
        try:
            await es_service.delete_document(entry_id)
        except Exception as es_err:
            logger.warning("Elasticsearch delete failed for %s: %s", entry_id, es_err)

    # 3. Delete from Pinecone
    pinecone_service = getattr(request.app.state, "pinecone", None)
    if pinecone_service and pinecone_service.is_configured():
        try:
            await pinecone_service.delete_vector(entry_id)
        except Exception as pc_err:
            logger.warning("Pinecone delete failed for %s: %s", entry_id, pc_err)
