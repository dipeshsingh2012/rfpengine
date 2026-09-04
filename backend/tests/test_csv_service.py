import pytest
from app.services.csv_service import sanitize_csv_cell, sanitize_filename_part, generate_csv_chunks

def test_sanitize_csv_cell_formula_injection():
    """Verify that dangerous formula characters are escaped with a single quote."""
    assert sanitize_csv_cell("=SUM(A1:A2)") == "'=SUM(A1:A2)"
    assert sanitize_csv_cell("+100") == "'+100"
    assert sanitize_csv_cell("-50") == "'-50"
    assert sanitize_csv_cell("@username") == "'@username"
    assert sanitize_csv_cell("normal_text") == "normal_text"
    assert sanitize_csv_cell(123) == "123"
    assert sanitize_csv_cell(None) == ""

def test_sanitize_filename_part_path_traversal():
    """Verify that path traversal attempts and special characters are stripped."""
    assert sanitize_filename_part("../../etc/passwd") == "etcpasswd"
    assert sanitize_filename_part("tenant_1\r\nX-Injected: True") == "tenant_1XInjectedTrue"
    assert sanitize_filename_part("file name!@#.csv") == "filename.csv".replace(".", "") # regex removes .
    # Note: The regex [^a-zA-Z0-9_-] removes dots. If dots are needed, update regex.
    # Based on current regex:
    assert sanitize_filename_part("my.file.csv") == "myfilecsv"

def test_generate_csv_chunks():
    """Verify the streaming generator produces correct, sanitized CSV content."""
    headers = ["id", "name", "notes"]
    data = [
        {"id": "1", "name": "Alice", "notes": "Hello"},
        {"id": "2", "name": "Bob", "notes": "=SUM(1,2)"},
    ]
    
    chunks = list(generate_csv_chunks(data, headers))
    full_output = "".join(chunks)
    
    # Check headers
    assert "id,name,notes" in full_output
    # Check normal row
    assert "1,Alice,Hello" in full_output
    # Check sanitized row (formula injection)
    assert "2,Bob,'=SUM(1,2)" in full_output

def test_generate_csv_chunks_empty_data():
    """Verify behavior with empty data list."""
    headers = ["id", "name"]
    data = []
    chunks = list(generate_csv_chunks(data, headers))
    assert len(chunks) == 1
    assert chunks[0] == "id,name\r\n" or chunks[0] == "id,name\n"
