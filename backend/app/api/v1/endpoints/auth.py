from typing import Any, AsyncGenerator, Dict, Iterator, List, Optional
from fastapi import APIRouter, Header, HTTPException, status
from app.schemas.auth import GoogleAuthRequest, Token
from app.services.auth_service import authenticate_google_user, auth_service

router = APIRouter()


@router.post("/google", response_model=Token, status_code=status.HTTP_200_OK)
def google_sign_in(
    request: GoogleAuthRequest,
    x_tenant_id: Optional[str] = Header(None, alias="X-Tenant-ID"),
) -> Token:
    """
    Authenticate user via Google OAuth ID Token and issue access token.
    Enforces tenant context via X-Tenant-ID header or request body.
    """
    effective_tenant = x_tenant_id or request.tenant_id or "default"
    try:
        result = auth_service.authenticate_google(
            id_token=request.id_token,
            tenant_id=effective_tenant,
        )
        return Token(**result)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
        ) from e


@router.post("/login/google", response_model=Token, status_code=status.HTTP_200_OK)
def login_google_alias(
    request: GoogleAuthRequest,
    x_tenant_id: Optional[str] = Header(None, alias="X-Tenant-ID"),
) -> Token:
    """Alias route for google sign-in."""
    return google_sign_in(request=request, x_tenant_id=x_tenant_id)
