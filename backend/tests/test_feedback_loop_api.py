import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_feedback_loop_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post(
            "/api/v1/feedback",
            json={"user_id": "123", "feedback": "good"},
            headers={"X-Tenant-ID": "test_tenant"}
        )
    assert response.status_code in [200, 201]
