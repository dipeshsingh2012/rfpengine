import pytest
from typing import Any, AsyncGenerator, Dict, List, Optional
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_google_sign_in_success():
    payload = {
        "id_token": "valid-google-token:claire@corp.com:sub-333:Claire",
    }
    response = client.post(
        "/api/v1/auth/google",
        json=payload,
        headers={"X-Tenant-ID": "corp-tenant"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["tenant_id"] == "corp-tenant"
    assert data["user"]["email"] == "claire@corp.com"


def test_google_sign_in_invalid_token():
    payload = {
        "id_token": "malformed_or_invalid_google_token",
    }
    response = client.post(
        "/api/v1/auth/google",
        json=payload,
        headers={"X-Tenant-ID": "corp-tenant"},
    )
    assert response.status_code == 401
    assert "detail" in response.json()


def test_google_sign_in_missing_id_token():
    response = client.post(
        "/api/v1/auth/google",
        json={},
        headers={"X-Tenant-ID": "corp-tenant"},
    )
    assert response.status_code == 422


def test_google_sign_in_alias_endpoint():
    payload = {
        "id_token": "valid-google-token:alias@example.com:sub-444:Alias User",
    }
    response = client.post(
        "/auth/login/google",
        json=payload,
        headers={"X-Tenant-ID": "alias-tenant"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["tenant_id"] == "alias-tenant"
    assert data["user"]["email"] == "alias@example.com"
