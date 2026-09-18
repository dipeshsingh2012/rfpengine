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
    source_type: Optional[str] = "hybrid"  # "algolia", "pinecone", "hybrid"
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


class ExemplarItem(BaseModel):
    id: str
    question: str
    approved_answer: str
    category: Optional[str] = "Golden Q&A"
    relevance_score: Optional[float] = None
    source_file: Optional[str] = None


class SearchResponse(BaseModel):
    suggested_answer: str
    confidence_score: float = Field(ge=0, le=1)
    sources: List[Source]
    exemplars_used: List[ExemplarItem] = Field(default_factory=list, description="Top Golden Q&A exemplars used for dynamic few-shot tone adaptation")
    tone_applied: Optional[str] = Field(default="Authoritative & Direct", description="Enterprise brand voice profile applied to synthesis")


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


# --- Automated Knowledge Base Sync & Ingestion Schemas ---

class KBSourceCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=256)
    source_type: str = Field(..., description="web_crawler | github_docs | cloud_storage | rfp_harvest")
    config: Dict[str, Any] = Field(default_factory=dict, description="Source-specific parameters (url, repo, folder, category)")
    schedule_frequency: str = Field(default="daily", description="manual | hourly | daily | weekly")
    tenant_id: str = Field(default="acme-corp")


class KBSourceUpdate(BaseModel):
    name: Optional[str] = None
    config: Optional[Dict[str, Any]] = None
    schedule_frequency: Optional[str] = None
    status: Optional[str] = None


class KBSourceResponse(BaseModel):
    id: str
    tenant_id: str
    name: str
    source_type: str
    config: Dict[str, Any] = Field(default_factory=dict)
    schedule_frequency: str
    status: str
    last_synced_at: Optional[datetime] = None
    last_error: Optional[str] = None
    metrics: Dict[str, Any] = Field(default_factory=dict)
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class KBSyncLogResponse(BaseModel):
    id: str
    source_id: str
    tenant_id: str
    status: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    duration_seconds: float = 0.0
    documents_scanned: int = 0
    chunks_created: int = 0
    chunks_updated: int = 0
    chunks_pruned: int = 0
    error_details: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class KBSyncTriggerResponse(BaseModel):
    status: str
    source_id: str
    message: str
    log_id: Optional[str] = None


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


class WorkspaceSummaryResponse(BaseModel):
    id: str
    tenant_id: str
    title: str
    source_mode: str
    source_url: Optional[str] = None
    total_questions: int
    approved_count: int
    in_review_count: int
    changes_requested_count: int
    draft_count: int
    completion_percentage: float
    status: str
    assigned_roles: List[str]
    created_at: datetime
    updated_at: datetime
    color: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class WorkspaceUpdatePayload(BaseModel):
    title: Optional[str] = None
    source_mode: Optional[str] = None
    source_url: Optional[str] = None
    answers: Optional[Dict[str, str]] = None
    review_statuses: Optional[Dict[str, str]] = None
    questions: Optional[List[QuestionReviewItem]] = None



class QuestionReviewUpdate(BaseModel):
    final_answer: Optional[str] = None
    review_status: Optional[str] = None
    assigned_role: Optional[str] = None
    assigned_email: Optional[str] = None
    notify_sme: bool = False


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
    impact: int = Field(default=3, ge=1, le=5)
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


# --- Audit Log Schemas ---

class AuditLogCreate(BaseModel):
    user_role: str = Field(default="Proposal Drafter")
    action: str = Field(min_length=1)
    details: str = Field(default="")
    event_type: str = Field(default="import")


class AuditLogItem(BaseModel):
    id: str
    tenant_id: str
    user_role: str
    action: str
    details: str
    event_type: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# --- Workspace Settings Schemas ---

class WorkspaceSettingsUpdate(BaseModel):
    company_name: Optional[str] = None
    industry: Optional[str] = None
    admin_email: Optional[str] = None
    company_context: Optional[str] = None
    default_model: Optional[str] = None
    default_top_k: Optional[int] = None
    response_tone: Optional[str] = None
    disclaimer: Optional[str] = None
    auto_promote_golden_qa: Optional[bool] = None
    sme_roles_config: Optional[Dict[str, Any]] = None
    active_tuned_model_id: Optional[str] = None


class WorkspaceSettingsSchema(BaseModel):
    tenant_id: str
    company_name: str
    industry: str
    admin_email: str
    company_context: str
    default_model: str
    default_top_k: int
    response_tone: str
    disclaimer: str
    auto_promote_golden_qa: bool
    sme_roles_config: Dict[str, Any]
    active_tuned_model_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# --- Supervised Tuning Schemas ---

class TuningJobCreate(BaseModel):
    base_model: str = Field(default="gemini-1.5-flash-002", description="Base Gemini model to fine-tune")
    epochs: int = Field(default=4, ge=1, le=20, description="Training epochs")
    learning_rate_multiplier: float = Field(default=1.0, ge=0.01, le=10.0, description="Learning rate multiplier")
    include_golden_qa: bool = Field(default=True, description="Include Golden Q&A canonical pairs")
    include_approved_reviews: bool = Field(default=True, description="Include SME approved review pairs")
    custom_dataset_uri: Optional[str] = Field(default=None, description="Optional pre-staged GCS JSONL URI")


class TuningJobResponse(BaseModel):
    id: str
    tenant_id: str
    job_name: str
    base_model: str
    tuned_model_name: Optional[str] = None
    status: str
    training_dataset_uri: str
    dataset_examples_count: int
    epochs: int
    learning_rate_multiplier: float
    metrics: Dict[str, Any] = Field(default_factory=dict)
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TuningDatasetPreviewResponse(BaseModel):
    total_pairs: int
    golden_qa_count: int
    approved_reviews_count: int
    sample_pairs: List[Dict[str, Any]] = Field(default_factory=list)


# --- Compliance Export Schemas ---

class ExportItemPayload(BaseModel):
    question_index: int = 0
    section: Optional[str] = "General"
    question_text: str
    answer_text: str = ""
    review_status: str = "Draft"
    assigned_role: Optional[str] = "Security Director"
    confidence_score: Optional[float] = 0.0
    sources: Optional[List[Any]] = None
    comments: Optional[str] = None


class ExportRequestPayload(BaseModel):
    workspace_id: Optional[str] = None
    tenant_id: str = "acme-corp"
    title: str = "RFP Compliance Response Matrix"
    format: str = Field(default="xlsx", pattern="^(xlsx|docx|pdf|csv)$")
    items: List[ExportItemPayload] = []


