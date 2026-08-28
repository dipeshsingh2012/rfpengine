from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import (
    APIRouter,
    File,
    Form,
    HTTPException,
    Query,
    Request,
    UploadFile,
    status,
)

from app.models.schemas import (
    KBEntryCreate,
    KBEntryResponse,
    KBEntryUpdate,
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
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> List[KBEntryResponse]:
    """
    Lists indexed knowledge entries directly from Elasticsearch.
    """
    es_service = getattr(request.app.state, "elasticsearch", None)
    if not es_service:
        return []

    docs = await es_service.list_documents(tenant_id=tenant_id, limit=limit, offset=offset)
    return [
        KBEntryResponse(
            id=d["id"],
            tenant_id=d["tenant_id"],
            question=d["question"],
            answer=d["answer"],
            category=d["category"],
            metadata=d["metadata"],
        )
        for d in docs
    ]


@router.get("/{entry_id}", response_model=KBEntryResponse)
async def get_knowledge_base_entry(
    request: Request,
    entry_id: str,
) -> KBEntryResponse:
    """
    Retrieves an indexed knowledge entry from Elasticsearch.
    """
    es_service = getattr(request.app.state, "elasticsearch", None)
    if not es_service:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Search index unavailable")

    doc = await es_service.get_document(entry_id)
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Knowledge entry not found")

    return KBEntryResponse(
        id=doc["id"],
        tenant_id=doc["tenant_id"],
        question=doc["question"],
        answer=doc["answer"],
        category=doc["category"],
        metadata=doc["metadata"],
    )


@router.post("", response_model=KBEntryResponse, status_code=status.HTTP_201_CREATED)
async def create_knowledge_base_entry(
    request: Request,
    payload: KBEntryCreate,
) -> KBEntryResponse:
    """
    Indexes a single knowledge entry directly into Elasticsearch and Pinecone.
    """
    doc_id = payload.id or f"kb-{uuid.uuid4().hex[:8]}"

    # 1. Index in Elasticsearch (BM25 + text storage)
    es_service = getattr(request.app.state, "elasticsearch", None)
    if es_service:
        await es_service.index_document(
            doc_id=doc_id,
            tenant_id=payload.tenant_id,
            question=payload.question,
            answer=payload.answer,
            category=payload.category,
            metadata=payload.metadata,
        )

    # 2. Vectorize and index in Pinecone (Semantic Vector Search)
    hybrid_search = getattr(request.app.state, "hybrid_search", None)
    pinecone_service = getattr(request.app.state, "pinecone", None)
    if pinecone_service and pinecone_service.is_configured() and hybrid_search:
        embed_text = f"Topic: {payload.question}\n{payload.answer}"
        embedding = await hybrid_search.generate_embedding(embed_text)
        if embedding:
            await pinecone_service.upsert_vector(
                doc_id=doc_id,
                vector=embedding,
                metadata={
                    "tenant_id": payload.tenant_id,
                    "doc_id": doc_id,
                    "question": payload.question,
                    "answer": payload.answer[:1000],
                    "category": payload.category or "",
                },
            )

    return KBEntryResponse(
        id=doc_id,
        tenant_id=payload.tenant_id,
        question=payload.question,
        answer=payload.answer,
        category=payload.category,
        metadata=payload.metadata,
    )


@router.post("/batch", response_model=List[KBEntryResponse], status_code=status.HTTP_201_CREATED)
async def batch_import_knowledge_base(
    request: Request,
    payload: KBBatchImportRequest,
) -> List[KBEntryResponse]:
    """
    Batch indexes knowledge entries into Elasticsearch and Pinecone.
    """
    es_service = getattr(request.app.state, "elasticsearch", None)
    pinecone_service = getattr(request.app.state, "pinecone", None)
    hybrid_search = getattr(request.app.state, "hybrid_search", None)

    created_responses: List[KBEntryResponse] = []

    for entry in payload.entries:
        doc_id = f"kb-{uuid.uuid4().hex[:8]}"

        if es_service:
            await es_service.index_document(
                doc_id=doc_id,
                tenant_id=payload.tenant_id,
                question=entry.question,
                answer=entry.answer,
                category=entry.category,
                metadata=entry.metadata,
            )

        if pinecone_service and pinecone_service.is_configured() and hybrid_search:
            embed_text = f"Topic: {entry.question}\n{entry.answer}"
            embedding = await hybrid_search.generate_embedding(embed_text)
            if embedding:
                await pinecone_service.upsert_vector(
                    doc_id=doc_id,
                    vector=embedding,
                    metadata={
                        "tenant_id": payload.tenant_id,
                        "doc_id": doc_id,
                        "question": entry.question,
                        "answer": entry.answer[:1000],
                        "category": entry.category or "",
                    },
                )

        created_responses.append(
            KBEntryResponse(
                id=doc_id,
                tenant_id=payload.tenant_id,
                question=entry.question,
                answer=entry.answer,
                category=entry.category,
                metadata=entry.metadata,
            )
        )

    return created_responses


@router.post("/upload", response_model=KBUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_knowledge_base_file(
    request: Request,
    file: UploadFile = File(..., description="Document file (.csv, .tsv, .json, .jsonl, .pdf, .docx, .txt, .md)"),
    tenant_id: str = Form(default="acme-corp", description="Tenant ID"),
    category: Optional[str] = Form(default=None, description="Optional default category override"),
) -> KBUploadResponse:
    """
    Parses an uploaded knowledge file, applies 300-500 token chunking, and indexes chunks
    directly into Elasticsearch (BM25) and Pinecone (Dense Vectors) without storing chunks in PostgreSQL.
    """
    content = await file.read()
    if not content:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty.")

    # 1. Parse document into KBEntryCreate chunks (300-500 tokens)
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

    # 2. Index into Elasticsearch & Pinecone using batched operations
    es_service = getattr(request.app.state, "elasticsearch", None)
    pinecone_service = getattr(request.app.state, "pinecone", None)
    hybrid_search = getattr(request.app.state, "hybrid_search", None)

    created_responses: List[KBEntryResponse] = []
    es_docs: List[Dict[str, Any]] = []
    embed_prompts: List[str] = []
    doc_ids: List[str] = []

    for i, entry in enumerate(parsed_entries):
        doc_id = f"kb-{uuid.uuid4().hex[:8]}"
        doc_ids.append(doc_id)
        embed_prompts.append(f"Topic: {entry.question}\n{entry.answer}")

        es_docs.append({
            "id": doc_id,
            "tenant_id": entry.tenant_id,
            "question": entry.question,
            "answer": entry.answer,
            "category": entry.category or "",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "metadata": entry.metadata or {},
        })

        created_responses.append(
            KBEntryResponse(
                id=doc_id,
                tenant_id=entry.tenant_id,
                question=entry.question,
                answer=entry.answer,
                category=entry.category,
                metadata=entry.metadata,
            )
        )

    # 2a. Bulk Index into Elastic Cloud / Elasticsearch
    if es_service:
        try:
            await es_service.bulk_index_documents(es_docs)
        except Exception as es_err:
            logger.warning("Elasticsearch bulk indexing error: %s", es_err)

    # 2b. Batch Embed & Bulk Upsert into Pinecone Serverless
    if pinecone_service and pinecone_service.is_configured() and hybrid_search:
        try:
            embeddings = await hybrid_search.generate_embeddings_batch(embed_prompts)
            pc_vectors: List[Dict[str, Any]] = []
            for i, entry in enumerate(parsed_entries):
                emb = embeddings[i] if i < len(embeddings) else None
                if emb:
                    pc_vectors.append({
                        "id": doc_ids[i],
                        "values": emb,
                        "metadata": {
                            "tenant_id": entry.tenant_id,
                            "doc_id": doc_ids[i],
                            "question": entry.question,
                            "answer": entry.answer[:1000],
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
) -> None:
    """
    Deletes an entry from Elasticsearch and Pinecone.
    """
    es_service = getattr(request.app.state, "elasticsearch", None)
    if es_service:
        await es_service.delete_document(entry_id)

    pinecone_service = getattr(request.app.state, "pinecone", None)
    if pinecone_service and pinecone_service.is_configured():
        await pinecone_service.delete_vector(entry_id)
