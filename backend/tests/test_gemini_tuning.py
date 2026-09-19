import pytest
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

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
    assert "system_instruction" in ex
    assert "contents" in ex
    assert "parts" in ex["system_instruction"]
    assert "Acme Corp" in ex["system_instruction"]["parts"][0]["text"]
    assert len(ex["contents"]) == 2
    assert ex["contents"][0]["role"] == "user"
    assert "SAML 2.0" in ex["contents"][0]["parts"][0]["text"]
    assert ex["contents"][1]["role"] == "model"
    assert "Yes, Acme Corporation" in ex["contents"][1]["parts"][0]["text"]


@pytest.mark.asyncio
async def test_tuning_dataset_preview_endpoint():
    mock_preview = TuningDatasetPreviewResponse(
        total_pairs=12,
        golden_qa_count=8,
        approved_reviews_count=4,
        sample_pairs=[
            {
                "system_instruction": {
                    "parts": [{"text": "You are the AI Proposal Drafter..."}]
                },
                "contents": [
                    {"role": "user", "parts": [{"text": "What encryption standard is used at rest?"}]},
                    {"role": "model", "parts": [{"text": "All data at rest is encrypted using AES-256."}]},
                ],
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
        base_model="gemini-2.5-flash",
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
                    "base_model": "gemini-2.5-flash",
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
            assert created_data["base_model"] == "gemini-2.5-flash"
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


@pytest.mark.asyncio
async def test_gemini_tuning_service_gcs_upload_and_vertex_tune():
    service = GeminiTuningService()

    mock_db = AsyncMock()
    mock_db.add = MagicMock()
    mock_db.commit = AsyncMock()
    mock_db.refresh = AsyncMock()

    mock_blob = MagicMock()
    mock_bucket = MagicMock()
    mock_bucket.blob.return_value = mock_blob
    mock_storage = MagicMock()
    mock_storage.bucket.return_value = mock_bucket
    service.storage_client = mock_storage

    mock_tune_result = MagicMock()
    mock_tune_result.name = "projects/test/locations/us-central1/tuningJobs/tune-test"
    mock_tune_result.tuned_model = MagicMock(model="projects/test/locations/us-central1/models/tuned-test")
    mock_genai = MagicMock()
    mock_genai.tunings.tune.return_value = mock_tune_result
    service.genai_client = mock_genai

    mock_dataset = [
        {"messages": [{"role": "system", "content": "test"}, {"role": "user", "content": "q"}, {"role": "model", "content": "a"}]}
    ]

    with patch.object(service, "extract_tuning_dataset", new=AsyncMock(return_value=mock_dataset)):
        req = TuningJobCreate(
            base_model="gemini-2.5-flash",
            epochs=3,
            learning_rate_multiplier=1.0,
            include_golden_qa=True,
            include_approved_reviews=True,
        )
        job = await service.create_tuning_job(mock_db, "acme-corp", req)

        assert job.status == "RUNNING"
        assert job.job_name == "projects/test/locations/us-central1/tuningJobs/tune-test"
        assert job.tuned_model_name == "projects/test/locations/us-central1/models/tuned-test"
        assert mock_blob.upload_from_string.called
        assert mock_genai.tunings.tune.called
        _, kwargs = mock_genai.tunings.tune.call_args
        assert kwargs["base_model"] in ("gemini-2.5-flash", "publishers/google/models/gemini-2.5-flash")
        assert hasattr(kwargs["training_dataset"], "gcs_uri") or isinstance(kwargs["training_dataset"], str)


@pytest.mark.asyncio
async def test_gemini_tuning_service_unsupported_model_validation():
    service = GeminiTuningService()
    mock_db = AsyncMock()

    mock_dataset = [
        {"messages": [{"role": "system", "content": "test"}, {"role": "user", "content": "q"}, {"role": "model", "content": "a"}]}
    ]

    with patch.object(service, "extract_tuning_dataset", new=AsyncMock(return_value=mock_dataset)):
        req = TuningJobCreate(
            base_model="gemini-1.5-flash-002",  # Deprecated / unsupported
            epochs=3,
        )
        with pytest.raises(ValueError, match="is not supported for Vertex AI Supervised Fine-Tuning"):
            await service.create_tuning_job(mock_db, "acme-corp", req)


@pytest.mark.asyncio
async def test_gemini_tuning_service_error_handling_no_fallback():
    service = GeminiTuningService()

    mock_db = AsyncMock()
    mock_db.add = MagicMock()
    mock_db.commit = AsyncMock()

    mock_blob = MagicMock()
    mock_bucket = MagicMock()
    mock_bucket.blob.return_value = mock_blob
    mock_storage = MagicMock()
    mock_storage.bucket.return_value = mock_bucket
    service.storage_client = mock_storage

    mock_genai = MagicMock()
    mock_genai.tunings.tune.side_effect = Exception("400 INVALID_ARGUMENT: Base model not supported")
    service.genai_client = mock_genai

    mock_dataset = [
        {"messages": [{"role": "system", "content": "test"}, {"role": "user", "content": "q"}, {"role": "model", "content": "a"}]}
    ]

    with patch.object(service, "extract_tuning_dataset", new=AsyncMock(return_value=mock_dataset)):
        req = TuningJobCreate(
            base_model="gemini-2.5-flash",
            epochs=3,
        )
        with pytest.raises(RuntimeError, match="Vertex AI tuning initiation failed"):
            await service.create_tuning_job(mock_db, "acme-corp", req)

        assert mock_db.add.called
        saved_job = mock_db.add.call_args[0][0]
        assert saved_job.status == "FAILED"
        assert "400 INVALID_ARGUMENT" in saved_job.error_message


@pytest.mark.asyncio
async def test_tuning_supported_models_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/v1/tuning/supported-models")
        assert response.status_code == 200
        models = response.json()
        assert len(models) >= 4
        ids = [m["id"] for m in models]
        assert "gemini-2.5-flash" in ids
        assert "gemini-2.5-pro" in ids
        assert "gemini-2.5-flash-lite" in ids
        assert "gemini-3.1-flash-lite" in ids
        assert "gemini-3.5-flash" in ids
        # Check recommendation
        flash_model = next(m for m in models if m["id"] == "gemini-2.5-flash")
        assert flash_model["recommended"] is True


@pytest.mark.asyncio
async def test_delete_tuning_job_endpoint():
    with patch.object(GeminiTuningService, "delete_tuning_job", new=AsyncMock(return_value=True)):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            res = await ac.delete(
                "/api/v1/tuning/jobs/tune-12345",
                headers={"X-Tenant-ID": "acme-corp"},
            )
            assert res.status_code == 204


