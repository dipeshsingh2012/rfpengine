from __future__ import annotations

import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db_session
from app.models.schemas import (
    TuningDatasetPreviewResponse,
    TuningJobCreate,
    TuningJobResponse,
    WorkspaceSettingsSchema,
)
from app.services.gemini_tuning_service import GeminiTuningService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/tuning", tags=["Gemini Supervised Tuning"])
tuning_service = GeminiTuningService()


@router.get("/supported-models")
async def get_supported_models() -> List[dict]:
    """
    Returns verified Gemini base models supported for Vertex AI Supervised Fine-Tuning in us-central1.
    """
    return tuning_service.get_supported_tuning_models()


@router.get("/dataset-preview", response_model=TuningDatasetPreviewResponse)
async def get_dataset_preview(
    x_tenant_id: str = Header(alias="X-Tenant-ID", default="acme-corp"),
    db: AsyncSession = Depends(get_db_session),
) -> TuningDatasetPreviewResponse:
    """
    Inspect the supervised fine-tuning dataset pairs extracted from Golden Q&A and approved reviews.
    """
    return await tuning_service.get_dataset_preview(db, x_tenant_id)


@router.post("/jobs", response_model=TuningJobResponse, status_code=status.HTTP_201_CREATED)
async def create_tuning_job(
    payload: TuningJobCreate,
    x_tenant_id: str = Header(alias="X-Tenant-ID", default="acme-corp"),
    db: AsyncSession = Depends(get_db_session),
) -> TuningJobResponse:
    """
    Launch a Google Cloud Vertex AI Supervised Fine-Tuning job with verified RFP pairs.
    """
    try:
        job = await tuning_service.create_tuning_job(db, x_tenant_id, payload)
        return TuningJobResponse.model_validate(job)
    except ValueError as exc:
        logger.warning("Invalid tuning request parameter: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )
    except Exception as exc:
        logger.error("Failed to initiate Vertex AI Gemini tuning job: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to initiate tuning job: {str(exc)}",
        )


@router.get("/jobs", response_model=List[TuningJobResponse])
async def list_tuning_jobs(
    x_tenant_id: str = Header(alias="X-Tenant-ID", default="acme-corp"),
    db: AsyncSession = Depends(get_db_session),
) -> List[TuningJobResponse]:
    """
    List all supervised fine-tuning jobs for the current tenant.
    """
    jobs = await tuning_service.list_tuning_jobs(db, x_tenant_id)
    return [TuningJobResponse.model_validate(j) for j in jobs]


@router.get("/jobs/{job_id}", response_model=TuningJobResponse)
async def get_tuning_job(
    job_id: str,
    x_tenant_id: str = Header(alias="X-Tenant-ID", default="acme-corp"),
    db: AsyncSession = Depends(get_db_session),
) -> TuningJobResponse:
    """
    Get current progress, status, and loss metrics for a specific tuning job.
    """
    job = await tuning_service.get_tuning_job_status(db, x_tenant_id, job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tuning job '{job_id}' not found",
        )
    return TuningJobResponse.model_validate(job)


@router.post("/jobs/{job_id}/activate", response_model=WorkspaceSettingsSchema)
async def activate_tuned_model(
    job_id: str,
    x_tenant_id: str = Header(alias="X-Tenant-ID", default="acme-corp"),
    db: AsyncSession = Depends(get_db_session),
) -> WorkspaceSettingsSchema:
    """
    Activate a completed tuned model as the default answering endpoint in Workspace Settings.
    """
    try:
        settings = await tuning_service.activate_tuned_model(db, x_tenant_id, job_id)
        return WorkspaceSettingsSchema.model_validate(settings)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except Exception as exc:
        logger.error("Failed to activate tuned model: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to activate tuned model: {str(exc)}",
        )


@router.post("/jobs/{job_id}/cancel", response_model=TuningJobResponse)
async def cancel_tuning_job(
    job_id: str,
    x_tenant_id: str = Header(alias="X-Tenant-ID", default="acme-corp"),
    db: AsyncSession = Depends(get_db_session),
) -> TuningJobResponse:
    """
    Cancel an ongoing Vertex AI tuning job.
    """
    job = await tuning_service.cancel_tuning_job(db, x_tenant_id, job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tuning job '{job_id}' not found",
        )
    return TuningJobResponse.model_validate(job)


@router.delete("/jobs/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tuning_job(
    job_id: str,
    x_tenant_id: str = Header(alias="X-Tenant-ID", default="acme-corp"),
    db: AsyncSession = Depends(get_db_session),
) -> None:
    """
    Delete a tuning job record and its associated GCS training dataset.
    """
    deleted = await tuning_service.delete_tuning_job(db, x_tenant_id, job_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tuning job '{job_id}' not found",
        )

