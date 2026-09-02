import pytest
from httpx import AsyncClient
from fastapi import FastAPI
from app.api.v1.endpoints.auth import router, MOCK_USER_DB

# Setup a minimal app for testing endpoints
app = FastAPI()
app.include_router(router)

@pytest.fixture(autouse=True)
def clear_mock_db():
    """Clears the mock database before every test."""
    MOCK_USER_DB.clear()

@pytest.mark.asyncio
async def test_register_and_login_success():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        tenant_id = "tenant_abc"
        payload = {
            "email": "user@example.com",
            "password": "password123",
            "full_name": "Test User"
        }
        headers = {"X-Tenant-ID": tenant_id}

        # 1. Test Registration
        reg_resp = await ac.post("/register", json=payload, headers=headers)
        assert reg_resp.status_code == 200
        assert "access_token" in reg_resp.json()

        # 2. Test Login
        login_resp = await ac.post("/login", json=payload, headers=headers)
        assert login_resp.status_code == 200
        assert login_resp.json()["access_token"] != ""

@pytest.mark.asyncio
async def test_login_wrong_tenant():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        payload = {"email": "user@example.com", "password": "password123"}
        
        # Register with tenant A
        await ac.post("/register", json=payload, headers={"X-Tenant-ID": "tenant_A"})
        
        # Attempt login with tenant B
        login_resp = await ac.post("/login", json=payload, headers={"X-Tenant-ID": "tenant_B"})
        assert login_resp.status_code == 401

@pytest.mark.asyncio
async def test_register_duplicate_email():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        payload = {"email": "dup@example.com", "password": "password123"}
        headers = {"X-Tenant-ID": "tenant_1"}
        
        await ac.post("/register", json=payload, headers=headers)
        dup_resp = await ac.post("/register", json=payload, headers=headers)
        assert dup_resp.status_code == 400
