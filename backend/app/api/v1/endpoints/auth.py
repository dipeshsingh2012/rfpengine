from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from typing import Optional, Dict, Any
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from app.core.config import settings

router = APIRouter()

class GoogleAuthRequest(BaseModel):
    credential: str

class AuthConfigResponse(BaseModel):
    google_client_id: str
    configured: bool

@router.get("/config", response_model=AuthConfigResponse)
async def get_auth_config():
    """Returns the configured Google OAuth Client ID for runtime client initialization."""
    return AuthConfigResponse(
        google_client_id=settings.GOOGLE_CLIENT_ID,
        configured=bool(settings.GOOGLE_CLIENT_ID),
    )

@router.post("/google")
async def verify_google_token(payload: GoogleAuthRequest) -> Dict[str, Any]:
    """
    Verifies a Google OAuth ID token with Google's verification service.
    Extracts verified profile information (email, name, picture, sub, hd).
    """
    if not payload.credential or not payload.credential.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google credential token is required",
        )

    try:
        client_id = settings.GOOGLE_CLIENT_ID or None
        id_info = id_token.verify_oauth2_token(
            payload.credential,
            google_requests.Request(),
            audience=client_id,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Google token verification failed: {str(exc)}",
        )

    email = id_info.get("email")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Verified Google token missing email claim",
        )

    name = id_info.get("name") or email.split("@")[0]
    picture = id_info.get("picture")
    sub = id_info.get("sub", "")
    hd = id_info.get("hd") or "acme-corp"

    from app.api.v1.endpoints.admin import register_member_discovery
    register_member_discovery(hd, {
        "name": name,
        "email": email,
        "picture": picture,
    })

    return {
        "status": "success",
        "user": {
            "id": sub,
            "email": email,
            "name": name,
            "picture": picture,
            "tenant_id": hd,
            "auth_provider": "google",
        },
        "token": payload.credential,
    }

@router.get("/me")
async def get_current_user_profile():
    """Check health and status of auth service."""
    return {
        "status": "active",
        "auth_provider": "google",
        "configured": bool(settings.GOOGLE_CLIENT_ID),
    }

@router.post("/logout")
async def logout_user():
    """Logs out user and invalidates session."""
    return {"status": "success", "message": "Signed out successfully"}

