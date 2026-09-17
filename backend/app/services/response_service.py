from typing import List, Dict, Any, Optional
from pydantic import BaseModel

class ResponseModel(BaseModel):
    id: str
    text: str
    tenant_id: str
    metadata: Dict[str, Any]

class ResponseService:
    def __init__(self):
        self._storage: Dict[str, Dict[str, ResponseModel]] = {}

    async def save_response(self, tenant_id: str, response: ResponseModel) -> ResponseModel:
        if tenant_id not in self._storage:
            self._storage[tenant_id] = {}
        self._storage[tenant_id][response.id] = response
        return response

    async def get_response(self, tenant_id: str, response_id: str) -> Optional[ResponseModel]:
        return self._storage.get(tenant_id, {}).get(response_id)

response_service = ResponseService()
