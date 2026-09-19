import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.db import close_db_connection

@pytest.fixture(autouse=True)
async def cleanup_db():
    yield
    await close_db_connection()

@pytest.mark.asyncio
async def test_responses_history_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get(
            "/api/v1/responses/history",
            headers={"X-Tenant-ID": "test_tenant"}
        )
    assert response.status_code in [200, 401]

@pytest.mark.asyncio
async def test_add_response_history_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post(
            "/api/v1/responses/history",
            json={"id": "test-rfp-1", "title": "Test RFP", "questionsCount": 5},
            headers={"X-Tenant-ID": "test_tenant"}
        )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert len(data["history"]) > 0


from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch
from app.models.db_models import WorkspaceSettingsModel
from app.services.postgres_service import PostgresService

@pytest.mark.asyncio
async def test_get_workspace_settings():
    mock_settings = WorkspaceSettingsModel(
        tenant_id="test_tenant",
        company_name="Acme Corp",
        industry="Technology",
        admin_email="admin@example.com",
        company_context="B2B SaaS",
        disclaimer="Standard disclaimer",
        default_model="gemini-2.5-flash",
        response_tone="balanced",
        default_top_k=5,
        auto_promote_golden_qa=False,
        sme_roles_config={},
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    with patch.object(PostgresService, "get_workspace_settings", new=AsyncMock(return_value=mock_settings)):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            response = await ac.get(
                "/api/v1/responses/workspace/settings",
                headers={"X-Tenant-ID": "test_tenant"}
            )
            response2 = await ac.get(
                "/api/v1/responses/settings?tenant_id=test_tenant",
            )
        assert response.status_code == 200
        assert response2.status_code == 200
        data = response.json()
        assert data["tenant_id"] == "test_tenant"
        assert "company_name" in data
        assert "default_model" in data


@pytest.mark.asyncio
async def test_update_workspace_settings():
    mock_updated = WorkspaceSettingsModel(
        tenant_id="test_tenant",
        company_name="Updated Enterprise Corp",
        industry="Technology",
        admin_email="admin@example.com",
        company_context="B2B SaaS",
        disclaimer="Standard disclaimer",
        default_model="gemini-2.5-flash",
        response_tone="thorough",
        default_top_k=7,
        auto_promote_golden_qa=False,
        sme_roles_config={},
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    with patch.object(PostgresService, "update_workspace_settings", new=AsyncMock(return_value=mock_updated)):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            response = await ac.put(
                "/api/v1/responses/workspace/settings",
                json={
                    "company_name": "Updated Enterprise Corp",
                    "default_model": "gemini-2.5-flash",
                    "response_tone": "thorough",
                    "default_top_k": 7
                },
                headers={"X-Tenant-ID": "test_tenant"}
            )
        assert response.status_code == 200
        data = response.json()
        assert data["company_name"] == "Updated Enterprise Corp"
        assert data["response_tone"] == "thorough"
        assert data["default_top_k"] == 7
