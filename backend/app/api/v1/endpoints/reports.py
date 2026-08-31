from fastapi import APIRouter, Header, HTTPException, status
from fastapi.responses import StreamingResponse
from typing import List, Dict, Any
from app.services.csv_service import generate_csv_chunks, sanitize_filename_part

router = APIRouter()

# Mock data for demonstration purposes
MOCK_REPORT_DATA = [
    {"id": "1", "tenant_id": "tenant_a", "data": "Normal Value", "formula": "=SUM(1,2)"},
    {"id": "2", "tenant_id": "tenant_a", "data": "Injection Test", "formula": "+1+1"},
    {"id": "3", "tenant_id": "tenant_b", "data": "Wrong Tenant", "formula": "Safe"},
]

@router.get("/export")
async def export_csv_report(
    x_tenant_id: str = Header(..., alias="X-Tenant-ID"),
    filename: str = Header(..., alias="X-Report-Filename")
):
    """
    Streams a CSV report for the authenticated tenant.
    """
    # 1. Multi-tenant Isolation: Filter data by tenant_id
    tenant_data = [row for row in MOCK_REPORT_DATA if row["tenant_id"] == x_tenant_id]
    
    if not tenant_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="No data found for this tenant"
        )

    # 2. Path Traversal & Header Splitting Protection
    safe_filename = sanitize_filename_part(filename)
    if not safe_filename:
        safe_filename = "report"
    
    headers = ["id", "tenant_id", "data", "formula"]
    
    # 3. Memory-Efficient Streaming
    generator = generate_csv_chunks(tenant_data, headers)
    
    return StreamingResponse(
        generator,
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename={safe_filename}.csv"
        }
    )
