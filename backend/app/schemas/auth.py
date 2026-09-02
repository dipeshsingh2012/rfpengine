from typing import Any, AsyncGenerator, Dict, List, Optional
from pydantic import BaseModel, EmailStr, Field


class GoogleAuthRequest(BaseModel):
    id_token: str = Field(..., description="Google OAuth ID token")
    tenant_id: Optional[str] = Field(None, description="Optional Tenant ID override")


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    tenant_id: Optional[str] = None
    user: Optional[Dict[str, Any]] = None


class UserProfile(BaseModel):
    sub: str
    email: EmailStr
    name: Optional[str] = None
    picture: Optional[str] = None
    tenant_id: Optional[str] = None
