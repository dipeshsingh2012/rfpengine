from fastapi import APIRouter, Header, HTTPException, Body
from fastapi.responses import StreamingResponse
from typing import List, Dict, Any
from app.services.csv_service import generate_csv_chunks

router = APIRouter()

@router.post("/export")
async def export_csv(
    headers: List[str] = Body(...),
    data: List[Dict[str, Any]] = Body(...),
    x_tenant_id: str = Header(..., alias="X-Tenant-ID")
):
    """
    Exports data to CSV format with streaming support and tenant isolation.
    """
    if not x_tenant_id:
        raise HTTPException(status_code=400, detail="X-Tenant-ID header is required")

    # The generator handles the memory-efficient streaming
    generator = generate_csv_chunks(data, headers)
    
    return StreamingResponse(
        generator,
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=export_{x_tenant_id}.csv"
        }
    )
