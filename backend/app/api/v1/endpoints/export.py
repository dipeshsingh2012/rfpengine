from fastapi import APIRouter, Header, HTTPException, status
from fastapi.responses import StreamingResponse
from app.services.csv_service import generate_csv_chunks
from typing import List, Dict, Any

router = APIRouter()

# Mock data for demonstration
MOCK_DATA = [
    {"id": "1", "name": "Alice", "email": "alice@example.com", "notes": "=SUM(1,2)"},
    {"id": "2", "name": "Bob", "email": "bob@example.com", "notes": "Normal note"},
    {"id": "3", "name": "Charlie", "email": "charlie@example.com", "notes": "-100"},
]

@router.get("/export/csv")
async def export_csv(x_tenant_id: str = Header(..., alias="X-Tenant-ID")):
    """
    Streams a CSV file for the specified tenant.
    In a real app, x_tenant_id would be used to filter the database query.
    """
    if not x_tenant_id:
        raise HTTPException(status_code=400, detail="X-Tenant-ID header is required")

    headers = ["id", "name", "email", "notes"]
    
    # In production: data = await db.fetch_rows(tenant_id=x_tenant_id)
    data = MOCK_DATA 

    return StreamingResponse(
        generate_csv_chunks(data, headers),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=export_{x_tenant_id}.csv"
        }
    )
