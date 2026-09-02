import pytest
from app.services.csv_service import (
    sanitize_csv_cell, 
    sanitize_filename_part, 
    generate_csv_chunks
)

def test_sanitize_csv_cell_formula_injection():
    """Test that dangerous formula prefixes are escaped with a single quote."""
    assert sanitize_csv_cell("=SUM(A1:A2)") == "'=SUM(A1:A2)"
    assert sanitize_csv_cell("  +100") == "'+100"
    assert sanitize_csv_cell("-50") == "'-50"
    assert sanitize_csv_cell("@username") == "'@username"
    assert sanitize_csv_cell("normal_text") == "normal_text"
    assert sanitize_csv_cell(123) == "123"
    assert sanitize_csv_cell(None) == ""

def test_sanitize_filename_part_security():
    """Test that path traversal and header injection characters are stripped while preserving hyphens."""
    # Path traversal
    assert sanitize_filename_part("../../etc/passwd") == "etcpasswd"
    assert sanitize_filename_part("../secret.txt") == "secrettxt"
    
    # Header splitting (CRLF injection - note that CRLF and colon are stripped, hyphens retained)
    assert sanitize_filename_part("tenant_1\r\nX-Injected: True") == "tenant_1X-InjectedTrue"
    
    # Special characters
    assert sanitize_filename_part("my file!@#$%^&*().csv") == "myfilecsv"
    assert sanitize_filename_part("valid-name_123") == "valid-name_123"

def test_generate_csv_chunks_logic():
    """Test the streaming generator produces correct, sanitized CSV content complying with RFC-4180 quoting."""
    headers = ["id", "name", "amount"]
    data = [
        {"id": "1", "name": "Alice", "amount": "100"},
        {"id": "2", "name": "Bob", "amount": "=SUM(1,2)"},  # Should be escaped & quoted
        {"id": "3", "name": "Charlie", "amount": "  -50"}   # Should be escaped & quoted
    ]
    
    chunks = list(generate_csv_chunks(data, headers))
    full_content = "".join(chunks)
    
    # Verify headers exist
    assert "id,name,amount" in full_content
    
    # Verify normal row
    assert "1,Alice,100" in full_content
    
    # Verify RFC-4180 quoted & escaped formula row
    assert '2,Bob,\'=SUM(1,2)' in full_content or '2,Bob,"\'=SUM(1,2)"' in full_content
    
    # Verify RFC-4180 quoted & escaped negative row
    assert '3,Charlie,\'-50' in full_content or '3,Charlie,"\'-50"' in full_content

def test_generate_csv_chunks_empty_data():
    """Test generator behavior with empty input."""
    headers = ["id", "name"]
    data = []
    chunks = list(generate_csv_chunks(data, headers))
    
    assert len(chunks) == 1  # Only the header chunk
    assert "id,name" in chunks[0]
