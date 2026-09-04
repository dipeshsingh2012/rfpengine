from fastapi import APIRouter, Header, HTTPException, Query
from fastapi.responses import StreamingResponse
from typing import List, Dict, Any
from app.services.csv_service import generate_csv_chunks, sanitize_filename_part

router = APIRouter()

# Multi-tenant mock data source
MOCK_DB: Dict[str, List[Dict[str, Any]]] = {
    "tenant_123": [
        {"id": "1", "name": "Alice", "email": "alice@example.com", "notes": "=SUM(1,2)"},
        {"id": "2", "name": "Bob", "email": "bob@example.com", "notes": "-100"},
    ],
    "tenant_abc": [
        {"id": "1", "name": "Alice", "email": "alice@example.com", "notes": "=SUM(A1:A2)"},
        {"id": "2", "name": "Bob", "email": "bob@example.com", "notes": "Normal note"},
    ],
}

DEFAULT_TENANT_DATA: List[Dict[str, Any]] = [
    {"id": "1", "name": "Alice", "email": "alice@example.com", "notes": "=SUM(A1:A2)"},
    {"id": "2", "name": "Bob", "email": "bob@example.com", "notes": "-100"},
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
    if not x_tenant_id:
        raise HTTPException(status_code=400, detail="X-Tenant-ID header is required")

    safe_tenant_id = sanitize_filename_part(x_tenant_id)
    tenant_data = MOCK_DB.get(x_tenant_id, DEFAULT_TENANT_DATA)

    def stream_generator():
        yield from generate_csv_chunks(tenant_data, fields)

    return StreamingResponse(
        stream_generator(),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=export_{safe_tenant_id}.csv",
            "Content-Type": "text/csv",
            "X-Tenant-ID": safe_tenant_id,
        }
    )
