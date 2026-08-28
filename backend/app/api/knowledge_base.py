from __future__ import annotations

import logging
from typing import List, Optional
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
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db_session
from app.models.schemas import (
    KBEntryCreate,
    KBEntryResponse,
    KBEntryUpdate,
    KBBatchImportRequest,
    KBUploadResponse,
)
from app.services.document_parser_service import DocumentParserService
from app.services.postgres_service import PostgresService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/knowledge-base", tags=["Knowledge Base"])


@router.get("", response_model=List[KBEntryResponse])
async def list_knowledge_base_entries(
    tenant_id: str = Query(default="acme-corp", description="Tenant ID"),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db_session),
) -> List[KBEntryResponse]:
    entries = await PostgresService.list_kb_entries(db, tenant_id=tenant_id, limit=limit, offset=offset)
    return [
        KBEntryResponse(
            id=e.id,
            tenant_id=e.tenant_id,
            question=e.question,
            answer=e.answer,
            category=e.category,
            metadata=e.metadata_json,
            created_at=e.created_at,
            updated_at=e.updated_at,
        )
        for e in entries
    ]


@router.get("/{entry_id}", response_model=KBEntryResponse)
async def get_knowledge_base_entry(
    entry_id: str,
    db: AsyncSession = Depends(get_db_session),
) -> KBEntryResponse:
    entry = await PostgresService.get_kb_entry(db, entry_id)
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Knowledge entry not found")
    return KBEntryResponse(
        id=entry.id,
        tenant_id=entry.tenant_id,
        question=entry.question,
        answer=entry.answer,
        category=entry.category,
        metadata=entry.metadata_json,
        created_at=entry.created_at,
        updated_at=entry.updated_at,
    )


@router.post("", response_model=KBEntryResponse, status_code=status.HTTP_201_CREATED)
async def create_knowledge_base_entry(
    request: Request,
    payload: KBEntryCreate,
    db: AsyncSession = Depends(get_db_session),
) -> KBEntryResponse:
    # 1. Save to PostgreSQL
    db_entry = await PostgresService.create_kb_entry(db, payload)

    # 2. Index in Elasticsearch
    es_service = request.app.state.elasticsearch
    await es_service.index_document(
        doc_id=db_entry.id,
        tenant_id=db_entry.tenant_id,
        question=db_entry.question,
        answer=db_entry.answer,
        category=db_entry.category,
        metadata=db_entry.metadata_json,
    )

    # 3. Vectorize and index in Pinecone
    hybrid_search = request.app.state.hybrid_search
    pinecone_service = request.app.state.pinecone
    if pinecone_service.is_configured():
        embedding = await hybrid_search.generate_embedding(db_entry.question)
        if embedding:
            await pinecone_service.upsert_vector(
                doc_id=db_entry.id,
                vector=embedding,
                metadata={
                    "tenant_id": db_entry.tenant_id,
                    "doc_id": db_entry.id,
                    "question": db_entry.question,
                    "answer": db_entry.answer,
                    "category": db_entry.category or "",
                },
            )

    return KBEntryResponse(
        id=db_entry.id,
        tenant_id=db_entry.tenant_id,
        question=db_entry.question,
        answer=db_entry.answer,
        category=db_entry.category,
        metadata=db_entry.metadata_json,
        created_at=db_entry.created_at,
        updated_at=db_entry.updated_at,
    )


@router.post("/batch", response_model=List[KBEntryResponse], status_code=status.HTTP_201_CREATED)
async def batch_import_knowledge_base(
    request: Request,
    payload: KBBatchImportRequest,
    db: AsyncSession = Depends(get_db_session),
) -> List[KBEntryResponse]:
    created_entries = await PostgresService.create_batch_kb_entries(
        db, tenant_id=payload.tenant_id, entries=payload.entries
    )

    es_service = request.app.state.elasticsearch
    pinecone_service = request.app.state.pinecone
    hybrid_search = request.app.state.hybrid_search

    for db_entry in created_entries:
        # Index in Elasticsearch
        await es_service.index_document(
            doc_id=db_entry.id,
            tenant_id=db_entry.tenant_id,
            question=db_entry.question,
            answer=db_entry.answer,
            category=db_entry.category,
            metadata=db_entry.metadata_json,
        )

        # Index in Pinecone
        if pinecone_service.is_configured():
            embedding = await hybrid_search.generate_embedding(db_entry.question)
            if embedding:
                await pinecone_service.upsert_vector(
                    doc_id=db_entry.id,
                    vector=embedding,
                    metadata={
                        "tenant_id": db_entry.tenant_id,
                        "doc_id": db_entry.id,
                        "question": db_entry.question,
                        "answer": db_entry.answer,
                        "category": db_entry.category or "",
                    },
                )

    return [
        KBEntryResponse(
            id=e.id,
            tenant_id=e.tenant_id,
            question=e.question,
            answer=e.answer,
            category=e.category,
            metadata=e.metadata_json,
            created_at=e.created_at,
            updated_at=e.updated_at,
        )
        for e in created_entries
    ]


