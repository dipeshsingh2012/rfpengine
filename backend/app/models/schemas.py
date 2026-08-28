from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


# --- Search Schemas ---

class SearchRequest(BaseModel):
    tenant_id: str = Field(min_length=1, default="acme-corp", description="Tenant identifier")
    question: str = Field(min_length=1, description="Question text to answer")
    top_k: int = Field(default=5, ge=1, le=50, description="Max number of sources to retrieve")


class Source(BaseModel):
    id: str
    question: str
    answer: str
    score: float
    source_type: Optional[str] = "hybrid"  # "elasticsearch", "pinecone", "hybrid"


class SearchResponse(BaseModel):
    suggested_answer: str
    confidence_score: float = Field(ge=0, le=1)
    sources: List[Source]


# --- Knowledge Base Schemas ---

class KBEntryBase(BaseModel):
    question: str = Field(min_length=1)
    answer: str = Field(min_length=1)
    category: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class KBEntryCreate(KBEntryBase):
    tenant_id: str = Field(min_length=1, default="acme-corp")
    id: Optional[str] = None


class KBEntryUpdate(BaseModel):
    question: Optional[str] = None
    answer: Optional[str] = None
    category: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class KBEntryResponse(KBEntryBase):
    id: str
    tenant_id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class KBBatchImportRequest(BaseModel):
    tenant_id: str = Field(min_length=1, default="acme-corp")
    entries: List[KBEntryBase]


class KBUploadResponse(BaseModel):
    filename: str
    records_created: int
    tenant_id: str
    categories: List[str]
    preview: List[KBEntryResponse]


# --- Workspace & Review Schemas ---

class QuestionReviewItem(BaseModel):
    id: Optional[str] = None
    question_index: int
    question_text: str
    suggested_answer: Optional[str] = None
    final_answer: Optional[str] = None
    review_status: str = "Draft"
    assigned_role: Optional[str] = None
    confidence_score: Optional[float] = None
    sources: Optional[List[Dict[str, Any]]] = None


class WorkspaceCreate(BaseModel):
    id: str
    tenant_id: str = "acme-corp"
    title: str = "Imported Questionnaire"
    source_mode: str = "upload"  # "url", "upload", "extension"
    source_url: Optional[str] = None
    questions: List[QuestionReviewItem] = []


class WorkspaceResponse(BaseModel):
    id: str
    tenant_id: str
    title: str
    source_mode: str
    source_url: Optional[str]
    created_at: datetime
    updated_at: datetime
    questions: List[QuestionReviewItem]

    model_config = ConfigDict(from_attributes=True)


class QuestionReviewUpdate(BaseModel):
    final_answer: Optional[str] = None
    review_status: Optional[str] = None
    assigned_role: Optional[str] = None


# --- Health & Diagnostic Schemas ---

class HealthServiceStatus(BaseModel):
    status: str
    latency_ms: Optional[float] = None
    details: Optional[str] = None


class HealthResponse(BaseModel):
    status: str
    version: str
    services: Dict[str, HealthServiceStatus]

