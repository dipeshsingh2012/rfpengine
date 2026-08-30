from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field, model_validator


# --- Search Schemas ---

class SearchRequest(BaseModel):
    tenant_id: str = Field(min_length=1, default="acme-corp", description="Tenant identifier")
    question: str = Field(min_length=1, description="Question or RFP requirement to answer")
    top_k: int = Field(default=5, ge=1, le=50, description="Max number of source passages to retrieve")


class Source(BaseModel):
    id: str
    title: Optional[str] = ""
    content: str = ""
    category: Optional[str] = None
    is_golden_qa: Optional[bool] = False
    score: float = 0.0
    source_type: Optional[str] = "hybrid"  # "elasticsearch", "pinecone", "hybrid"
    source_file: Optional[str] = None
    page_number: Optional[int] = None
    metadata: Optional[Dict[str, Any]] = None
    # Optional legacy alias fields
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


# --- Knowledge Base Passage Schemas ---

class KBEntryBase(BaseModel):
    title: str = Field(default="", description="Section header, topic, or document title")
    content: str = Field(default="", description="Passage text, policy clause, or documentation excerpt")
    category: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    # Backward compatibility aliases
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
    tenant_id: str = Field(min_length=1, default="acme-corp")
    id: Optional[str] = None


class KBEntryUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    question: Optional[str] = None
    answer: Optional[str] = None
    category: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

    @model_validator(mode="before")
    @classmethod
    def sync_update_fields(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "question" in data and "title" not in data:
                data["title"] = data["question"]
            elif "title" in data and "question" not in data:
                data["question"] = data["title"]
            if "answer" in data and "content" not in data:
                data["content"] = data["answer"]
            elif "content" in data and "answer" not in data:
                data["answer"] = data["content"]
        return data


class KBEntryResponse(KBEntryBase):
    id: str
    tenant_id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class KBBatchImportRequest(BaseModel):
    tenant_id: str = Field(min_length=1, default="acme-corp")
    entries: List[KBEntryCreate]


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
    is_promoted_to_kb: bool = False
    promoted_kb_id: Optional[str] = None


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


class KBPromoteResponse(BaseModel):
    success: bool = True
    message: str
    kb_entry_id: str
    workspace_id: str
    question_index: int
    category: str = "Golden Q&A"
    review: QuestionReviewItem


# --- Health & Diagnostic Schemas ---

class HealthServiceStatus(BaseModel):
    status: str
    latency_ms: Optional[float] = None
    details: Optional[str] = None


class HealthResponse(BaseModel):
    status: str
    version: str
    environment: str = "local"
    services: Dict[str, HealthServiceStatus]


# --- Roadmap & Product Discovery Schemas ---

class RICEScoreSchema(BaseModel):
    reach: int = Field(default=50, ge=1, le=100)
    impact: int = Field(default=3, ge=1, le=4)
    confidence: int = Field(default=80, ge=10, le=100)
    effort: int = Field(default=3, ge=1, le=20)
    score: float = 40.0


class RoadmapInitiativeBase(BaseModel):
    title: str = Field(min_length=1)
    stage: str = Field(default="discovery")  # "discovery", "spec", "development", "beta", "shipped"
    theme: str = Field(default="Core AI & Retrieval")
    priority: str = Field(default="P1 - High")
    target_persona: str = Field(default="Proposal Manager")
    quarter: str = Field(default="In Discovery")
    summary: str = Field(default="")
    problem_statement: str = Field(default="")
    user_story: str = Field(default="")
    success_metrics: List[str] = Field(default_factory=list)
    acceptance_criteria: List[str] = Field(default_factory=list)
    technical_architecture: str = Field(default="")
    rice: RICEScoreSchema = Field(default_factory=RICEScoreSchema)
    upvotes: int = Field(default=0)
    tags: List[str] = Field(default_factory=list)


class RoadmapInitiativeCreate(RoadmapInitiativeBase):
    id: Optional[str] = None
    tenant_id: str = Field(default="default")


class RoadmapInitiativeUpdate(BaseModel):
    title: Optional[str] = None
    stage: Optional[str] = None
    theme: Optional[str] = None
    priority: Optional[str] = None
    target_persona: Optional[str] = None
    quarter: Optional[str] = None
    summary: Optional[str] = None
    problem_statement: Optional[str] = None
    user_story: Optional[str] = None
    success_metrics: Optional[List[str]] = None
    acceptance_criteria: Optional[List[str]] = None
    technical_architecture: Optional[str] = None
    rice: Optional[RICEScoreSchema] = None
    upvotes: Optional[int] = None
    tags: Optional[List[str]] = None


class RoadmapInitiativeResponse(RoadmapInitiativeBase):
    id: str
    tenant_id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