@router.post("/upload", response_model=KBUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_knowledge_base_file(
    request: Request,
    file: UploadFile = File(..., description="Document file (.csv, .tsv, .json, .jsonl, .pdf, .docx, .txt, .md)"),
    tenant_id: str = Form(default="acme-corp", description="Tenant ID"),
    category: Optional[str] = Form(default=None, description="Optional default category override"),
    db: AsyncSession = Depends(get_db_session),
) -> KBUploadResponse:
    """
    Parses an uploaded knowledge file, applies 300-500 token chunking, stores records in PostgreSQL,
    and synchronizes them into Elasticsearch (BM25) and Pinecone (Dense Vectors).
    """
    content = await file.read()
    if not content:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty.")

    # 1. Parse document into KBEntryCreate chunks
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

    # 2. Persist to PostgreSQL in batch
    created_entries = await PostgresService.create_batch_kb_entries(
        db, tenant_id=tenant_id, entries=parsed_entries
    )

    # 3. Synchronize to Elasticsearch & Pinecone
    es_service = getattr(request.app.state, "elasticsearch", None)
    pinecone_service = getattr(request.app.state, "pinecone", None)
    hybrid_search = getattr(request.app.state, "hybrid_search", None)

    for db_entry in created_entries:
        if es_service:
            try:
                await es_service.index_document(
                    doc_id=db_entry.id,
                    tenant_id=db_entry.tenant_id,
                    question=db_entry.question,
                    answer=db_entry.answer,
                    category=db_entry.category,
                    metadata=db_entry.metadata_json,
                )
            except Exception as es_err:
                logger.warning("ES indexing deferred for entry %s: %s", db_entry.id, es_err)

        if pinecone_service and pinecone_service.is_configured() and hybrid_search:
            try:
                # Embed question + answer context
                embed_text = f"Topic: {db_entry.question}\n{db_entry.answer}"
                embedding = await hybrid_search.generate_embedding(embed_text)
                if embedding:
                    await pinecone_service.upsert_vector(
                        doc_id=db_entry.id,
                        vector=embedding,
                        metadata={
                            "tenant_id": db_entry.tenant_id,
                            "doc_id": db_entry.id,
                            "question": db_entry.question,
                            "answer": db_entry.answer[:1000],  # truncated for Pinecone metadata
                            "category": db_entry.category or "",
                            "source_file": file.filename or "uploaded_file",
                        },
                    )
            except Exception as pc_err:
                logger.warning("Pinecone indexing deferred for entry %s: %s", db_entry.id, pc_err)

    categories_found = sorted({e.category for e in created_entries if e.category})
    preview_responses = [
        KBEntryResponse(
            id=e.id,
            tenant_id=e.tenant_id,
            question=e.question,
            answer=e.answer,
            category=e.category,
            metadata=e.metadata_json,
            created_at=e.created_at,
            updated_at=e.updated_at,
        )
        for e in created_entries[:10]
    ]

    return KBUploadResponse(
        filename=file.filename or "uploaded_file",
        records_created=len(created_entries),
        tenant_id=tenant_id,
        categories=categories_found,
        preview=preview_responses,
    )


@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_knowledge_base_entry(
    request: Request,
    entry_id: str,
    db: AsyncSession = Depends(get_db_session),
) -> None:
    deleted = await PostgresService.delete_kb_entry(db, entry_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Knowledge entry not found")

    es_service = request.app.state.elasticsearch
    await es_service.delete_document(entry_id)

    pinecone_service = request.app.state.pinecone
    if pinecone_service.is_configured():
        await pinecone_service.delete_vector(entry_id)
