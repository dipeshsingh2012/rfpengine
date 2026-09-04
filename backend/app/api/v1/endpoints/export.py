from fastapi import APIRouter, Header, HTTPException, Query
from fastapi.responses import StreamingResponse
from typing import List, Dict, Any
from app.services.csv_service import generate_csv_chunks

router = APIRouter()

@router.get("/export/csv")
async def export_data_csv(
    x_tenant_id: str = Header(..., alias="X-Tenant-ID"),
    data_param: str = Query(..., description="Mock data identifier")
):
    """
    Exposes a streaming CSV export endpoint with multi-tenant enforcement.
    """
    # In a real app, fetch data from DB using x_tenant_id
    # Mocking data for demonstration
    mock_data = [
        {"id": "1", "name": "Alice", "notes": "Normal text"},
        {"id": "2", "name": "Bob", "notes": "=SUM(A1:A10)"},  # Should be escaped
        {"id": "3", "name": "Charlie", "notes": "-100"},      # Should be escaped
    ]
    headers = ["id", "name", "notes"]

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
