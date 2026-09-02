from typing import Optional
from fastapi import APIRouter, Header, HTTPException, status
from app.schemas.auth import GoogleAuthRequest, TokenResponse
from app.services.auth_service import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/google", response_model=TokenResponse, status_code=status.HTTP_200_OK)
def google_sign_in(
    payload: GoogleAuthRequest,
    x_tenant_id: Optional[str] = Header(None, alias="X-Tenant-ID"),
):
    """
    Authenticate user via Google Sign In ID Token.
    Accepts tenant identifier from request body or 'X-Tenant-ID' header.
    """
    effective_tenant_id = x_tenant_id or payload.tenant_id or "default"
    try:
        auth_result = auth_service.authenticate_google_user(
            id_token=payload.id_token,
            tenant_id=effective_tenant_id,
        )
        return auth_result
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Authentication processing error: {str(e)}",
        )
