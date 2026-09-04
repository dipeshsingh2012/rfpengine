import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.csv_service import sanitize_csv_cell, sanitize_filename_part, generate_csv_chunks

client = TestClient(app)

# --- Unit Tests for Service ---

def test_sanitize_csv_cell_formula_injection():
    """Verify that dangerous formula characters are escaped with a single quote."""
    assert sanitize_csv_cell("=SUM(A1:A2)").startswith("'")
    assert sanitize_csv_cell("+123").startswith("'")
    assert sanitize_csv_cell("-100").startswith("'")
    assert sanitize_csv_cell("@username").startswith("'")
    assert sanitize_csv_cell("normal_text") == "normal_text"
    assert sanitize_csv_cell(123) == "123"

def test_sanitize_filename_part_path_traversal():
    """Verify that filename parts are stripped of path traversal characters."""
    assert sanitize_filename_part("../../etc/passwd") == "etcpasswd"
    assert sanitize_filename_part("tenant_1\r\nX-Injected: True") == "tenant_1X-InjectedTrue"
    assert sanitize_filename_part("file name!@#.csv") == "filenamecsv"

def test_generate_csv_chunks():
    """Verify the generator produces correct CSV content and handles sanitization."""
    data = [
        {"id": "1", "name": "Alice", "notes": "=SUM(1,2)"},
        {"id": "2", "name": "Bob", "notes": "Safe"}
    ]
    headers = ["id", "name", "notes"]
    chunks = list(generate_csv_chunks(data, headers))
    
    full_output = "".join(chunks)
    # Check headers
    assert "id,name,notes" in full_output
    # Check sanitization in output
    assert "'=SUM(1,2)" in full_output
    # Check data integrity
    assert "Alice" in full_output
    assert "Bob" in full_output

# --- Integration Tests for API ---

def test_export_csv_success():
    """Test the full API endpoint flow with valid headers."""
    headers = {"X-Tenant-ID": "tenant_abc"}
    response = client.get("/api/v1/export/csv", headers=headers)
    
    assert response.status_code == 200
    assert response.headers["content-type"] == "text/csv"
    assert "attachment; filename=export_tenant_abc.csv" in response.headers["content-disposition"]
    
    content = response.text
    assert "id,name,email,notes" in content
    assert "'=SUM(A1:A2)" in content  # Verify injection protection in API response

def test_export_csv_missing_tenant():
    """Test that the API rejects requests without the required tenant header."""
    response = client.get("/api/v1/export/csv")
    assert response.status_code == 422  # FastAPI validation error for missing header
