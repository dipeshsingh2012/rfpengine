from fastapi import APIRouter
from typing import List, Dict, Any

router = APIRouter()

@router.get("/milestones")
async def get_milestones() -> List[Dict[str, Any]]:
    return [{"phase": "alpha", "complete": True}]
