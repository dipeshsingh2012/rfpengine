from __future__ import annotations

import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db_session
from app.models.schemas import (
    QuestionReviewItem,
    QuestionReviewUpdate,
    WorkspaceCreate,
    WorkspaceResponse,
)
from app.services.postgres_service import PostgresService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/workspaces", tags=["Workspaces & Reviews"])


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
        questions=[
            QuestionReviewItem(
                id=q.id,
                question_index=q.question_index,
                question_text=q.question_text,
                suggested_answer=q.suggested_answer,
                final_answer=q.final_answer,
                review_status=q.review_status,
                assigned_role=q.assigned_role,
                confidence_score=q.confidence_score,
                sources=q.sources_json,
            )
            for q in workspace.reviews
        ],
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
        questions=[
            QuestionReviewItem(
                id=q.id,
                question_index=q.question_index,
                question_text=q.question_text,
                suggested_answer=q.suggested_answer,
                final_answer=q.final_answer,
                review_status=q.review_status,
                assigned_role=q.assigned_role,
                confidence_score=q.confidence_score,
                sources=q.sources_json,
            )
            for q in workspace.reviews
        ],
    )


@router.patch("/{workspace_id}/questions/{question_index}", response_model=QuestionReviewItem)
async def update_question_review(
    workspace_id: str,
    question_index: int,
    payload: QuestionReviewUpdate,
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

    return QuestionReviewItem(
        id=review.id,
        question_index=review.question_index,
        question_text=review.question_text,
        suggested_answer=review.suggested_answer,
        final_answer=review.final_answer,
        review_status=review.review_status,
        assigned_role=review.assigned_role,
        confidence_score=review.confidence_score,
        sources=review.sources_json,
    )

