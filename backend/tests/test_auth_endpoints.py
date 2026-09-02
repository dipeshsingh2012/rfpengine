import pytest
from httpx import AsyncClient
from fastapi import FastAPI
from app.api.v1.endpoints.auth import router

# Create a minimal app instance for testing the router in isolation
# This prevents collection errors if the main app is not fully configured
app = FastAPI()
app.include_router(router, prefix="/auth")

@pytest.mark.asyncio
async def test_login_success():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        # Using the mock credentials defined in the endpoint
        payload = {
            "email": "test@example.com",
            "password": "password123"
        }
        response = await ac.post("/auth/login", json=payload)
    
    assert response.status_code == 200
    assert "access_token" in response.json()
    assert response.json()["token_type"] == "bearer"

@pytest.mark.asyncio
async def test_login_failure_wrong_password():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        payload = {
            "email": "test@example.com",
            "password": "wrongpassword"
        }
        response = await ac.post("/auth/login", json=payload)
    
    assert response.status_code == 401
    assert response.json()["detail"] == "Incorrect email or password"

@pytest.mark.asyncio
async def test_login_failure_wrong_email():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        payload = {
            "email": "notfound@example.com",
            "password": "password123"
        }
        response = await ac.post("/auth/login", json=payload)
    
    assert response.status_code == 401
