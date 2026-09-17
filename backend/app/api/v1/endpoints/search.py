from fastapi import APIRouter, Query, Depends, Header
from typing import Optional

router = APIRouter()

@router.get("/search")  # Removed trailing slash to prevent 307 redirect
async def search(
    query: str = Query(...),
    x_tenant_id: str = Header(alias="X-Tenant-ID")
):
    # Implementation logic...
    return {"results": []}
