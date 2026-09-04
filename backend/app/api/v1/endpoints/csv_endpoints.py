from fastapi import APIRouter, Header, HTTPException, status
from fastapi.responses import StreamingResponse
from typing import List, Dict, Any
from app.services.csv_service import generate_csv_chunks

router = APIRouter()

# Mock data for demonstration
MOCK_DATA = [
    {"id": "1", "name": "Alice", "notes": "Normal note"},
    {"id": "2", "name": "Bob", "notes": "=SUM(A1:A2)"},  # Injection attempt
    {"id": "3", "name": "Charlie", "notes": "-100"},     # Injection attempt
]

@router.get("/export")
async def export_csv(x_tenant_id: str = Header(..., alias="X-Tenant-ID")):
    """
    Streams a CSV file to the client. 
    Requires X-Tenant-ID for multi-tenant isolation.
    """
    if not x_tenant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Tenant ID missing"
        )

    headers = ["id", "name", "notes"]
    
    # In a real app, we would filter MOCK_DATA by x_tenant_id here
    
    return StreamingResponse(
        generate_csv_chunks(MOCK_DATA, headers),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=export_{x_tenant_id}.csv"}
    )
