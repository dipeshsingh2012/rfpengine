from __future__ import annotations

import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db_session
from app.models.schemas import (
    KBEntryCreate,
    KBEntryResponse,
    KBEntryUpdate,
    KBBatchImportRequest,
)
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

