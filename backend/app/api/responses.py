from __future__ import annotations

import logging
from typing import Optional
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db_session
from app.models.schemas import (
    KBPromoteResponse,
    QuestionReviewItem,
    QuestionReviewUpdate,
    WorkspaceCreate,
    WorkspaceResponse,
)
from app.services.postgres_service import PostgresService
from app.services.email_service import EmailService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/workspaces", tags=["Workspaces & Reviews"])
email_service = EmailService()


def _map_review_item(q) -> QuestionReviewItem:
    return QuestionReviewItem(
        id=q.id,
        question_index=q.question_index,
        question_text=q.question_text,
        suggested_answer=q.suggested_answer,
        final_answer=q.final_answer,
        review_status=q.review_status,
        assigned_role=q.assigned_role,
        confidence_score=q.confidence_score,
        sources=q.sources_json,
        is_promoted_to_kb=bool(getattr(q, "is_promoted_to_kb", False)),
        promoted_kb_id=getattr(q, "promoted_kb_id", None),
    )


@router.post("", response_model=WorkspaceResponse, status_code=status.HTTP_201_CREATED)
async def save_workspace(
    payload: WorkspaceCreate,
    db: AsyncSession = Depends(get_db_session),
) -> WorkspaceResponse:
    workspace = await PostgresService.save_workspace(db, payload)
    return WorkspaceResponse(
        id=workspace.id,
        tenant_id=workspace.tenant_id,
        title=workspace.title,
        source_mode=workspace.source_mode,
        source_url=workspace.source_url,
        created_at=workspace.created_at,
        updated_at=workspace.updated_at,
        questions=[_map_review_item(q) for q in workspace.reviews],
    )


@router.get("/{workspace_id}", response_model=WorkspaceResponse)
async def get_workspace(
    workspace_id: str,
    db: AsyncSession = Depends(get_db_session),
) -> WorkspaceResponse:
    workspace = await PostgresService.get_workspace(db, workspace_id)
    if not workspace:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found")

    return WorkspaceResponse(
        id=workspace.id,
        tenant_id=workspace.tenant_id,
        title=workspace.title,
        source_mode=workspace.source_mode,
        source_url=workspace.source_url,
        created_at=workspace.created_at,
        updated_at=workspace.updated_at,
        questions=[_map_review_item(q) for q in workspace.reviews],
    )


@router.patch("/{workspace_id}/questions/{question_index}", response_model=QuestionReviewItem)
async def update_question_review(
    workspace_id: str,
    question_index: int,
    payload: QuestionReviewUpdate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db_session),
) -> QuestionReviewItem:
    review = await PostgresService.update_question_review(
        session=db,
        workspace_id=workspace_id,
        question_index=question_index,
        final_answer=payload.final_answer,
        review_status=payload.review_status,
        assigned_role=payload.assigned_role,
    )
    if not review:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question review not found")

    # 1. Trigger SME Review Request if assigned
    if payload.notify_sme and payload.assigned_email:
        background_tasks.add_task(
            email_service.send_sme_review_request,
            recipient_email=payload.assigned_email,
            workspace_title=getattr(review.workspace, "title", "RFP Questionnaire") if getattr(review, "workspace", None) else "RFP Questionnaire",
            question_text=review.question_text,
            draft_preview=review.final_answer or review.suggested_answer or "",
            category=review.assigned_role or "Compliance",
            workspace_id=workspace_id,
            question_index=question_index,
        )

    # 2. Check if all questions are approved -> Trigger completion digest
    if payload.review_status == "approved":
        workspace = await PostgresService.get_workspace(db, workspace_id)
        if workspace and workspace.reviews:
            all_approved = all(r.review_status == "approved" for r in workspace.reviews)
            if all_approved:
                owner_email = "lead@rfpengine.net"
                background_tasks.add_task(
                    email_service.send_proposal_completion_digest,
                    recipient_email=owner_email,
                    workspace_title=workspace.title,
                    total_questions=len(workspace.reviews),
                    workspace_id=workspace_id,
                )

    return _map_review_item(review)


@router.post("/{workspace_id}/questions/{question_index}/promote", response_model=KBPromoteResponse, status_code=status.HTTP_200_OK)
async def promote_question_to_knowledge_base(
    workspace_id: str,
    question_index: int,
    request: Request,
    db: AsyncSession = Depends(get_db_session),
) -> KBPromoteResponse:
    """
    Level 1 Closed-Loop AI Feedback (ADR 0019):
    Promotes an SME-approved question answer directly into the canonical Knowledge Base,
    updating PostgreSQL, Pinecone dense vectors, and Elasticsearch BM25 indexes.
    """
    try:
        kb_entry, review = await PostgresService.promote_question_to_kb(
            session=db,
            workspace_id=workspace_id,
            question_index=question_index,
            category="Golden Q&A",
        )
    except ValueError as val_err:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(val_err))

    # Async dual-index vector synchronization (Pinecone / ES)
    hybrid_search = getattr(request.app.state, "hybrid_search", None)
    pinecone_service = getattr(request.app.state, "pinecone", None)
    if hybrid_search and pinecone_service:
        try:
            embed_text = f"Question: {kb_entry.question}\nAnswer: {kb_entry.answer}"
            vec = await hybrid_search.generate_embedding(embed_text)
            await pinecone_service.upsert_vector(
                vector_id=kb_entry.id,
                values=vec,
                metadata={
                    "tenant_id": kb_entry.tenant_id,
                    "title": kb_entry.question,
                    "content": kb_entry.answer,
                    "category": kb_entry.category or "Golden Q&A",
                    "is_golden_qa": True,
                    "origin_workspace_id": workspace_id,
                },
            )
        except Exception as sync_err:
            logger.warning("Pinecone vector sync on Golden Q&A promotion failed: %s", sync_err)

    return KBPromoteResponse(
        success=True,
        message=f"Successfully promoted Q{question_index + 1} to canonical Knowledge Base as Golden Q&A.",
        kb_entry_id=kb_entry.id,
        workspace_id=workspace_id,
        question_index=question_index,
        category=kb_entry.category or "Golden Q&A",
        review=_map_review_item(review),
    )


