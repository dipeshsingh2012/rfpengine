from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

class FeedbackSchema(BaseModel):
    user_id: str
    feedback: str

@router.post("/feedback")
async def submit_feedback(data: FeedbackSchema):
    if not data.feedback:
        raise HTTPException(status_code=400, detail="Feedback cannot be empty")
    return {"status": "success", "received": data.feedback}
