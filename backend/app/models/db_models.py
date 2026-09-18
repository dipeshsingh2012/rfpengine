from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    JSON,
    Index,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class KBEntry(Base):
    __tablename__ = "kb_entries"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    question: Mapped[str] = mapped_column(Text, nullable=False)
    answer: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[Optional[str]] = mapped_column(String(128), nullable=True, index=True)
    metadata_json: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    __table_args__ = (
        Index("ix_kb_tenant_category", "tenant_id", "category"),
    )

    @property
    def title(self) -> str:
        return self.question

    @title.setter
    def title(self, val: str) -> None:
        self.question = val

    @property
    def content(self) -> str:
        return self.answer

    @content.setter
    def content(self, val: str) -> None:
        self.answer = val


class ResponseWorkspace(Base):
    __tablename__ = "response_workspaces"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    tenant_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(256), nullable=False)
    source_mode: Mapped[str] = mapped_column(String(32), default="upload")  # "url", "upload", "extension"
    source_url: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    reviews: Mapped[List["QuestionReview"]] = relationship(
        "QuestionReview",
        back_populates="workspace",
        cascade="all, delete-orphan",
        order_by="QuestionReview.question_index",
    )


class QuestionReview(Base):
    __tablename__ = "question_reviews"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    workspace_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("response_workspaces.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    question_index: Mapped[int] = mapped_column(Integer, nullable=False)
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    suggested_answer: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    final_answer: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    review_status: Mapped[str] = mapped_column(String(64), default="Draft")
    assigned_role: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    confidence_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    sources_json: Mapped[Optional[List[Dict[str, Any]]]] = mapped_column(JSON, nullable=True)
    is_promoted_to_kb: Mapped[bool] = mapped_column(Boolean, default=False)
    promoted_kb_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    workspace: Mapped["ResponseWorkspace"] = relationship("ResponseWorkspace", back_populates="reviews")

    __table_args__ = (
        Index("ix_workspace_question_idx", "workspace_id", "question_index", unique=True),
    )


# Backward-compatible model aliases
KBEntryModel = KBEntry
QuestionReviewModel = QuestionReview


class RoadmapInitiativeModel(Base):
    __tablename__ = "roadmap_initiatives"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    tenant_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False, default="default")
    title: Mapped[str] = mapped_column(String(256), nullable=False)
    stage: Mapped[str] = mapped_column(String(32), default="discovery", index=True)
    theme: Mapped[str] = mapped_column(String(64), default="Core AI & Retrieval", index=True)
    priority: Mapped[str] = mapped_column(String(32), default="P1 - High")
    target_persona: Mapped[str] = mapped_column(String(128), default="Proposal Manager")
    quarter: Mapped[str] = mapped_column(String(32), default="In Discovery")
    summary: Mapped[str] = mapped_column(Text, nullable=False, default="")
    problem_statement: Mapped[str] = mapped_column(Text, nullable=False, default="")
    user_story: Mapped[str] = mapped_column(Text, nullable=False, default="")
    success_metrics: Mapped[List[str]] = mapped_column(JSON, default=list)
    acceptance_criteria: Mapped[List[str]] = mapped_column(JSON, default=list)
    technical_architecture: Mapped[str] = mapped_column(Text, default="")
    rice_reach: Mapped[int] = mapped_column(Integer, default=50)
    rice_impact: Mapped[int] = mapped_column(Integer, default=3)
    rice_confidence: Mapped[int] = mapped_column(Integer, default=80)
    rice_effort: Mapped[int] = mapped_column(Integer, default=3)
    rice_score: Mapped[float] = mapped_column(Float, default=40.0)
    upvotes: Mapped[int] = mapped_column(Integer, default=0)
    tags: Mapped[List[str]] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    __table_args__ = (
        Index("ix_roadmap_tenant_stage", "tenant_id", "stage"),
    )


