from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Index
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func

Base = declarative_base()

def utcnow():
    return func.now()

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=True)
    google_id = Column(String, unique=True, index=True, nullable=True)
    tenant_id = Column(String, index=True, nullable=False)  # CRITICAL: Restored for isolation
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class KBEntry(Base):
    __tablename__ = "kb_entries"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(String, index=True, nullable=False)  # CRITICAL: Restored
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    title = Column(String, nullable=False)
    content = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class ResponseWorkspace(Base):
    __tablename__ = "response_workspaces"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(String, index=True, nullable=False)  # CRITICAL: Restored
    title = Column(String, nullable=True)

class QuestionReview(Base):
    __tablename__ = "question_reviews"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(String, index=True, nullable=False)  # CRITICAL: Restored
    workspace_id = Column(Integer, ForeignKey("response_workspaces.id"), nullable=False)
    question_index = Column(Integer, nullable=False)
    question_text = Column(String, nullable=False)
    review_status = Column(String, default="Draft")
