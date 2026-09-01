from fastapi import APIRouter
from typing import Dict, Any

router = APIRouter()

@router.get("/status")
async def get_status() -> Dict[str, Any]:
    return {"status": "operational"}
