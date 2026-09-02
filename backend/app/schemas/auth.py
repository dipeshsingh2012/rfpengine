from typing import Optional
from pydantic import BaseModel, EmailStr, Field


class GoogleAuthRequest(BaseModel):
    id_token: str = Field(..., description="Google ID Token (JWT) provided by Google Identity Services")
    tenant_id: Optional[str] = Field(None, description="Optional tenant identifier")


class UserResponse(BaseModel):
    id: str
    email: EmailStr
    name: Optional[str] = None
    picture: Optional[str] = None
    tenant_id: Optional[str] = "default"


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
