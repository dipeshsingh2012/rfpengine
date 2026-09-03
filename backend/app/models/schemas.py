from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
    tenant_id: Optional[str] = None

class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    tenant_id: str = Field(min_length=1, default="default")

class UserCreate(UserBase):
    pass

class UserResponse(UserBase):
    id: str
    google_id: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class KBEntryBase(BaseModel):
    title: str = Field(default="", description="Section header or title")
    content: str = Field(default="", description="Passage text or content")
    category: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class KBEntryCreate(KBEntryBase):
    tenant_id: str = Field(min_length=1, default="default")
    user_id: Optional[str] = None

class KBEntryResponse(KBEntryBase):
    id: str
    tenant_id: str
    user_id: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
