import pytest
from unittest.mock import MagicMock, patch
from backend.app.core.security import create_access_token, verify_token
from backend.app.services.auth_service import AuthService

def test_jwt_lifecycle():
    data = {"email": "test@example.com"}
    token = create_access_token(data=data)
    payload = verify_token(token)
    assert payload["email"] == "test@example.com"

@pytest.mark.asyncio
@patch("google.oauth2.id_token.verify_oauth2_token")
async def test_verify_google_token_success(mock_verify):
    # Mock successful Google verification
    mock_verify.return_value = {
        "email": "test@example.com",
        "sub": "123456789",
        "name": "Test User"
    }
    
    from google.auth.transport import requests as google_requests
    result = await AuthService.verify_google_id_token("fake_token")
    
    assert result["email"] == "test@example.com"
    assert result["sub"] == "123456789"

@pytest.mark.asyncio
@patch("google.oauth2.id_token.verify_oauth2_token")
async def test_verify_google_token_failure(mock_verify):
    # Mock failed verification
    mock_verify.side_effect = ValueError("Invalid token")
    
    from google.auth.transport import requests as google_requests
    result = await AuthService.verify_google_id_token("invalid_token")
    
    assert result == {}

@pytest.mark.asyncio
async def test_get_or_create_user(mocker):
    # Mock DB Session and User model
    mock_db = MagicMock()
    mock_user = MagicMock()
    mock_user.email = "test@example.com"
    mock_user.google_id = None
    
    # Mock query behavior: user exists but no google_id
    mock_db.query.return_value.filter.return_value.first.return_value = mock_user
    
    google_info = {
        "email": "test@example.com",
        "sub": "123456789",
        "name": "Test User"
    }
    
    user = await AuthService.get_or_create_user(mock_db, google_info)
    
    assert user.email == "test@example.com"
    assert mock_db.commit.called
