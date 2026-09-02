import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from app.api.v1.endpoints.auth import router as auth_router


@pytest.fixture
def client():
    app = FastAPI()
    app.include_router(auth_router)
    return TestClient(app)


def test_google_sign_in_success(client):
    response = client.post(
        "/auth/google",
        json={"id_token": "mock-test-token-charlie"},
        headers={"X-Tenant-ID": "tenant-test"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "charlie@example.com"
    assert data["user"]["tenant_id"] == "tenant-test"


def test_google_sign_in_missing_id_token(client):
    response = client.post(
        "/auth/google",
        json={},
    )
    assert response.status_code == 422


def test_google_sign_in_invalid_token(client):
    response = client.post(
        "/auth/google",
        json={"id_token": "invalid_jwt_format_token"},
    )
    assert response.status_code == 401
    assert "Invalid" in response.json()["detail"] or "Failed" in response.json()["detail"]
