import pytest
from datetime import timedelta
from app.services.auth_service import AuthService

def test_password_hashing_and_verification():
    password = "secure_password_123"
    hashed = AuthService.get_password_hash(password)
    
    assert hashed != password
    assert AuthService.verify_password(password, hashed) is True
    assert AuthService.verify_password("wrong_password", hashed) is False

def test_create_access_token():
    data = {"sub": "test_user"}
    token = AuthService.create_access_token(data=data)
    
    assert isinstance(token, str)
    
    decoded = AuthService.decode_token(token)
    assert decoded["sub"] == "test_user"
    assert "exp" in decoded

def test_decode_invalid_token():
    decoded = AuthService.decode_token("invalid.token.string")
    assert decoded == {}
