from fastapi import APIRouter, Header, HTTPException, Query
from fastapi.responses import StreamingResponse
from typing import List, Optional
from app.services.csv_service import generate_csv_chunks, sanitize_filename_part

router = APIRouter()

# Mock multi-tenant data source
MOCK_DB = {
    "tenant_123": [
        {"id": "1", "name": "Alice", "email": "alice@example.com", "notes": "=SUM(1,2)"},
        {"id": "2", "name": "Bob", "email": "bob@example.com", "notes": "-100"},
    ],
    "tenant_1": [
        {"id": "1", "name": "Alice", "email": "alice@example.com", "notes": "=SUM(1,2)"},
        {"id": "2", "name": "Bob", "email": "bob@example.com", "notes": "Normal note"},
    ],
    "tenant_2": [
        {"id": "101", "name": "Charlie", "email": "charlie@example.com", "notes": "@danger"},
    ]
}

@router.get("/export/csv")
async def export_tenant_data(
    x_tenant_id: str = Header(..., alias="X-Tenant-ID"),
    filename: Optional[str] = Query("export", description="Base name for the CSV file")
):
    """
    Exports tenant-specific data to CSV using a memory-efficient stream.
    Enforces strict tenant isolation via X-Tenant-ID header.
    """
    # 1. Tenant Isolation
    data = MOCK_DB.get(x_tenant_id)
    if data is None:
        raise HTTPException(status_code=404, detail="Tenant data not found")

    # 2. Filename Sanitization
    safe_tenant_id = sanitize_filename_part(x_tenant_id)
    safe_filename = f"export_{safe_tenant_id}.csv"
    
    # 3. Define Headers from tenant data
    headers = list(data[0].keys())
    
    # 4. Stream Response
    return StreamingResponse(
        generate_csv_chunks(data, headers),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename={safe_filename}",
            "Content-Type": "text/csv",
            "X-Tenant-ID": safe_tenant_id
        }
    )
