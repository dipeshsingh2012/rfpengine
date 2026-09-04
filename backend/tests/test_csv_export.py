import pytest
from fastapi.testclient import TestClient
from fastapi import FastAPI
from app.api.v1.endpoints.export import router

# Setup a minimal FastAPI app for testing the endpoint
app = FastAPI()
app.include_router(router)
client = TestClient(app)

def test_sanitize_csv_cell_logic():
    from app.services.csv_service import sanitize_csv_cell
    assert sanitize_csv_cell("=SUM(A1)") == "'=SUM(A1)"
    assert sanitize_csv_cell("-100") == "'-100"
    assert sanitize_csv_cell("normal") == "normal"

def test_export_csv_success():
    """Test the full streaming endpoint with correct headers."""
    response = client.get("/export/csv", headers={"X-Tenant-ID": "tenant_123"})
    assert response.status_code == 200
    assert response.headers["content-type"] == "text/csv"
    assert "attachment; filename=export_tenant_123.csv" in response.headers["content-disposition"]
    
    # Verify content and escaping
    content = response.text
    assert "id,name,email,notes" in content
    assert "'=SUM(1,2)" in content  # Check escaping
    assert "'-100" in content       # Check escaping

def test_export_csv_missing_tenant():
    """Test that missing X-Tenant-ID returns 422 (Unprocessable Entity) due to FastAPI Header validation."""
    response = client.get("/export/csv")
    assert response.status_code == 422

def test_generate_csv_chunks_integrity():
    from app.services.csv_service import generate_csv_chunks
    data = [{"a": "1", "b": "2"}]
    headers = ["a", "b"]
    chunks = list(generate_csv_chunks(data, headers))
    full_content = "".join(chunks)
    assert "a,b" in full_content
    assert "1,2" in full_content
