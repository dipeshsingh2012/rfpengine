import pytest
from app.services.csv_service import sanitize_csv_cell, sanitize_filename_part, generate_csv_chunks

def test_sanitize_csv_cell_formula_injection():
    """Verify that formula injection characters are escaped with a single quote."""
    assert sanitize_csv_cell("=SUM(A1:A2)").startswith("'")
    assert sanitize_csv_cell("+100").startswith("'")
    assert sanitize_csv_cell("-50").startswith("'")
    assert sanitize_csv_cell("@username").startswith("'")
    assert sanitize_csv_cell("\ttabbed").startswith("'")
    assert sanitize_csv_cell("normal_text") == "normal_text"
    assert sanitize_csv_cell(123) == "123"

def test_sanitize_filename_part_security():
    """Verify protection against path traversal and header injection."""
    # Path traversal
    assert sanitize_filename_part("../../etc/passwd") == "etcpasswd"
    assert sanitize_filename_part("../secret.txt") == "secrettxt"
    # Header splitting (CRLF injection)
    assert sanitize_filename_part("report\r\nX-Injected: True") == "reportXInjectedTrue"
    # Valid characters
    assert sanitize_filename_part("my-report_2023") == "my-report_2023"

def test_generate_csv_chunks_logic():
    """Verify chunked generator produces correct CSV content and handles injection."""
    data = [
        {"id": "1", "name": "Alice", "note": "=SUM(1,2)"},
        {"id": "2", "name": "Bob", "note": "Normal"}
    ]
    headers = ["id", "name", "note"]
    
    chunks = list(generate_csv_chunks(data, headers))
    full_output = "".join(chunks)
    
    # Check headers
    assert "id,name,note" in full_output
    # Check data
    assert "1,Alice" in full_output
    assert "2,Bob" in full_output
    # Check injection remediation
    assert "'=SUM(1,2)" in full_output
