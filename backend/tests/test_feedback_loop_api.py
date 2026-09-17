import pytest
from httpx import AsyncClient
from app.main import app

@pytest.mark.asyncio
async def test_feedback_loop_endpoint():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        response = await ac.post(
            "/api/v1/feedback",
            json={"user_id": "123", "feedback": "good"},
            headers={"X-Tenant-ID": "test_tenant"}
        )
    assert response.status_code in [200, 201]
