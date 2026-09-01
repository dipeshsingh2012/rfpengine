from __future__ import annotations

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db_session
from app.models.schemas import (
    RICEScoreSchema,
    RoadmapInitiativeCreate,
    RoadmapInitiativeResponse,
    RoadmapInitiativeUpdate,
)
from app.services.postgres_service import PostgresService

router = APIRouter(prefix="/roadmap", tags=["Product Roadmap & Discovery"])


def _to_response(model) -> RoadmapInitiativeResponse:
    reach = max(1, min(100, model.rice_reach or 50))
    impact = max(1, min(5, model.rice_impact or 3))
    confidence = max(10, min(100, model.rice_confidence or 80))
    effort = max(1, min(20, model.rice_effort or 3))
    score = model.rice_score or round((reach * impact * confidence) / (effort * 100), 1)

    return RoadmapInitiativeResponse(
        id=model.id,
        tenant_id=model.tenant_id,
        title=model.title,
        stage=model.stage,
        theme=model.theme,
        priority=model.priority,
        target_persona=model.target_persona,
        quarter=model.quarter,
        summary=model.summary or "",
        problem_statement=model.problem_statement or "",
        user_story=model.user_story or "",
        success_metrics=model.success_metrics or [],
        acceptance_criteria=model.acceptance_criteria or [],
        technical_architecture=model.technical_architecture or "",
        rice=RICEScoreSchema(
            reach=reach,
            impact=impact,
            confidence=confidence,
            effort=effort,
            score=score,
        ),
        upvotes=model.upvotes or 0,
        tags=model.tags or [],
        created_at=model.created_at,
        updated_at=model.updated_at,
    )


@router.get("", response_model=List[RoadmapInitiativeResponse])
async def list_roadmap_initiatives(
    tenant_id: str = Query("default", description="Tenant namespace"),
    stage: Optional[str] = Query(None, description="Filter by stage"),
    theme: Optional[str] = Query(None, description="Filter by theme"),
    db: AsyncSession = Depends(get_db_session),
):
    """List all roadmap initiatives, auto-seeding defaults if database table is empty."""
    items = await PostgresService.list_roadmap_initiatives(
        session=db,
        tenant_id=tenant_id,
        stage=stage,
        theme=theme,
    )
    return [_to_response(item) for item in items]


@router.get("/{initiative_id}", response_model=RoadmapInitiativeResponse)
async def get_roadmap_initiative(
    initiative_id: str,
    db: AsyncSession = Depends(get_db_session),
):
    """Retrieve a single roadmap initiative by ID."""
    item = await PostgresService.get_roadmap_initiative(db, initiative_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Roadmap initiative '{initiative_id}' not found",
        )
    return _to_response(item)


@router.post("", response_model=RoadmapInitiativeResponse, status_code=status.HTTP_201_CREATED)
async def create_roadmap_initiative(
    payload: RoadmapInitiativeCreate,
    db: AsyncSession = Depends(get_db_session),
):
    """Ingest a new Continuous Discovery opportunity into the backlog."""
    created = await PostgresService.create_roadmap_initiative(db, payload)
    return _to_response(created)


@router.patch("/{initiative_id}", response_model=RoadmapInitiativeResponse)
async def update_roadmap_initiative(
    initiative_id: str,
    payload: RoadmapInitiativeUpdate,
    db: AsyncSession = Depends(get_db_session),
):
    """Update roadmap initiative lifecycle stage, specs, or RICE scores."""
    updated = await PostgresService.update_roadmap_initiative(db, initiative_id, payload)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Roadmap initiative '{initiative_id}' not found",
        )
    return _to_response(updated)


@router.post("/{initiative_id}/upvote", response_model=RoadmapInitiativeResponse)
async def upvote_roadmap_initiative(
    initiative_id: str,
    delta: int = Query(1, description="1 for upvote, -1 to remove upvote"),
    db: AsyncSession = Depends(get_db_session),
):
    """Atomically increment or decrement upvote count."""
    updated = await PostgresService.upvote_roadmap_initiative(db, initiative_id, delta=delta)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Roadmap initiative '{initiative_id}' not found",
        )
    return _to_response(updated)


@router.post("/reset", status_code=status.HTTP_200_OK)
async def reset_roadmap_initiatives(
    tenant_id: str = Query("default", description="Tenant namespace"),
    db: AsyncSession = Depends(get_db_session),
):
    """Reset roadmap initiatives back to default seeded backlog."""
    await PostgresService.reset_roadmap_initiatives(db, tenant_id)
    return {"message": "Roadmap initiatives reset to defaults successfully", "tenant_id": tenant_id}
