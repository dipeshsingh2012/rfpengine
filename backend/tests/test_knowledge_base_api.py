import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_knowledge_base_retrieval():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get(
            "/api/v1/knowledge/search?q=test",
            headers={"X-Tenant-ID": "test_tenant"}
        )
    assert response.status_code in [200, 404]
