import re
from typing import List, Dict, Any, Optional
from app.schemas.fleet import (
    FleetStage, 
    StageExecutionStatus, 
    StageRecord, 
    FleetHandoffVerifyRequest, 
    FleetHandoffVerifyResponse
)

class FleetHandoffService:
    STAGE_ORDER = [
        FleetStage.SPEC,
        FleetStage.DESIGN,
        FleetStage.DEVELOPMENT,
        FleetStage.SECURITY_AUDIT,
        FleetStage.QA_VERIFICATION,
        FleetStage.FINAL_APPROVAL_GATE
    ]

    def __init__(self):
        pass

    def _sanitize_string(self, text: Optional[str]) -> str:
        """Prevents CSV formula injection and path traversal in audit logs."""
        if not text:
            return ""
        cleaned = text.strip()
        dangerous_chars = ('=', '+', '-', '@', '\t', '\r')
        if cleaned.startswith(dangerous_chars):
            cleaned = f"'{cleaned}"
        cleaned = cleaned.replace("../", "").replace("..\\", "")
        return cleaned

    def verify_handoff(self, request: FleetHandoffVerifyRequest, tenant_id: str) -> FleetHandoffVerifyResponse:
        stage_map: Dict[FleetStage, StageRecord] = {s.stage: s for s in request.stages}
        
        is_valid = True
        ready_for_human_approval = True
        remediation_count = sum(s.remediation_attempts for s in request.stages)
        stage_breakdown: Dict[str, str] = {}
        
        last_completed_stage_idx = -1
        
        for idx, stage_enum in enumerate(self.STAGE_ORDER):
            record = stage_map.get(stage_enum)
            if record:
                stage_breakdown[stage_enum.value] = record.status.value
                if record.status in [StageExecutionStatus.COMPLETED, StageExecutionStatus.REMEDIATED]:
                    last_completed_stage_idx = idx
                if record.status == StageExecutionStatus.FAILED:
                    ready_for_human_approval = False
            else:
                for req_stage in stage_map.keys():
                    if self.STAGE_ORDER.index(req_stage) > idx:
                        is_valid = False
                        break
                stage_breakdown[stage_enum.value] = "not_reported"

        current_stage = self.STAGE_ORDER[0]
        if last_completed_stage_idx != -1:
            next_idx = last_completed_stage_idx + 1
            if next_idx < len(self.STAGE_ORDER):
                current_stage = self.STAGE_ORDER[next_idx]
            else:
                current_stage = self.STAGE_ORDER[-1]

        for record in request.stages:
            if record.status == StageExecutionStatus.FAILED:
                ready_for_human_approval = False

        sanitized_notes = self._sanitize_string(request.notes)
        audit_summary = f"Tenant: {self._sanitize_string(tenant_id)} | Session: {self._sanitize_string(request.session_id)} | Notes: {sanitized_notes}"

        return FleetHandoffVerifyResponse(
            issue_id=request.issue_id,
            session_id=request.session_id,
            tenant_id=tenant_id,
            is_valid=is_valid,
            current_stage=current_stage,
            ready_for_human_approval=ready_for_human_approval and is_valid,
            remediation_count=remediation_count,
            stage_breakdown=stage_breakdown,
            audit_summary=audit_summary
        )
