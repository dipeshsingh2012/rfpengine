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

class SearchRequest(BaseModel):
    tenant_id: str = Field(min_length=1, default="default", description="Tenant identifier")
    question: str = Field(min_length=1, description="Question or RFP requirement to answer")
    top_k: int = Field(default=5, ge=1, le=50, description="Max number of source passages to retrieve")

class Source(BaseModel):
    id: str
    title: Optional[str] = ""
    content: str = ""
    category: Optional[str] = None
    is_golden_qa: Optional[bool] = False
    score: float = 0.0
    source_type: Optional[str] = "hybrid"
    source_file: Optional[str] = None
    page_number: Optional[int] = None
    metadata: Optional[Dict[str, Any]] = None
    question: Optional[str] = None
    answer: Optional[str] = None

    @model_validator(mode="before")
    @classmethod
    def sync_legacy_fields(cls, data: Any) -> Any:
        if isinstance(data, dict):
            title = data.get("title") or data.get("question") or ""
            content = data.get("content") or data.get("answer") or ""
            data["title"] = title
            data["content"] = content
            data["question"] = title
            data["answer"] = content
            if "category" in data and data["category"] == "Golden Q&A":
                data["is_golden_qa"] = True
            elif data.get("metadata") and data["metadata"].get("is_golden_qa") is True:
                data["is_golden_qa"] = True
        return data

class SearchResponse(BaseModel):
    suggested_answer: str
    confidence_score: float = Field(ge=0, le=1)
    sources: List[Source]

class KBEntryBase(BaseModel):
    title: str = Field(default="", description="Section header, topic, or document title")
    content: str = Field(default="", description="Passage text, policy clause, or documentation excerpt")
    category: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    question: Optional[str] = None
    answer: Optional[str] = None

    @model_validator(mode="before")
    @classmethod
    def sync_passage_and_qa(cls, data: Any) -> Any:
        if isinstance(data, dict):
            title = data.get("title") or data.get("question") or "Overview"
            content = data.get("content") or data.get("answer") or ""
            data["title"] = title
            data["content"] = content
            data["question"] = title
            data["answer"] = content
        return data

class KBEntryCreate(KBEntryBase):
    tenant_id: str = Field(min_length=1, default="default")
    user_id: Optional[str] = None
    id: Optional[str] = None

class KBEntryResponse(KBEntryBase):
    id: str
    tenant_id: str
    user_id: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
