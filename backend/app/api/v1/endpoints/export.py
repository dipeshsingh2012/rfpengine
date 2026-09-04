from fastapi import APIRouter, Header, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from typing import List, Dict, Any
from app.services.csv_service import generate_csv_chunks, fetch_data_for_tenant, sanitize_filename_part

router = APIRouter()

@router.get("/export/csv", response_class=StreamingResponse)
async def export_csv(
    resource_id: str = Query("res_101", description="The ID of the resource to export"),
    x_tenant_id: str = Header(..., alias="X-Tenant-ID")
):
    """
    Streams a CSV file for the specified tenant with strict multi-tenant isolation,
    header validation, and injection safeguards.
    """
    if not x_tenant_id or not x_tenant_id.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Missing or invalid X-Tenant-ID header"
        )

    # Sanitize tenant ID and resource ID to prevent injection/traversal
    sanitized_tenant_id = sanitize_filename_part(x_tenant_id)
    sanitized_resource_id = sanitize_filename_part(resource_id)

    if not sanitized_tenant_id or not sanitized_resource_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tenant ID or Resource ID contains prohibited characters"
        )

    # Securely fetch data bound strictly to the validated tenant_id
    data = fetch_data_for_tenant(sanitized_tenant_id, sanitized_resource_id)
    
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
            "Content-Disposition": f"attachment; filename=export_{sanitized_tenant_id}.csv",
            "X-Tenant-ID": sanitized_tenant_id
        }
    )
