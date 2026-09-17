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


@pytest.mark.asyncio
async def test_get_workspace_settings():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get(
            "/api/v1/responses/workspace/settings",
            headers={"X-Tenant-ID": "test_tenant"}
        )
    assert response.status_code == 200
    data = response.json()
    assert data["tenant_id"] == "test_tenant"
    assert "company_name" in data
    assert "default_model" in data


@pytest.mark.asyncio
async def test_update_workspace_settings():
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
