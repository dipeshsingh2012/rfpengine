from typing import List, Dict, Any, Optional
from pydantic import BaseModel

class FeedbackCreate(BaseModel):
    response_id: str
    rating: int
    comment: Optional[str] = None

class FeedbackResponse(FeedbackCreate):
    id: str
    tenant_id: str

class FeedbackService:
    def __init__(self):
        # In-memory store for demonstration; replace with DB in production
        self._storage: Dict[str, List[Dict[str, Any]]] = {}

    async def create_feedback(self, tenant_id: str, feedback: FeedbackCreate) -> FeedbackResponse:
        if tenant_id not in self._storage:
            self._storage[tenant_id] = []
        
        feedback_data = feedback.model_dump()
        feedback_id = f"fb_{len(self._storage[tenant_id]) + 1}"
        entry = {**feedback_data, "id": feedback_id, "tenant_id": tenant_id}
        
        self._storage[tenant_id].append(entry)
        return FeedbackResponse(**entry)

    async def get_tenant_feedback(self, tenant_id: str) -> List[FeedbackResponse]:
        data = self._storage.get(tenant_id, [])
        return [FeedbackResponse(**item) for item in data]

feedback_service = FeedbackService()
