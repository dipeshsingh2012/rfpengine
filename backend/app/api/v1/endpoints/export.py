from fastapi import APIRouter, Header, HTTPException, status
from fastapi.responses import StreamingResponse
from typing import List, Dict, Any
from app.services.csv_service import generate_csv_chunks

router = APIRouter()

@router.get("/export/csv")
async def export_data_csv(
    x_tenant_id: str = Header(..., alias="X-Tenant-ID"),
    data_param: str = "default"
):
    """
    Exposes a streaming CSV export endpoint. 
    Enforces multi-tenancy via X-Tenant-ID.
    """
    # Mock data retrieval - In production, this would query the DB using x_tenant_id
    mock_data = [
        {"id": "1", "name": "Alice", "balance": "1000", "note": "=SUM(A1:A2)"},
        {"id": "2", "name": "Bob", "balance": "-50", "note": "+100"},
        {"id": "3", "name": "Charlie", "balance": "0", "note": "@admin"},
    ]
    
    # Ensure data is scoped to tenant (Simulated)
    if not x_tenant_id:
        raise HTTPException(status_code=400, detail="Missing Tenant ID")

    headers = ["id", "name", "balance", "note"]

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
