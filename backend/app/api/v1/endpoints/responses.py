from fastapi import APIRouter, Depends, Header

router = APIRouter()

@router.get("/history")  # This is relative to the prefix in the main router
async def get_responses_history(
    x_tenant_id: str = Header(alias="X-Tenant-ID")
):
    # Implementation logic...
    return {"history": []}
