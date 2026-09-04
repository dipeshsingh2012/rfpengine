import pytest
from app.services.csv_service import sanitize_csv_cell, sanitize_filename_part, generate_csv_chunks

def test_sanitize_csv_cell_formula_injection():
    """Verify that dangerous characters are escaped with a single quote."""
    assert sanitize_csv_cell("=SUM(A1:A2)").startswith("'")
    assert sanitize_csv_cell("+100").startswith("'")
    assert sanitize_csv_cell("-50").startswith("'")
    assert sanitize_csv_cell("@username").startswith("'")
    assert sanitize_csv_cell("normal_text") == "normal_text"
    assert sanitize_csv_cell(123) == "123"

def test_sanitize_filename_part_path_traversal():
    """Verify that path traversal attempts are stripped of special characters."""
    assert sanitize_filename_part("../../etc/passwd") == "etcpasswd"
    assert sanitize_filename_part("tenant_1\r\nX-Injected: True") == "tenant_1X-InjectedTrue"
    assert sanitize_filename_part("file name!@#.csv") == "filenamecsv"
    assert sanitize_filename_part("my.file.csv") == "myfilecsv"

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
    # Check sanitization in output
    assert "'=SUM(1,2)" in full_output
    # Check data integrity
    assert "Alice" in full_output
    assert "Bob" in full_output

def test_generate_csv_chunks_empty_data():
    """Verify behavior with empty data list."""
    headers = ["id", "name"]
    data = []
    chunks = list(generate_csv_chunks(data, headers))
    assert len(chunks) == 1
    assert chunks[0] == "id,name\r\n" or chunks[0] == "id,name\n"
