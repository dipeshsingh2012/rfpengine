from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel

router = APIRouter()

class FeedbackRequest(BaseModel):
    user_id: str
    feedback: str

@router.post("/feedback")  # Removed trailing slash to prevent 307 redirect
async def create_feedback(
    request: FeedbackRequest,
    x_tenant_id: str = Header(alias="X-Tenant-ID")
):
    # Implementation logic...
    return {"status": "success"}
