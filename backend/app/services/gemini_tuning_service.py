from __future__ import annotations

import json
import logging
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from google.oauth2 import service_account
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import Settings, get_settings
from app.models.db_models import (
    KBEntryModel,
    QuestionReviewModel,
    ResponseWorkspace,
    TuningJobModel,
    WorkspaceSettingsModel,
)
from app.models.schemas import (
    TuningDatasetPreviewResponse,
    TuningJobCreate,
    WorkspaceSettingsUpdate,
)
from app.services.postgres_service import PostgresService

logger = logging.getLogger(__name__)

try:
    from google import genai
    from google.genai import types
except ImportError:
    genai = None  # type: ignore
    types = None  # type: ignore

try:
    from google.cloud import storage
except ImportError:
    storage = None  # type: ignore


SUPPORTED_TUNING_MODELS: List[Dict[str, Any]] = [
    {
        "id": "gemini-2.5-flash",
        "name": "Gemini 2.5 Flash",
        "description": "Fast, Production Default (Recommended)",
        "recommended": True,
    },
    {
        "id": "gemini-2.5-pro",
        "name": "Gemini 2.5 Pro",
        "description": "Advanced Enterprise Reasoning",
        "recommended": False,
    },
    {
        "id": "gemini-2.5-flash-lite",
        "name": "Gemini 2.5 Flash-Lite",
        "description": "High Throughput, Low Latency",
        "recommended": False,
    },
    {
        "id": "gemini-3.5-flash",
        "name": "Gemini 3.5 Flash",
        "description": "Next-Gen Frontier Flash",
        "recommended": False,
    },
]


