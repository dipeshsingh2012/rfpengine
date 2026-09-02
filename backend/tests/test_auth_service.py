from datetime import timedelta
import pytest
from typing import Any, AsyncGenerator, Dict, List, Optional
from app.services.auth_service import (
    AuthService,
    authenticate_google_user,
    create_access_token,
    sanitize_input,
    verify_google_token,
)
import jwt


def test_sanitize_input():
    assert sanitize_input("=SUM(A1)") == "'=SUM(A1)"
    assert sanitize_input("+123") == "'+123"
    assert sanitize_input("-test") == "'-test"
    assert sanitize_input("@admin") == "'@admin"
    assert sanitize_input("regular_user") == "regular_user"
    assert sanitize_input(None) == ""


def test_verify_google_token_empty():
    with pytest.raises(ValueError, match="Token must not be empty"):
        verify_google_token("")


def test_verify_google_token_invalid():
    with pytest.raises(ValueError, match="Invalid Google token"):
        verify_google_token("definitely-invalid-token")


def test_verify_google_token_mock_success():
    token = "valid-google-token:alice@example.com:sub-100:Alice Smith"
    payload = verify_google_token(token)
    assert payload["email"] == "alice@example.com"
    assert payload["sub"] == "sub-100"
    assert payload["name"] == "Alice Smith"


def test_create_access_token():
    payload = {"sub": "user-123", "tenant_id": "tenant-abc"}
    token = create_access_token(payload, expires_delta=timedelta(minutes=15))
    assert isinstance(token, str)

    decoded = jwt.decode(token, options={"verify_signature": False})
    assert decoded["sub"] == "user-123"
    assert decoded["tenant_id"] == "tenant-abc"
    assert "exp" in decoded


def test_authenticate_google_user_success():
    token = "valid-google-token:bob@tenant.com:sub-999:Bob Developer"
    auth_result = authenticate_google_user(token, tenant_id="tenant-acme")
    assert "access_token" in auth_result
    assert auth_result["tenant_id"] == "tenant-acme"
    assert auth_result["user"]["email"] == "bob@tenant.com"
    assert auth_result["user"]["tenant_id"] == "tenant-acme"


def test_auth_service_class():
    service = AuthService()
    token = "valid-google-token:test@example.com:sub-555:Test User"
    res = service.authenticate_google(token, tenant_id="t-1")
    assert res["tenant_id"] == "t-1"
    assert res["user"]["email"] == "test@example.com"
