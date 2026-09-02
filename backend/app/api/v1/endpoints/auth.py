from fastapi import APIRouter, Depends, HTTPException, status, Header
from typing import Optional, Dict, Any
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])

@router.get("/verify")
def verify_auth(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    if not authorization:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing authorization header")
    
    token = authorization.replace("Bearer ", "")
    user = AuthService.verify_token(token)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    return {"status": "success", "user": user}
