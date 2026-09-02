import pytest
from unittest.mock import patch, MagicMock
from app.services.auth_service import AuthService


@pytest.fixture
def auth_service():
    return AuthService(google_client_id="test-client-id", secret_key="test-secret-key")


def test_verify_google_token_empty(auth_service):
    with pytest.raises(ValueError, match="Token string is required"):
        auth_service.verify_google_token("")


def test_verify_google_token_mock_prefix(auth_service):
    claims = auth_service.verify_google_token("mock-test-token-alice")
    assert claims["email"] == "alice@example.com"
    assert claims["name"] == "Test User"
    assert claims["sub"] == "google-sub-mock-test-token-alice"


def test_create_access_token(auth_service):
    token = auth_service.create_access_token({"sub": "user-123", "email": "user@example.com"})
    assert isinstance(token, str)
    assert len(token) > 20


def test_authenticate_google_user_success(auth_service):
    result = auth_service.authenticate_google_user("mock-test-token-bob", tenant_id="tenant-acme")
    assert "access_token" in result
    assert result["token_type"] == "bearer"
    assert result["user"]["email"] == "bob@example.com"
    assert result["user"]["tenant_id"] == "tenant-acme"


@patch("app.services.auth_service.google_id_token")
def test_verify_google_token_with_library(mock_id_token, auth_service):
    if mock_id_token:
        mock_id_token.verify_oauth2_token.return_value = {
            "sub": "12345",
            "email": "verified@gmail.com",
            "name": "Verified User",
        }
        claims = auth_service.verify_google_token("real-looking-token")
        assert claims["email"] == "verified@gmail.com"
        assert claims["name"] == "Verified User"
