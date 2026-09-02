from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    tenant_id: str  # CRITICAL: Enforced in schema

class UserCreate(UserBase):
    pass

class User(UserBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class KBEntryBase(BaseModel):
    title: str
    content: str
    tenant_id: str  # CRITICAL: Enforced in schema

class KBEntryCreate(KBEntryBase):
    user_id: Optional[int] = None

class KBEntryResponse(KBEntryBase):
    id: int
    user_id: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True