class AuditLogModel(Base):
    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=lambda: f"audit-{uuid.uuid4().hex[:10]}")
    tenant_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False, default="acme-corp")
    user_role: Mapped[str] = mapped_column(String(64), nullable=False, default="Proposal Drafter")
    action: Mapped[str] = mapped_column(String(256), nullable=False)
    details: Mapped[str] = mapped_column(Text, nullable=False, default="")
    event_type: Mapped[str] = mapped_column(String(32), default="import", index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    __table_args__ = (
        Index("ix_audit_tenant_event", "tenant_id", "event_type"),
    )


class WorkspaceSettingsModel(Base):
    __tablename__ = "workspace_settings"

    tenant_id: Mapped[str] = mapped_column(String(64), primary_key=True, index=True)
    company_name: Mapped[str] = mapped_column(String(128), default="Acme Corporation")
    industry: Mapped[str] = mapped_column(String(128), default="Enterprise Cloud & SaaS")
    admin_email: Mapped[str] = mapped_column(String(128), default="security-team@acme.corp")
    company_context: Mapped[str] = mapped_column(Text, default="Acme Corporation is an enterprise security and workflow platform specializing in SOC 2 Type II, ISO 27001, and FedRAMP certified deployments.")
    default_model: Mapped[str] = mapped_column(String(64), default="gemini-2.5-flash")
    default_top_k: Mapped[int] = mapped_column(Integer, default=5)
    response_tone: Mapped[str] = mapped_column(String(64), default="concise")
    disclaimer: Mapped[str] = mapped_column(Text, default="CONFIDENTIAL: The responses provided herein contain proprietary information intended solely for the recipient's evaluation.")
    auto_promote_golden_qa: Mapped[bool] = mapped_column(Boolean, default=True)
    sme_roles_config: Mapped[Dict[str, Any]] = mapped_column(JSON, default=lambda: {
        "security_sme_email": "security-sme@acme.corp",
        "legal_reviewer_email": "legal-review@acme.corp",
        "final_approver_email": "vp-compliance@acme.corp",
    })
    active_tuned_model_id: Mapped[Optional[str]] = mapped_column(String(256), nullable=True, default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


class TuningJobModel(Base):
    __tablename__ = "tuning_jobs"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=lambda: f"tune-{uuid.uuid4().hex[:10]}")
    tenant_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False, default="acme-corp")
    job_name: Mapped[str] = mapped_column(String(256), nullable=False)
    base_model: Mapped[str] = mapped_column(String(64), default="gemini-1.5-flash-002")
    tuned_model_name: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="PENDING", index=True)
    training_dataset_uri: Mapped[str] = mapped_column(String(512), default="")
    dataset_examples_count: Mapped[int] = mapped_column(Integer, default=0)
    epochs: Mapped[int] = mapped_column(Integer, default=4)
    learning_rate_multiplier: Mapped[float] = mapped_column(Float, default=1.0)
    metrics: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    __table_args__ = (
        Index("ix_tuning_tenant_status", "tenant_id", "status"),
    )


class KBSource(Base):
    __tablename__ = "kb_sources"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=lambda: f"src-{uuid.uuid4().hex[:10]}")
    tenant_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False, default="acme-corp")
    name: Mapped[str] = mapped_column(String(256), nullable=False)
    source_type: Mapped[str] = mapped_column(String(64), nullable=False)  # "web_crawler", "github_docs", "cloud_storage", "rfp_harvest"
    config_json: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)
    schedule_frequency: Mapped[str] = mapped_column(String(32), default="daily")  # "manual", "hourly", "daily", "weekly"
    status: Mapped[str] = mapped_column(String(32), default="idle")  # "idle", "syncing", "success", "error"
    last_synced_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    last_error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    metrics_json: Mapped[Dict[str, Any]] = mapped_column(JSON, default=lambda: {
        "documents_count": 0,
        "chunks_count": 0,
        "last_duration_sec": 0.0,
    })
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    __table_args__ = (
        Index("ix_kbsource_tenant_type", "tenant_id", "source_type"),
    )


class KBSyncLog(Base):
    __tablename__ = "kb_sync_logs"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=lambda: f"synclog-{uuid.uuid4().hex[:10]}")
    source_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    tenant_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False, default="acme-corp")
    status: Mapped[str] = mapped_column(String(32), default="completed")  # "running", "completed", "failed"
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    duration_seconds: Mapped[float] = mapped_column(Float, default=0.0)
    documents_scanned: Mapped[int] = mapped_column(Integer, default=0)
    chunks_created: Mapped[int] = mapped_column(Integer, default=0)
    chunks_updated: Mapped[int] = mapped_column(Integer, default=0)
    chunks_pruned: Mapped[int] = mapped_column(Integer, default=0)
    error_details: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    __table_args__ = (
        Index("ix_kbsynclog_source_time", "source_id", "started_at"),
    )




