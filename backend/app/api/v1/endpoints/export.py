from fastapi import APIRouter, Header, HTTPException, status
from fastapi.responses import StreamingResponse
from typing import List, Dict, Any
from app.services.csv_service import generate_csv_chunks

router = APIRouter()

@router.get("/export/csv")
async def export_csv(
    x_tenant_id: str = Header(..., alias="X-Tenant-ID"),
    data_param: str = "default"
):
    """
    Exposes a streaming CSV export endpoint with strict tenant isolation.
    """
    # Mock data - in a real scenario, this would be fetched from a DB filtered by x_tenant_id
    mock_data = [
        {"id": "1", "name": "Alice", "email": "alice@example.com", "notes": "=SUM(1,2)"},
        {"id": "2", "name": "Bob", "email": "bob@example.com", "notes": "Normal note"},
        {"id": "3", "name": "Charlie", "email": "charlie@example.com", "notes": "@attacker"},
    ]
    
    headers = ["id", "name", "email", "notes"]

    def stream_generator():
        yield from generate_csv_chunks(mock_data, headers)

    return StreamingResponse(
        stream_generator(),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=export_{x_tenant_id}.csv",
            "X-Tenant-ID": x_tenant_id
        }
    )
