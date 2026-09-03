import pytest
from app.services.csv_service import sanitize_csv_cell, sanitize_filename_part, generate_csv_chunks

def test_sanitize_csv_cell_formula_injection():
    """Verify that dangerous characters are escaped with a single quote."""
    assert sanitize_csv_cell("=SUM(A1:A2)") == "'=SUM(A1:A2)"
    assert sanitize_csv_cell("+123") == "'+123"
    assert sanitize_csv_cell("-100") == "'-100"
    assert sanitize_csv_cell("@username") == "'@username"
    assert sanitize_csv_cell("  \t=test") == "'  \t=test"
    assert sanitize_csv_cell("normal_text") == "normal_text"
    assert sanitize_csv_cell(None) == ""

def test_sanitize_filename_part_path_traversal():
    """Verify that path traversal and control characters are stripped."""
    assert sanitize_filename_part("../../etc/passwd") == "etcpasswd"
    assert sanitize_filename_part("tenant_1\r\nX-Injected: True") == "tenant_1XInjectedTrue"
    assert sanitize_filename_part("file name!@#.csv") == "filename.csv"

def test_generate_csv_chunks():
    """Verify the streaming generator produces correct, sanitized CSV content."""
    data = [
        {"id": "1", "name": "Alice", "notes": "=SUM(1,2)"},
        {"id": "2", "name": "Bob", "notes": "Normal note"}
    ]
    headers = ["id", "name", "notes"]
    
    chunks = list(generate_csv_chunks(data, headers))
    full_output = "".join(chunks)
    
    # Check headers
    assert "id,name,notes" in full_output
    # Check sanitized injection
    assert "'=SUM(1,2)" in full_output
    # Check normal data
    assert "Alice" in full_output
    assert "Bob" in full_output
