from typing import List, Dict, Any
from pydantic import BaseModel

class SearchResult(BaseModel):
    doc_id: str
    score: float
    content: str

class SearchService:
    def __init__(self):
        # Mock search implementation
        pass

    async def search(self, tenant_id: str, query: str, limit: int = 5) -> List[SearchResult]:
        # In a real scenario, this would query a Vector DB filtered by tenant_id
        return [
            SearchResult(doc_id="doc_1", score=0.95, content=f"Mock result for {query}")
        ]

search_service = SearchService()
