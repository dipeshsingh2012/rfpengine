import pytest
from app.services.auth_service import AuthService

def test_verify_token_valid():
    user = AuthService.verify_token("valid_token")
    assert user is not None
    assert user["sub"] == "user_123"

def test_verify_token_invalid():
    user = AuthService.verify_token("invalid_token")
    assert user is None

def test_generate_token():
    token = AuthService.generate_token("user_123")
    assert "user_123" in token
