from fastapi import APIRouter, Header, HTTPException, Query
from fastapi.responses import StreamingResponse
from typing import List, Dict, Any
from app.services.csv_service import generate_csv_chunks

router = APIRouter()

# Mock data for demonstration purposes
MOCK_DATA = [
    {"id": "1", "name": "Alice", "email": "alice@example.com", "notes": "=SUM(A1:A2)"},
    {"id": "2", "name": "Bob", "email": "bob@example.com", "notes": "Normal note"},
    {"id": "3", "name": "Charlie", "email": "charlie@example.com", "notes": "+12345"},
]

@router.get("/export/csv")
async def export_csv(
    x_tenant_id: str = Header(..., alias="X-Tenant-ID"),
    fields: List[str] = Query(default=["id", "name", "email", "notes"])
):
    """
    Streams a CSV file of user data. 
    Enforces multi-tenancy via X-Tenant-ID.
    """
    # In a real app, you would filter MOCK_DATA by x_tenant_id here
    if not x_tenant_id:
        raise HTTPException(status_code=400, detail="X-Tenant-ID header is required")

    def stream_generator():
        yield from generate_csv_chunks(MOCK_DATA, fields)

    return StreamingResponse(
        stream_generator(),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=export_{x_tenant_id}.csv"
        }
    )
