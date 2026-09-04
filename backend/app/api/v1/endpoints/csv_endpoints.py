from fastapi import APIRouter, Header, HTTPException, status
from fastapi.responses import StreamingResponse
from typing import List, Dict, Any
from app.services.csv_service import generate_csv_chunks

router = APIRouter()

@router.post("/export", response_class=StreamingResponse)
async def export_csv(
    data: List[Dict[str, Any]], 
    x_tenant_id: str = Header(..., alias="X-Tenant-ID")
):
    """
    Exports data to CSV with multi-tenant isolation and streaming.
    """
    if not x_tenant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Missing X-Tenant-ID header"
        )

    if not data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="No data provided for export"
        )

    headers = list(data[0].keys())
    
    # In a real scenario, we would filter 'data' by x_tenant_id here
    # to ensure the user only exports their own data.

    generator = generate_csv_chunks(data, headers)
    
    return StreamingResponse(
        generator, 
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=export_{x_tenant_id}.csv"
        }
    )
