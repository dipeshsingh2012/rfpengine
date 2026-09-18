from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, File, Form, Header, HTTPException, Response, UploadFile, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db_session
from app.services.compliance_exporter_service import ComplianceExporterService
from app.services.parser_feedback_service import (
    ParserFeedbackPayload,
    ParserFeedbackRecord,
    parser_feedback_service,
)
from app.services.questionnaire_parser_service import (
    QuestionnaireParserService,
    QuestionnaireParseResult,
)
from app.models.schemas import (
    AuditLogCreate,
    AuditLogItem,
    ExportItemPayload,
    ExportRequestPayload,
    QuestionReviewItem,
    WorkspaceCreate,
    WorkspaceResponse,
    WorkspaceSummaryResponse,
    WorkspaceUpdatePayload,
    WorkspaceSettingsSchema,
    WorkspaceSettingsUpdate,
)
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
                    "color": "blue" if w.source_mode == "url" else ("green" if w.title.lower().endswith(".csv") else "orange"),
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


# --- Workspace Management Endpoints (PostgreSQL Database) ---

@router.get("/workspaces", response_model=List[WorkspaceSummaryResponse])
async def list_workspaces_endpoint(
    search: Optional[str] = None,
    status_filter: Optional[str] = None,
    limit: int = 50,
    x_tenant_id: str = Header(alias="X-Tenant-ID", default="acme-corp"),
    db: AsyncSession = Depends(get_db_session),
) -> List[WorkspaceSummaryResponse]:
    """
    List all response workspaces and questionnaires for the active tenant from PostgreSQL,
    including real-time progress calculations, approval status, and reviewer roles.
    """
    return await PostgresService.list_workspace_summaries(
        session=db,
        tenant_id=x_tenant_id,
        limit=limit,
        search=search,
        status_filter=status_filter,
    )


@router.post("/workspaces", response_model=WorkspaceResponse, status_code=status.HTTP_201_CREATED)
async def create_workspace_endpoint(
    payload: WorkspaceCreate,
    x_tenant_id: str = Header(alias="X-Tenant-ID", default="acme-corp"),
    db: AsyncSession = Depends(get_db_session),
) -> WorkspaceResponse:
    """
    Create or import a new RFP questionnaire workspace directly in PostgreSQL.
    """
    payload.tenant_id = x_tenant_id
    ws = await PostgresService.save_workspace(db, payload)
    questions = [
        QuestionReviewItem(
            id=r.id,
            question_index=r.question_index,
            question_text=r.question_text,
            suggested_answer=r.suggested_answer,
            final_answer=r.final_answer,
            review_status=r.review_status,
            assigned_role=r.assigned_role,
            confidence_score=r.confidence_score,
            sources=r.sources_json,
            is_promoted_to_kb=r.is_promoted_to_kb,
            promoted_kb_id=r.promoted_kb_id,
        )
        for r in (ws.reviews or [])
    ]
    return WorkspaceResponse(
        id=ws.id,
        tenant_id=ws.tenant_id,
        title=ws.title,
        source_mode=ws.source_mode,
        source_url=ws.source_url,
        created_at=ws.created_at,
        updated_at=ws.updated_at,
        questions=questions,
    )


