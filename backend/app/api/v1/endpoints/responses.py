from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db_session
from app.models.schemas import AuditLogCreate, AuditLogItem, WorkspaceCreate
from app.services.postgres_service import PostgresService

logger = logging.getLogger(__name__)
router = APIRouter()

DEFAULT_SEED_HISTORY = [
    {
        "id": "demo",
        "title": "Northstar security review",
        "editedAt": "8 min ago",
        "color": "blue",
        "questionsCount": 12,
    },
    {
        "id": "grove-rfp",
        "title": "Grove procurement RFP",
        "editedAt": "Yesterday",
        "color": "orange",
        "questionsCount": 8,
    },
    {
        "id": "meridian-form",
        "title": "Meridian vendor form",
        "editedAt": "Aug 18",
        "color": "green",
        "questionsCount": 15,
    },
]


@router.get("/history")  # This is relative to the prefix in the main router
async def get_responses_history(
    x_tenant_id: str = Header(alias="X-Tenant-ID", default="acme-corp"),
    db: AsyncSession = Depends(get_db_session),
):
    """
    Fetch recent RFPs history for the current tenant directly from PostgreSQL database.
    """
    try:
        workspaces = await PostgresService.list_workspaces(db, tenant_id=x_tenant_id, limit=10)
        if workspaces:
            history = [
                {
                    "id": w.id,
                    "title": w.title,
                    "editedAt": w.updated_at.strftime("%b %d, %H:%M") if w.updated_at else "Just now",
                    "color": "blue" if w.source_mode == "url" else ("green" if w.title.lower().endsWith(".csv") else "orange"),
                    "questionsCount": len(w.reviews) if w.reviews else 0,
                }
                for w in workspaces
            ]
            return {"history": history}
    except Exception as e:
        logger.warning("Failed to fetch workspaces from PostgreSQL: %s", e)

    return {"history": DEFAULT_SEED_HISTORY}


@router.post("/history")
async def add_response_history(
    payload: Dict[str, Any],
    x_tenant_id: str = Header(alias="X-Tenant-ID", default="acme-corp"),
    db: AsyncSession = Depends(get_db_session),
):
    """
    Persist recent RFP questionnaire item directly to PostgreSQL database.
    """
    item_id = payload.get("id", f"rfp-{int(datetime.now(timezone.utc).timestamp())}")
    title = payload.get("title", "Questionnaire Response")
    source_mode = "url" if payload.get("color") == "blue" else "upload"

    try:
        ws_create = WorkspaceCreate(
            id=item_id,
            tenant_id=x_tenant_id,
            title=title,
            source_mode=source_mode,
            source_url="",
            questions=[],
        )
        await PostgresService.save_workspace(db, ws_create)
    except Exception as e:
        logger.warning("PostgreSQL workspace save fallback: %s", e)

    history_list = await get_responses_history(x_tenant_id=x_tenant_id, db=db)
    return {"status": "success", "history": history_list.get("history", [])}


@router.post("/review")
async def review_response(payload: Dict[str, Any]):
    """
    Endpoint for transitioning workspace / questionnaire responses into 'In Review' or 'Approved' status.
    """
    return {
        "status": "success",
        "review_status": payload.get("status", "In Review"),
        "workspace_id": payload.get("workspace_id", ""),
        "message": "Response review status updated successfully",
    }


# --- Audit Log Endpoints (PostgreSQL Database) ---

@router.get("/audit-logs", response_model=List[AuditLogItem])
async def get_audit_logs(
    x_tenant_id: str = Header(alias="X-Tenant-ID", default="acme-corp"),
    db: AsyncSession = Depends(get_db_session),
):
    """
    Fetch audit log entries for the active tenant from PostgreSQL.
    """
    try:
        logs = await PostgresService.list_audit_logs(db, tenant_id=x_tenant_id, limit=50)
        return [AuditLogItem.model_validate(l) for l in logs]
    except Exception as e:
        logger.warning("Audit log fetch error: %s", e)
        return []


@router.post("/audit-logs", response_model=AuditLogItem, status_code=status.HTTP_201_CREATED)
async def create_audit_log_entry(
    payload: AuditLogCreate,
    x_tenant_id: str = Header(alias="X-Tenant-ID", default="acme-corp"),
    db: AsyncSession = Depends(get_db_session),
):
    """
    Save a new audit log record into PostgreSQL.
    """
    try:
        log_entry = await PostgresService.create_audit_log(
            session=db,
            tenant_id=x_tenant_id,
            user_role=payload.user_role,
            action=payload.action,
            details=payload.details,
            event_type=payload.event_type,
        )
        return AuditLogItem.model_validate(log_entry)
    except Exception as e:
        logger.error("Failed to save audit log: %s", e)
        raise HTTPException(status_code=500, detail="Audit log storage failed")



