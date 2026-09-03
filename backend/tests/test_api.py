import pytest
from httpx import AsyncClient
from app.main import app

@pytest.mark.asyncio
async def test_export_csv_success():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        headers = {"X-Tenant-ID": "tenant_123"}
        response = await ac.get("/api/v1/export/csv", headers=headers)
    
    assert response.status_code == 200
    assert response.headers["content-type"] == "text/csv"
    assert "attachment; filename=export_tenant_123.csv" in response.headers["content-disposition"]
    assert "'=SUM(1,2)" in response.text

@pytest.mark.asyncio
async def test_export_csv_missing_tenant():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        response = await ac.get("/api/v1/export/csv")
    
    assert response.status_code == 422  # Unprocessable Entity due to missing header
