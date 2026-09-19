from typing import List, Dict, Any, Optional
from pydantic import BaseModel

class KBDocument(BaseModel):
    id: Optional[str] = None
    title: Optional[str] = None
    content: str = ""
    metadata: Dict[str, Any] = {}

class KBService:
    def __init__(self):
        self._storage: Dict[str, Dict[str, KBDocument]] = {}

    async def upsert_document(self, tenant_id: str, doc: KBDocument) -> KBDocument:
        if tenant_id not in self._storage:
            self._storage[tenant_id] = {}
        self._storage[tenant_id][doc.id] = doc
        return doc

    async def get_document(self, tenant_id: str, doc_id: str) -> Optional[KBDocument]:
        return self._storage.get(tenant_id, {}).get(doc_id)

    async def delete_document(self, tenant_id: str, doc_id: str) -> bool:
        if tenant_id in self._storage and doc_id in self._storage[tenant_id]:
            del self._storage[tenant_id][doc_id]
            return True
        return False

kb_service = KBService()
