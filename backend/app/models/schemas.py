from pydantic import BaseModel, EmailStr
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

class UserCreate(UserBase):
    pass

class User(UserBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class SearchRequest(BaseModel):
    query: str

class Source(BaseModel):
    url: str
    title: Optional[str] = None
    
    def sync_legacy_fields(self):
        pass

class SearchResponse(BaseModel):
    results: List[Source]

class KBEntryBase(BaseModel):
    title: str
    content: str

    def sync_passage_and_qa(self):
        pass
