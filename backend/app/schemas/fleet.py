from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

class FleetStage(str, Enum):
    SPEC = "spec"
    DESIGN = "design"
    DEVELOPMENT = "development"
    SECURITY_AUDIT = "security_audit"
    QA_VERIFICATION = "qa_verification"
    FINAL_APPROVAL_GATE = "final_approval_gate"

class StageExecutionStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    REMEDIATED = "remediated"

class StageRecord(BaseModel):
    stage: FleetStage
    status: StageExecutionStatus
    agent_id: str = Field(..., min_length=1, max_length=128)
    details: Optional[Dict[str, Any]] = None
    remediation_attempts: int = Field(default=0, ge=0)

class FleetHandoffVerifyRequest(BaseModel):
    issue_id: Optional[int] = Field(default=1, gt=0)
    session_id: Optional[str] = Field(default="session-123", min_length=1, max_length=128)
    stages: Optional[List[StageRecord]] = Field(default_factory=list)
    notes: Optional[str] = Field(default=None, max_length=1000)
    handoff_id: Optional[str] = None
    verification_data: Optional[Dict[str, Any]] = None

class FleetHandoffVerifyResponse(BaseModel):
    issue_id: Optional[int] = 1
    session_id: Optional[str] = "session-123"
    tenant_id: str
    is_valid: bool
    current_stage: FleetStage
    ready_for_human_approval: bool
    remediation_count: int
    stage_breakdown: Dict[str, str]
    audit_summary: str
