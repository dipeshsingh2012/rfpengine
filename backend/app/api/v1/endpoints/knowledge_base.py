from fastapi import APIRouter
from typing import List, Dict, Any

router = APIRouter()

@router.get("/query")
async def query_kb(q: str) -> List[Dict[str, Any]]:
    return [{"id": 1, "result": f"Result for {q}"}]
