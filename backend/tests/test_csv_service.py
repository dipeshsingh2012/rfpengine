import pytest
from app.services.csv_service import sanitize_csv_cell, sanitize_filename_part, generate_csv_chunks

def test_sanitize_csv_cell_formula_injection():
    """Verify that dangerous formula characters are escaped with a single quote."""
    assert sanitize_csv_cell("=SUM(A1:A2)") == "'=SUM(A1:A2)"
    assert sanitize_csv_cell("+123") == "'+123"
    assert sanitize_csv_cell("-50") == "'-50"
    assert sanitize_csv_cell("@username") == "'@username"
    assert sanitize_csv_cell("normal_text") == "normal_text"
    assert sanitize_csv_cell(123) == "123"
    assert sanitize_csv_cell(None) == ""

def test_sanitize_filename_part_path_traversal():
    """Verify that path traversal attempts and control characters are stripped."""
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
    
    # Ensure we got chunks (header + 2 rows)
    assert len(chunks) >= 3
    
    full_output = "".join(chunks)
    
    # Check headers
    assert "id,name,notes" in full_output
    # Check data integrity
    assert "1,Alice," in full_output
    assert "2,Bob,Normal note" in full_output
    # Check sanitization in output
    assert "'=SUM(1,2)" in full_output

def test_generate_csv_chunks_empty_data():
    """Verify behavior with empty data list."""
    headers = ["id", "name"]
    chunks = list(generate_csv_chunks([], headers))
    assert len(chunks) == 1  # Only the header chunk
    assert chunks[0] == "id,name\r\n" or chunks[0] == "id,name\n"
