from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy import (
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
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    workspace: Mapped["ResponseWorkspace"] = relationship("ResponseWorkspace", back_populates="reviews")

    __table_args__ = (
        Index("ix_workspace_question_idx", "workspace_id", "question_index", unique=True),
    )

