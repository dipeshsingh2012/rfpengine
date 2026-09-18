import pytest
from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch

from httpx import ASGITransport, AsyncClient

from app.core.db import close_db_connection
from app.main import app
from app.models.db_models import (
    KBEntryModel,
    QuestionReviewModel,
    ResponseWorkspace,
    TuningJobModel,
    WorkspaceSettingsModel,
)
from app.models.schemas import TuningDatasetPreviewResponse, TuningJobCreate
from app.services.gemini_tuning_service import GeminiTuningService


@pytest.fixture(autouse=True)
async def cleanup_db():
    yield
    await close_db_connection()


def test_format_tuning_example():
    ex = GeminiTuningService.format_tuning_example(
        question="Do you support SAML 2.0 SSO?",
        answer="Yes, Acme Corporation supports SAML 2.0 with Okta, Azure AD, and Ping.",
        company_name="Acme Corp",
    )
    assert "messages" in ex
    assert len(ex["messages"]) == 3
    assert ex["messages"][0]["role"] == "system"
    assert "Acme Corp" in ex["messages"][0]["content"]
    assert ex["messages"][1]["role"] == "user"
    assert "SAML 2.0" in ex["messages"][1]["content"]
    assert ex["messages"][2]["role"] == "model"
    assert "Yes, Acme Corporation" in ex["messages"][2]["content"]


@pytest.mark.asyncio
async def test_tuning_dataset_preview_endpoint():
    mock_preview = TuningDatasetPreviewResponse(
        total_pairs=12,
        golden_qa_count=8,
        approved_reviews_count=4,
        sample_pairs=[
            {
                "messages": [
                    {"role": "system", "content": "You are the AI Proposal Drafter..."},
                    {"role": "user", "content": "What encryption standard is used at rest?"},
                    {"role": "model", "content": "All data at rest is encrypted using AES-256."},
                ]
            }
        ],
    )
    with patch.object(GeminiTuningService, "get_dataset_preview", new=AsyncMock(return_value=mock_preview)):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            response = await ac.get(
                "/api/v1/tuning/dataset-preview",
                headers={"X-Tenant-ID": "acme-corp"},
            )
        assert response.status_code == 200
        data = response.json()
        assert data["total_pairs"] == 12
        assert data["golden_qa_count"] == 8
        assert data["approved_reviews_count"] == 4
        assert len(data["sample_pairs"]) == 1


@pytest.mark.asyncio
async def test_create_and_list_tuning_jobs():
    mock_job = TuningJobModel(
        id="tune-12345",
        tenant_id="acme-corp",
        job_name="projects/test/locations/us-central1/tuningJobs/tune-12345",
        base_model="gemini-1.5-flash-002",
        tuned_model_name="projects/test/locations/us-central1/models/tuned-12345",
        status="SUCCEEDED",
        training_dataset_uri="gs://bucket/tuning/dataset.jsonl",
        dataset_examples_count=15,
        epochs=4,
        learning_rate_multiplier=1.0,
        metrics={"train_loss": 0.25, "eval_loss": 0.28, "step": 60},
        error_message=None,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )

    with patch.object(GeminiTuningService, "create_tuning_job", new=AsyncMock(return_value=mock_job)), \
         patch.object(GeminiTuningService, "list_tuning_jobs", new=AsyncMock(return_value=[mock_job])):

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            # 1. Create job
            res_create = await ac.post(
                "/api/v1/tuning/jobs",
                json={
                    "base_model": "gemini-1.5-flash-002",
                    "epochs": 4,
                    "learning_rate_multiplier": 1.0,
                    "include_golden_qa": True,
                    "include_approved_reviews": True,
                },
                headers={"X-Tenant-ID": "acme-corp"},
            )
            assert res_create.status_code == 201
            created_data = res_create.json()
            assert created_data["id"] == "tune-12345"
            assert created_data["base_model"] == "gemini-1.5-flash-002"
            assert created_data["status"] == "SUCCEEDED"

            # 2. List jobs
            res_list = await ac.get(
                "/api/v1/tuning/jobs",
                headers={"X-Tenant-ID": "acme-corp"},
            )
            assert res_list.status_code == 200
            list_data = res_list.json()
            assert len(list_data) == 1
            assert list_data[0]["id"] == "tune-12345"


@pytest.mark.asyncio
async def test_activate_tuned_model_endpoint():
    mock_settings = WorkspaceSettingsModel(
        tenant_id="acme-corp",
        company_name="Acme Corp",
        industry="Enterprise SaaS",
        admin_email="admin@acme.corp",
        company_context="Enterprise SaaS",
        disclaimer="Confidential",
        default_model="gemini-2.5-flash",
        response_tone="concise",
        default_top_k=5,
        auto_promote_golden_qa=True,
        sme_roles_config={},
        active_tuned_model_id="projects/test/locations/us-central1/models/tuned-12345",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )

    with patch.object(GeminiTuningService, "activate_tuned_model", new=AsyncMock(return_value=mock_settings)):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            res = await ac.post(
                "/api/v1/tuning/jobs/tune-12345/activate",
                headers={"X-Tenant-ID": "acme-corp"},
            )
            assert res.status_code == 200
            data = res.json()
            assert data["active_tuned_model_id"] == "projects/test/locations/us-central1/models/tuned-12345"


@pytest.mark.asyncio
async def test_search_endpoint_with_tuned_model_routing():
    mock_settings = WorkspaceSettingsModel(
        tenant_id="acme-corp",
        company_name="Acme Corp",
        industry="Enterprise SaaS",
        admin_email="admin@acme.corp",
        company_context="Enterprise SaaS",
        disclaimer="Confidential",
        default_model="gemini-2.5-flash",
        response_tone="concise",
        default_top_k=5,
        auto_promote_golden_qa=True,
        sme_roles_config={},
        active_tuned_model_id="projects/test/locations/us-central1/models/tuned-12345",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )

    with patch("app.services.postgres_service.PostgresService.get_workspace_settings", new=AsyncMock(return_value=mock_settings)):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            res = await ac.post(
                "/api/v1/search",
                json={
                    "tenant_id": "acme-corp",
                    "question": "Does Acme support SOC 2 Type II compliance?",
                    "top_k": 3,
                },
                headers={"X-Tenant-ID": "acme-corp"},
            )
            assert res.status_code == 200
            data = res.json()
            assert "suggested_answer" in data
            assert data["confidence_score"] > 0
