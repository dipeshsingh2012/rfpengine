import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

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

