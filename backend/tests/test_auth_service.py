import pytest
from app.services.auth_service import AuthService

def test_password_hashing():
    password = "secure_password_123"
    hashed = AuthService.get_password_hash(password)
    assert hashed != password
    assert AuthService.verify_password(password, hashed) is True
    assert AuthService.verify_password("wrong_password", hashed) is False

def test_create_access_token():
    data = {"sub": "test@example.com", "tenant_id": "tenant_1"}
    token = AuthService.create_access_token(data)
    assert isinstance(token, str)
    
    decoded = AuthService.decode_token(token)
    assert decoded["sub"] == "test@example.com"
    assert decoded["tenant_id"] == "tenant_1"

def test_decode_invalid_token():
    assert AuthService.decode_token("invalid.token.string") is None
