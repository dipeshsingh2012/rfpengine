from typing import Any, Dict, Optional
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from app.services.email_service import EmailService

router = APIRouter(prefix="/email", tags=["email"])
email_service = EmailService()


class SMEReviewEmailRequest(BaseModel):
    recipient_email: str
    recipient_name: Optional[str] = None
    workspace_title: str
    question_text: str
    draft_preview: str
    category: str = "Security & Compliance"
    workspace_id: str = "ws-demo"
    question_index: int = 0
    token: Optional[str] = None


class CompletionDigestEmailRequest(BaseModel):
    recipient_email: str
    owner_name: Optional[str] = None
    workspace_title: str
    total_questions: int
    workspace_id: str = "ws-demo"


@router.post("/sme-review", status_code=status.HTTP_200_OK)
async def dispatch_sme_review_email(request: SMEReviewEmailRequest) -> Dict[str, Any]:
    """
    Dispatches a 1-click magic link compliance review email to an SME.
    """
    try:
        result = await email_service.send_sme_review_request(
            recipient_email=request.recipient_email,
            recipient_name=request.recipient_name,
            workspace_title=request.workspace_title,
            question_text=request.question_text,
            draft_preview=request.draft_preview,
            category=request.category,
            workspace_id=request.workspace_id,
            question_index=request.question_index,
            token=request.token
        )
        return result
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed dispatching SME review email: {exc}"
        )


@router.post("/completion-digest", status_code=status.HTTP_200_OK)
async def dispatch_completion_digest_email(request: CompletionDigestEmailRequest) -> Dict[str, Any]:
    """
    Dispatches a proposal 100% verification completion digest to the deal owner.
    """
    try:
        result = await email_service.send_proposal_completion_digest(
            recipient_email=request.recipient_email,
            owner_name=request.owner_name,
            workspace_title=request.workspace_title,
            total_questions=request.total_questions,
            workspace_id=request.workspace_id
        )
        return result
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed dispatching completion digest email: {exc}"
        )
