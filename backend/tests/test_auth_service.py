import pytest
from app.services.auth_service import AuthService

def test_password_hashing_and_verification():
    password = "secure_password_123"
    hashed = AuthService.get_password_hash(password)
    
    assert hashed != password
    assert AuthService.verify_password(password, hashed) is True
    assert AuthService.verify_password("wrong_password", hashed) is False

def test_create_access_token():
    data = {"sub": "user_123", "email": "user@example.com"}
    token = AuthService.create_access_token(data)
    
    assert isinstance(token, str)
    assert len(token) > 0

@pytest.mark.asyncio
async def test_get_current_user_from_token_valid():
    data = {"sub": "user_123", "email": "user@example.com"}
    token = AuthService.create_access_token(data)
    
    user = await AuthService.get_current_user_from_token(token)
    assert user["id"] == "user_123"
    assert user["email"] == "user@example.com"

@pytest.mark.asyncio
async def test_get_current_user_from_token_invalid():
    with pytest.raises(ValueError):
        await AuthService.get_current_user_from_token("invalid.token.string")

@pytest.mark.asyncio
async def test_stream_auth_logs():
    logs = ["log1", "log2", "log3"]
    gen = AuthService.stream_auth_logs(logs)
    
    results = []
    async for line in gen:
        results.append(line.strip())
    
    assert results == logs