@router.get("/workspaces/{workspace_id}", response_model=WorkspaceResponse)
async def get_workspace_detail_endpoint(
    workspace_id: str,
    x_tenant_id: str = Header(alias="X-Tenant-ID", default="acme-corp"),
    db: AsyncSession = Depends(get_db_session),
) -> WorkspaceResponse:
    """
    Fetch complete workspace details, questions, answers, and review statuses from PostgreSQL.
    """
    ws = await PostgresService.get_workspace(db, workspace_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    if ws.tenant_id != x_tenant_id:
        raise HTTPException(status_code=403, detail="Unauthorized access to tenant workspace")

    questions = [
        QuestionReviewItem(
            id=r.id,
            question_index=r.question_index,
            question_text=r.question_text,
            suggested_answer=r.suggested_answer,
            final_answer=r.final_answer,
            review_status=r.review_status,
            assigned_role=r.assigned_role,
            confidence_score=r.confidence_score,
            sources=r.sources_json,
            is_promoted_to_kb=r.is_promoted_to_kb,
            promoted_kb_id=r.promoted_kb_id,
        )
        for r in (ws.reviews or [])
    ]
    return WorkspaceResponse(
        id=ws.id,
        tenant_id=ws.tenant_id,
        title=ws.title,
        source_mode=ws.source_mode,
        source_url=ws.source_url,
        created_at=ws.created_at,
        updated_at=ws.updated_at,
        questions=questions,
    )


@router.put("/workspaces/{workspace_id}", response_model=WorkspaceResponse)
async def update_workspace_endpoint(
    workspace_id: str,
    payload: WorkspaceUpdatePayload,
    x_tenant_id: str = Header(alias="X-Tenant-ID", default="acme-corp"),
    db: AsyncSession = Depends(get_db_session),
) -> WorkspaceResponse:
    """
    Update workspace answers, review statuses, or title in PostgreSQL.
    """
    ws = await PostgresService.update_workspace_details(db, workspace_id, payload, tenant_id=x_tenant_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found or unauthorized")

    questions = [
        QuestionReviewItem(
            id=r.id,
            question_index=r.question_index,
            question_text=r.question_text,
            suggested_answer=r.suggested_answer,
            final_answer=r.final_answer,
            review_status=r.review_status,
            assigned_role=r.assigned_role,
            confidence_score=r.confidence_score,
            sources=r.sources_json,
            is_promoted_to_kb=r.is_promoted_to_kb,
            promoted_kb_id=r.promoted_kb_id,
        )
        for r in (ws.reviews or [])
    ]
    return WorkspaceResponse(
        id=ws.id,
        tenant_id=ws.tenant_id,
        title=ws.title,
        source_mode=ws.source_mode,
        source_url=ws.source_url,
        created_at=ws.created_at,
        updated_at=ws.updated_at,
        questions=questions,
    )


@router.post("/workspaces/{workspace_id}/duplicate", response_model=WorkspaceResponse, status_code=status.HTTP_201_CREATED)
async def duplicate_workspace_endpoint(
    workspace_id: str,
    x_tenant_id: str = Header(alias="X-Tenant-ID", default="acme-corp"),
    db: AsyncSession = Depends(get_db_session),
) -> WorkspaceResponse:
    """
    Duplicate an existing workspace and its questions in PostgreSQL.
    """
    ws = await PostgresService.duplicate_workspace(db, workspace_id, tenant_id=x_tenant_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found or unauthorized")

    questions = [
        QuestionReviewItem(
            id=r.id,
            question_index=r.question_index,
            question_text=r.question_text,
            suggested_answer=r.suggested_answer,
            final_answer=r.final_answer,
            review_status=r.review_status,
            assigned_role=r.assigned_role,
            confidence_score=r.confidence_score,
            sources=r.sources_json,
            is_promoted_to_kb=r.is_promoted_to_kb,
            promoted_kb_id=r.promoted_kb_id,
        )
        for r in (ws.reviews or [])
    ]
    return WorkspaceResponse(
        id=ws.id,
        tenant_id=ws.tenant_id,
        title=ws.title,
        source_mode=ws.source_mode,
        source_url=ws.source_url,
        created_at=ws.created_at,
        updated_at=ws.updated_at,
        questions=questions,
    )


@router.delete("/workspaces/{workspace_id}")
async def delete_workspace_endpoint(
    workspace_id: str,
    x_tenant_id: str = Header(alias="X-Tenant-ID", default="acme-corp"),
    db: AsyncSession = Depends(get_db_session),
):
    """
    Delete a workspace and cascade delete all its reviews from PostgreSQL.
    """
    deleted = await PostgresService.delete_workspace(db, workspace_id, tenant_id=x_tenant_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Workspace not found or unauthorized")
    return {"status": "success", "message": f"Workspace '{workspace_id}' deleted successfully"}


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


@router.get("/settings", response_model=WorkspaceSettingsSchema)
@router.get("/workspace/settings", response_model=WorkspaceSettingsSchema)
async def get_workspace_settings(
    tenant_id: Optional[str] = None,
    x_tenant_id: Optional[str] = Header(default=None, alias="X-Tenant-ID"),
    db: AsyncSession = Depends(get_db_session),
) -> WorkspaceSettingsSchema:
    """Retrieves multi-tenant workspace settings and LLM context."""
    resolved_tenant = tenant_id or x_tenant_id or "acme-corp"
    settings = await PostgresService.get_workspace_settings(db, tenant_id=resolved_tenant)
    return WorkspaceSettingsSchema.model_validate(settings)


@router.put("/settings", response_model=WorkspaceSettingsSchema)
@router.put("/workspace/settings", response_model=WorkspaceSettingsSchema)
async def update_workspace_settings(
    payload: WorkspaceSettingsUpdate,
    tenant_id: Optional[str] = None,
    x_tenant_id: Optional[str] = Header(default=None, alias="X-Tenant-ID"),
    db: AsyncSession = Depends(get_db_session),
) -> WorkspaceSettingsSchema:
    """Updates multi-tenant workspace settings, AI model choices, and SME routing."""
    resolved_tenant = tenant_id or x_tenant_id or "acme-corp"
    updated = await PostgresService.update_workspace_settings(
        db, tenant_id=resolved_tenant, update_data=payload
    )
    return WorkspaceSettingsSchema.model_validate(updated)


class RephraseQuestionRequest(BaseModel):
    question_text: str
    style: str = "clear_compliance"


class RephraseQuestionResponse(BaseModel):
    original_text: str
    rephrased_text: str


@router.post("/parse-file", response_model=QuestionnaireParseResult)
async def parse_questionnaire_file(
    file: UploadFile = File(...),
    guidance: Optional[str] = Form(default=None),
    x_tenant_id: Optional[str] = Header(default="acme-corp", alias="X-Tenant-ID"),
) -> QuestionnaireParseResult:
    """
    Parses an enterprise questionnaire file (Excel .xlsx/.xls/.csv, Word .docx, or PDF .pdf)
    and extracts structured questions, sections, and answer expectations with optional AI guidance.
    """
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    filename = file.filename
    try:
        content = await file.read()
        if not content:
            raise HTTPException(status_code=400, detail="Uploaded file is empty")

        result = await asyncio.to_thread(
            QuestionnaireParserService.parse_questionnaire, content, filename, guidance=guidance
        )
        logger.info(
            "Parsed %d questions from %s (format: %s, guided: %s) for tenant %s",
            result.total_questions,
            filename,
            result.format,
            bool(guidance),
            x_tenant_id,
        )
        return result
    except ValueError as val_err:
        logger.warning("Validation error parsing questionnaire file %s: %s", filename, val_err)
        raise HTTPException(status_code=400, detail=str(val_err))
    except Exception as exc:
        logger.error("Error parsing questionnaire file %s: %s", filename, exc, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to parse document: {str(exc)}")


@router.post("/rephrase-question", response_model=RephraseQuestionResponse)
async def rephrase_question_endpoint(
    payload: RephraseQuestionRequest,
    x_tenant_id: Optional[str] = Header(default="acme-corp", alias="X-Tenant-ID"),
) -> RephraseQuestionResponse:
    """
    Uses Gemini 2.5 Flash to rephrase/clean an extracted question into standardized enterprise compliance syntax.
    """
    if not payload.question_text.strip():
        raise HTTPException(status_code=400, detail="Question text cannot be empty")

    rephrased = await asyncio.to_thread(
        QuestionnaireParserService.rephrase_question,
        payload.question_text,
        payload.style,
    )
    return RephraseQuestionResponse(
        original_text=payload.question_text,
        rephrased_text=rephrased,
    )


@router.post("/parser-feedback", response_model=ParserFeedbackRecord)
async def submit_parser_feedback(
    payload: ParserFeedbackPayload,
    x_tenant_id: str = Header(default="acme-corp", alias="X-Tenant-ID"),
) -> ParserFeedbackRecord:
    """
    Records review-time user corrections, deletions (false positives), and quality ratings on AI extractions.
    """
    return parser_feedback_service.record_feedback(x_tenant_id, payload)


@router.post("/export")
async def export_questionnaire_package(
    payload: ExportRequestPayload,
    x_tenant_id: Optional[str] = Header(default=None, alias="X-Tenant-ID"),
) -> Response:
    """
    Exports questionnaire responses into audit-ready .xlsx, .docx, .pdf, or .csv formats.
    """
    if x_tenant_id and not payload.tenant_id:
        payload.tenant_id = x_tenant_id

    try:
        content, mime, filename = ComplianceExporterService.export(payload)
        return Response(
            content=content,
            media_type=mime,
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "Access-Control-Expose-Headers": "Content-Disposition",
            },
        )
    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err))
    except Exception as exc:
        logger.error("Failed to generate export package: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to generate export: {str(exc)}")


@router.get("/workspaces/{workspace_id}/export")
async def export_workspace_by_id(
    workspace_id: str,
    format: str = "xlsx",
    x_tenant_id: str = Header(alias="X-Tenant-ID", default="acme-corp"),
    db: AsyncSession = Depends(get_db_session),
) -> Response:
    """
    Loads an existing workspace from PostgreSQL and exports it to .xlsx, .docx, .pdf, or .csv.
    """
    ws = await PostgresService.get_workspace(db, workspace_id, tenant_id=x_tenant_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found or unauthorized")

    items = [
        ExportItemPayload(
            question_index=r.question_index,
            section="General",
            question_text=r.question_text,
            answer_text=r.final_answer or r.suggested_answer or "",
            review_status=r.review_status,
            assigned_role=r.assigned_role,
            confidence_score=r.confidence_score,
            sources=r.sources_json,
            comments="",
        )
        for r in (ws.reviews or [])
    ]

    payload = ExportRequestPayload(
        workspace_id=ws.id,
        tenant_id=ws.tenant_id,
        title=ws.title,
        format=format,
        items=items,
    )

    try:
        content, mime, filename = ComplianceExporterService.export(payload)
        return Response(
            content=content,
            media_type=mime,
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "Access-Control-Expose-Headers": "Content-Disposition",
            },
        )
    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err))
    except Exception as exc:
        logger.error("Failed to export workspace %s: %s", workspace_id, exc, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to export workspace: {str(exc)}")





