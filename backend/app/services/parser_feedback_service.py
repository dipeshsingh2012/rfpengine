from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


class QuestionEditDiff(BaseModel):
    id: Optional[str] = None
    original_text: str
    corrected_text: str
    section: Optional[str] = None


class QuestionDeletion(BaseModel):
    id: Optional[str] = None
    rejected_text: str
    section: Optional[str] = None
    reason: Optional[str] = "false_positive"  # false_positive, header, duplicate, irrelevant


class QuestionAddition(BaseModel):
    question_text: str
    section: Optional[str] = "General"
    expected_type: Optional[str] = "narrative"


class ParserFeedbackPayload(BaseModel):
    filename: str
    format: str = "pdf"
    rating: Optional[str] = None  # "thumbs_up" | "thumbs_down" | None
    comment: Optional[str] = None
    total_ai_detected: int = 0
    total_curated: int = 0
    edits: List[QuestionEditDiff] = Field(default_factory=list)
    deletions: List[QuestionDeletion] = Field(default_factory=list)
    additions: List[QuestionAddition] = Field(default_factory=list)


class ParserFeedbackRecord(ParserFeedbackPayload):
    id: str
    tenant_id: str
    created_at: str


class ParserFeedbackService:
    """
    Records and synthesizes user review feedback on AI document extractions.
    Stores false positives (deletions), corrections (edits), and missed items (additions)
    to create a closed feedback loop for improving future prompt extractions.
    """

    def __init__(self) -> None:
        self._records: Dict[str, List[Dict[str, Any]]] = {}

    def record_feedback(self, tenant_id: str, payload: ParserFeedbackPayload) -> ParserFeedbackRecord:
        if tenant_id not in self._records:
            self._records[tenant_id] = []

        record_id = f"pfb_{len(self._records[tenant_id]) + 1}"
        created_at = datetime.now(timezone.utc).isoformat()

        record_dict = {
            **payload.model_dump(),
            "id": record_id,
            "tenant_id": tenant_id,
            "created_at": created_at,
        }

        self._records[tenant_id].append(record_dict)
        logger.info(
            "Recorded parser feedback %s for tenant %s (rating: %s, edits: %d, deletions: %d, additions: %d)",
            record_id,
            tenant_id,
            payload.rating,
            len(payload.edits),
            len(payload.deletions),
            len(payload.additions),
        )
        return ParserFeedbackRecord(**record_dict)

    def get_tenant_feedback(self, tenant_id: str) -> List[ParserFeedbackRecord]:
        items = self._records.get(tenant_id, [])
        return [ParserFeedbackRecord(**item) for item in items]

    def get_extraction_guardrails(self, tenant_id: str) -> List[str]:
        """
        Extracts high-frequency false positives or user rules to feed back into Gemini prompts.
        """
        guardrails: List[str] = []
        feedback_list = self._records.get(tenant_id, [])
        for fb in feedback_list[-10:]:
            for d in fb.get("deletions", []):
                rej = d.get("rejected_text", "").strip()
                if rej and len(rej) < 100:
                    guardrails.append(f"Do not extract header/boilerplate: '{rej}'")
        return guardrails[:5]


parser_feedback_service = ParserFeedbackService()

