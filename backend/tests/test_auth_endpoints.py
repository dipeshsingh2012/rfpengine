import pytest
from unittest.mock import patch
from httpx import AsyncClient, ASGITransport
from app.main import app

def get_client() -> AsyncClient:
    return AsyncClient(
        transport=ASGITransport(app=app, raise_app_exceptions=False),
        base_url="http://test",
    )

@pytest.mark.asyncio
async def test_auth_config_endpoint():
    async with get_client() as ac:
        response = await ac.get("/api/v1/auth/config")
    assert response.status_code == 200
    data = response.json()
    assert "google_client_id" in data
    assert "configured" in data

@pytest.mark.asyncio
async def test_auth_google_missing_token():
    async with get_client() as ac:
        response = await ac.post("/api/v1/auth/google", json={"credential": ""})
    assert response.status_code in [400, 422]

@pytest.mark.asyncio
async def test_auth_google_invalid_token():
    async with get_client() as ac:
        response = await ac.post("/api/v1/auth/google", json={"credential": "invalid.mock.jwt"})
    assert response.status_code == 401
    assert "verification failed" in response.json()["detail"].lower()

@pytest.mark.asyncio
async def test_auth_google_successful_verification():
    mock_payload = {
        "sub": "google-user-12345",
        "email": "sarah.connor@acme-corp.com",
        "name": "Sarah Connor",
        "picture": "https://lh3.googleusercontent.com/a/mock-pic",
        "hd": "acme-corp.com",
    }
    with patch("google.oauth2.id_token.verify_oauth2_token", return_value=mock_payload):
        async with get_client() as ac:
            response = await ac.post(
                "/api/v1/auth/google",
                json={"credential": "valid.google.token"},
            )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert data["user"]["email"] == "sarah.connor@acme-corp.com"
        assert data["user"]["name"] == "Sarah Connor"
        assert data["user"]["picture"] == "https://lh3.googleusercontent.com/a/mock-pic"
        assert data["user"]["tenant_id"] == "acme-corp.com"
        assert data["user"]["auth_provider"] == "google"

@pytest.mark.asyncio
async def test_auth_me_and_logout():
    async with get_client() as ac:
        me_resp = await ac.get("/api/v1/auth/me")
        logout_resp = await ac.post("/api/v1/auth/logout")
    assert me_resp.status_code == 200
    assert logout_resp.status_code == 200
    assert logout_resp.json()["status"] == "success"