class GeminiTuningService:
    def __init__(self, settings: Optional[Settings] = None):
        self.settings = settings or get_settings()
        self.credentials: Optional[Any] = None
        self.genai_client: Optional[Any] = None
        self.storage_client: Optional[Any] = None

        if self.settings.gcp_project_id:
            try:
                creds_path = self.settings.google_application_credentials
                credentials = None
                if creds_path:
                    path_obj = Path(creds_path)
                    if not path_obj.is_absolute():
                        if not path_obj.exists() and (Path.cwd() / creds_path).exists():
                            path_obj = Path.cwd() / creds_path
                        elif not path_obj.exists() and (Path.cwd().parent / creds_path).exists():
                            path_obj = Path.cwd().parent / creds_path
                    if path_obj.exists():
                        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = str(path_obj.resolve())
                        credentials = service_account.Credentials.from_service_account_file(
                            str(path_obj.resolve()),
                            scopes=["https://www.googleapis.com/auth/cloud-platform"],
                        )
                self.credentials = credentials
                if genai:
                    self.genai_client = genai.Client(
                        vertexai=True,
                        project=self.settings.gcp_project_id,
                        location="us-central1",
                        credentials=credentials,
                    )
                if storage:
                    self.storage_client = storage.Client(
                        project=self.settings.gcp_project_id,
                        credentials=credentials,
                    )
            except Exception as exc:
                logger.warning("Gemini tuning client initialization skipped: %s", exc)

    @classmethod
    def format_tuning_example(
        cls,
        question: str,
        answer: str,
        company_name: str = "Acme Corporation",
    ) -> Dict[str, Any]:
        """
        Formats a single Q&A pair into Google Vertex AI Gemini multi-turn JSONL format.
        """
        return {
            "messages": [
                {
                    "role": "system",
                    "content": (
                        f"You are the enterprise AI Proposal Drafter for {company_name}, "
                        "specializing in technical, security, and compliance RFP questionnaires. "
                        "Deliver concise, authoritative, and standard-compliant responses."
                    ),
                },
                {"role": "user", "content": question.strip()},
                {"role": "model", "content": answer.strip()},
            ]
        }

    async def extract_tuning_dataset(
        self,
        db: AsyncSession,
        tenant_id: str,
        include_golden_qa: bool = True,
        include_approved_reviews: bool = True,
    ) -> List[Dict[str, Any]]:
        """
        Extracts verified human-vetted pairs from KB Golden Q&A and approved QuestionReviews.
        Automatically deduplicates pairs by normalized question text to ensure diverse training examples.
        """
        settings = await PostgresService.get_workspace_settings(db, tenant_id)
        company_name = settings.company_name if settings else "Acme Corporation"
        dataset: List[Dict[str, Any]] = []
        seen_questions: set = set()

        # 1. Extract Golden Q&A from KB entries
        if include_golden_qa:
            kb_stmt = select(KBEntryModel).where(
                KBEntryModel.tenant_id == tenant_id,
                KBEntryModel.category == "Golden Q&A",
            )
            kb_res = await db.execute(kb_stmt)
            for entry in kb_res.scalars().all():
                q = (entry.question or entry.title or "").strip()
                a = (entry.answer or entry.content or "").strip()
                norm_q = " ".join(q.lower().split())
                if norm_q and a and norm_q not in seen_questions:
                    seen_questions.add(norm_q)
                    dataset.append(self.format_tuning_example(q, a, company_name))

        # 2. Extract Approved / Promoted QuestionReviews from tenant workspaces
        if include_approved_reviews:
            rev_stmt = (
                select(QuestionReviewModel)
                .join(ResponseWorkspace, QuestionReviewModel.workspace_id == ResponseWorkspace.id)
                .where(
                    ResponseWorkspace.tenant_id == tenant_id,
                    QuestionReviewModel.review_status.in_(["Approved", "Promoted"]),
                )
            )
            rev_res = await db.execute(rev_stmt)
            for rev in rev_res.scalars().all():
                q = (rev.question_text or "").strip()
                a = ((rev.final_answer or rev.suggested_answer) or "").strip()
                norm_q = " ".join(q.lower().split())
                if norm_q and a and norm_q not in seen_questions:
                    seen_questions.add(norm_q)
                    dataset.append(self.format_tuning_example(q, a, company_name))

        return dataset

    async def get_dataset_preview(
        self,
        db: AsyncSession,
        tenant_id: str,
    ) -> TuningDatasetPreviewResponse:
        """
        Calculates deduplicated dataset metrics and distinct sample pairs for admin inspection.
        """
        golden_dataset = await self.extract_tuning_dataset(
            db, tenant_id, include_golden_qa=True, include_approved_reviews=False
        )
        approved_dataset = await self.extract_tuning_dataset(
            db, tenant_id, include_golden_qa=False, include_approved_reviews=True
        )
        full_dataset = await self.extract_tuning_dataset(
            db, tenant_id, include_golden_qa=True, include_approved_reviews=True
        )

        samples = full_dataset[:5]

        return TuningDatasetPreviewResponse(
            total_pairs=len(full_dataset),
            golden_qa_count=len(golden_dataset),
            approved_reviews_count=len(approved_dataset),
            sample_pairs=samples,
        )

    async def create_tuning_job(
        self,
        db: AsyncSession,
        tenant_id: str,
        request: TuningJobCreate,
    ) -> TuningJobModel:
        """
        Extracts training pairs, stages dataset to GCS, creates a Vertex AI supervised tuning job, and records in DB.
        """
        job_id = f"tune-{uuid.uuid4().hex[:10]}"
        dataset = await self.extract_tuning_dataset(
            db,
            tenant_id,
            include_golden_qa=request.include_golden_qa,
            include_approved_reviews=request.include_approved_reviews,
        )

        base_model_id = (request.base_model or "gemini-2.5-flash").strip()
        clean_model_id = base_model_id.replace("publishers/google/models/", "").strip()
        valid_ids = {m["id"] for m in SUPPORTED_TUNING_MODELS}
        if not base_model_id.startswith("projects/") and clean_model_id not in valid_ids:
            supported_str = ", ".join(sorted(valid_ids))
            raise ValueError(
                f"Base model '{request.base_model}' is not supported for Vertex AI Supervised Fine-Tuning. "
                f"Supported models in us-central1 are: {supported_str}."
            )

        bucket_name = self.settings.gcs_bucket_name or "rfpengine-tuning-us-central1"
        blob_path = f"datasets/{tenant_id}/{job_id}.jsonl"
        dataset_uri = request.custom_dataset_uri or f"gs://{bucket_name}/{blob_path}"
        vertex_job_name = f"projects/{self.settings.gcp_project_id or 'rfpengine'}/locations/us-central1/tuningJobs/{job_id}"
        tuned_model_dest = f"projects/{self.settings.gcp_project_id or 'rfpengine'}/locations/us-central1/models/tuned-{job_id}"

        # Stage JSONL dataset to Google Cloud Storage
        jsonl_data = "\n".join(json.dumps(ex) for ex in dataset)
        if not request.custom_dataset_uri:
            if not self.storage_client:
                raise RuntimeError("Google Cloud Storage client is not initialized. Cannot stage tuning dataset.")
            try:
                bucket = self.storage_client.bucket(bucket_name)
                blob = bucket.blob(blob_path)
                blob.upload_from_string(jsonl_data, content_type="application/jsonl")
                logger.info("Uploaded %d examples to gs://%s/%s", len(dataset), bucket_name, blob_path)
            except Exception as gcs_err:
                logger.error("GCS dataset upload failed: %s", gcs_err)
                raise RuntimeError(f"Failed to upload tuning dataset to gs://{bucket_name}/{blob_path}: {gcs_err}") from gcs_err

        if not self.genai_client:
            raise RuntimeError("Vertex AI Gemini client is not initialized. Cannot invoke tuning job.")

        logger.info("Triggering Vertex AI tuning job: %s with %d examples", job_id, len(dataset))
        training_dataset_arg = types.TuningDataset(gcs_uri=dataset_uri) if types else dataset_uri
        tuning_config = types.CreateTuningJobConfig(
            epoch_count=request.epochs,
            learning_rate_multiplier=request.learning_rate_multiplier,
            tuned_model_display_name=f"rfp-gemini-{tenant_id}-{job_id}",
        ) if types else None

        base_model_id = request.base_model.strip()
        target_model = (
            f"publishers/google/models/{base_model_id}"
            if not base_model_id.startswith(("publishers/", "projects/"))
            else base_model_id
        )

        try:
            try:
                tuning_job = self.genai_client.tunings.tune(
                    base_model=target_model,
                    training_dataset=training_dataset_arg,
                    config=tuning_config,
                )
            except Exception as first_exc:
                if target_model != base_model_id:
                    logger.info("Retrying Vertex AI tune with short model name: %s", base_model_id)
                    tuning_job = self.genai_client.tunings.tune(
                        base_model=base_model_id,
                        training_dataset=training_dataset_arg,
                        config=tuning_config,
                    )
                else:
                    raise first_exc

            if hasattr(tuning_job, "name") and tuning_job.name:
                vertex_job_name = tuning_job.name
            if hasattr(tuning_job, "tuned_model") and getattr(tuning_job.tuned_model, "model", None):
                tuned_model_dest = tuning_job.tuned_model.model
            status = "RUNNING"
            error_msg = None
            metrics: Dict[str, Any] = {
                "step": 0,
                "total_examples": len(dataset),
            }
        except Exception as exc:
            logger.error("Vertex AI tuning job initiation failed: %s", exc)
            job = TuningJobModel(
                id=job_id,
                tenant_id=tenant_id,
                job_name=vertex_job_name,
                base_model=request.base_model,
                tuned_model_name=None,
                status="FAILED",
                training_dataset_uri=dataset_uri,
                dataset_examples_count=len(dataset),
                epochs=request.epochs,
                learning_rate_multiplier=request.learning_rate_multiplier,
                metrics={"total_examples": len(dataset)},
                error_message=str(exc),
            )
            db.add(job)
            await db.commit()
            raise RuntimeError(f"Vertex AI tuning initiation failed: {exc}") from exc

        job = TuningJobModel(
            id=job_id,
            tenant_id=tenant_id,
            job_name=vertex_job_name,
            base_model=request.base_model,
            tuned_model_name=tuned_model_dest,
            status=status,
            training_dataset_uri=dataset_uri,
            dataset_examples_count=len(dataset),
            epochs=request.epochs,
            learning_rate_multiplier=request.learning_rate_multiplier,
            metrics=metrics,
            error_message=error_msg,
        )
        db.add(job)
        await db.commit()
        await db.refresh(job)
        return job

    async def list_tuning_jobs(
        self,
        db: AsyncSession,
        tenant_id: str,
    ) -> List[TuningJobModel]:
        """
        Lists tuning jobs for a tenant ordered by latest first.
        Refreshes status against Vertex AI for any active RUNNING jobs.
        """
        stmt = (
            select(TuningJobModel)
            .where(TuningJobModel.tenant_id == tenant_id)
            .order_by(TuningJobModel.created_at.desc())
        )
        res = await db.execute(stmt)
        jobs = list(res.scalars().all())
        for job in jobs:
            if job.status == "RUNNING":
                try:
                    await self.get_tuning_job_status(db, tenant_id, job.id)
                except Exception as poll_err:
                    logger.warning("Failed to refresh running job %s: %s", job.id, poll_err)
        return jobs

    async def get_tuning_job_status(
        self,
        db: AsyncSession,
        tenant_id: str,
        job_id: str,
    ) -> Optional[TuningJobModel]:
        """
        Fetches status for a given tuning job, updating from Vertex AI if active.
        """
        stmt = select(TuningJobModel).where(
            TuningJobModel.tenant_id == tenant_id,
            TuningJobModel.id == job_id,
        )
        res = await db.execute(stmt)
        job = res.scalar_one_or_none()
        if not job:
            return None

        # If live client and job is still running, check remote status
        if self.genai_client and job.status == "RUNNING":
            try:
                remote_job = self.genai_client.tunings.get(name=job.job_name)
                state = getattr(remote_job, "state", None)
                if state:
                    state_str = str(state).upper()
                    if "SUCCEEDED" in state_str or "JOB_STATE_SUCCEEDED" in state_str:
                        job.status = "SUCCEEDED"
                    elif "FAILED" in state_str or "JOB_STATE_FAILED" in state_str:
                        job.status = "FAILED"
                    elif "CANCELLED" in state_str or "JOB_STATE_CANCELLED" in state_str:
                        job.status = "CANCELLED"
                    elif "RUNNING" in state_str or "JOB_STATE_RUNNING" in state_str:
                        job.status = "RUNNING"
                    else:
                        job.status = str(state)
                if hasattr(remote_job, "error") and remote_job.error:
                    job.error_message = str(remote_job.error)
                if hasattr(remote_job, "tuned_model") and getattr(remote_job.tuned_model, "model", None):
                    job.tuned_model_name = remote_job.tuned_model.model
                await db.commit()
                await db.refresh(job)
            except Exception as exc:
                logger.warning("Failed to refresh Vertex AI tuning status: %s", exc)

        return job

    @classmethod
    def get_supported_tuning_models(cls) -> List[Dict[str, Any]]:
        """
        Returns list of verified foundation models supported for Vertex AI Supervised Fine-Tuning in us-central1.
        """
        return SUPPORTED_TUNING_MODELS

    async def activate_tuned_model(
        self,
        db: AsyncSession,
        tenant_id: str,
        job_id: str,
    ) -> WorkspaceSettingsModel:
        """
        Activates a completed tuned model endpoint in tenant's workspace settings.
        """
        job = await self.get_tuning_job_status(db, tenant_id, job_id)
        if not job:
            raise ValueError(f"Tuning job {job_id} not found")
        if job.status not in ["SUCCEEDED", "COMPLETED"] and not job.tuned_model_name:
            raise ValueError(f"Tuning job {job_id} is not complete (status: {job.status})")

        settings = await PostgresService.update_workspace_settings(
            db,
            tenant_id=tenant_id,
            update_data=WorkspaceSettingsUpdate(
                active_tuned_model_id=job.tuned_model_name,
            ),
        )
        return settings

    async def cancel_tuning_job(
        self,
        db: AsyncSession,
        tenant_id: str,
        job_id: str,
    ) -> Optional[TuningJobModel]:
        """
        Cancels a running tuning job.
        """
        job = await self.get_tuning_job_status(db, tenant_id, job_id)
        if not job:
            return None
        if self.genai_client and job.status == "RUNNING":
            try:
                self.genai_client.tunings.cancel(name=job.job_name)
            except Exception as exc:
                logger.warning("Could not cancel remote Vertex AI tuning job: %s", exc)
        job.status = "CANCELLED"
        await db.commit()
        await db.refresh(job)
        return job
