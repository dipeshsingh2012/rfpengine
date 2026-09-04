from fastapi import APIRouter, Header, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from typing import List, Dict, Any
from app.services.csv_service import generate_csv_chunks, fetch_data_for_tenant

router = APIRouter()

@router.post("/export", response_class=StreamingResponse)
async def export_csv(
    resource_id: str = Query(..., description="The ID of the resource to export"),
    x_tenant_id: str = Header(..., alias="X-Tenant-ID")
):
    """
    Exports data to CSV with strict multi-tenant isolation.
    
    REMEDIATION: This endpoint no longer accepts raw data in the request body.
    It fetches data from the backend using the X-Tenant-ID to ensure the 
    requesting tenant only accesses their own data.
    """
    if not x_tenant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Missing X-Tenant-ID header"
        )

    # Securely fetch data bound to the tenant_id
    data = fetch_data_for_tenant(x_tenant_id, resource_id)
    
    if not data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="No data found for the provided resource ID within this tenant context"
        )

    headers = list(data[0].keys())
    generator = generate_csv_chunks(data, headers)
    
    return StreamingResponse(
        generator, 
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=export_{x_tenant_id}.csv"
        }
    )
