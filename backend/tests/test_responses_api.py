import pytest
from httpx import AsyncClient
from app.main import app

@pytest.mark.asyncio
async def test_responses_history_endpoint():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        response = await ac.get(
            "/api/v1/responses/history",
            headers={"X-Tenant-ID": "test_tenant"}
        )
    assert response.status_code in [200, 401]
