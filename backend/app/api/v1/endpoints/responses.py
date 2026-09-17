from fastapi import APIRouter, Depends, Header
from typing import Dict, Any, List, Optional
from datetime import datetime

router = APIRouter()

TENANT_HISTORY: Dict[str, List[Dict[str, Any]]] = {
    "acme-corp": [
        {
            "id": "demo",
            "title": "Northstar security review",
            "editedAt": "8 min ago",
            "color": "blue",
            "questionsCount": 12,
            "created_at": datetime.now().isoformat()
        },
        {
            "id": "grove-rfp",
            "title": "Grove procurement RFP",
            "editedAt": "Yesterday",
            "color": "orange",
            "questionsCount": 8,
            "created_at": datetime.now().isoformat()
        },
        {
            "id": "meridian-form",
            "title": "Meridian vendor form",
            "editedAt": "Aug 18",
            "color": "green",
            "questionsCount": 15,
            "created_at": datetime.now().isoformat()
        }
    ]
}

@router.get("/history")  # This is relative to the prefix in the main router
async def get_responses_history(
    x_tenant_id: str = Header(alias="X-Tenant-ID", default="acme-corp")
):
    """
    Fetch recent RFPs history for the current tenant from backend.
    """
    history = TENANT_HISTORY.get(x_tenant_id, TENANT_HISTORY.get("acme-corp", []))
    return {"history": history}

@router.post("/history")
async def add_response_history(
    payload: Dict[str, Any],
    x_tenant_id: str = Header(alias="X-Tenant-ID", default="acme-corp")
):
    """
    Add or update a recent RFP item in backend history for the active tenant.
    """
    if x_tenant_id not in TENANT_HISTORY:
        TENANT_HISTORY[x_tenant_id] = []

    item_id = payload.get("id", f"rfp-{int(datetime.now().timestamp())}")
    title = payload.get("title", "Questionnaire Response")
    color = payload.get("color", "blue")
    questions_count = payload.get("questionsCount", 0)

    new_entry = {
        "id": item_id,
        "title": title,
        "editedAt": "Just now",
        "color": color,
        "questionsCount": questions_count,
        "created_at": datetime.now().isoformat()
    }

    filtered = [item for item in TENANT_HISTORY[x_tenant_id] if item["id"] != item_id and item["title"] != title]
    TENANT_HISTORY[x_tenant_id] = [new_entry] + filtered

    return {"status": "success", "item": new_entry, "history": TENANT_HISTORY[x_tenant_id]}

@router.post("/review")
async def review_response(payload: Dict[str, Any]):
    """
    Endpoint for transitioning workspace / questionnaire responses into 'In Review' or 'Approved' status.
    """
    return {
        "status": "success",
        "review_status": payload.get("status", "In Review"),
        "workspace_id": payload.get("workspace_id", ""),
        "message": "Response review status updated successfully"
    }


