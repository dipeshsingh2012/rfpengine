import pytest
from app.services.csv_service import sanitize_csv_cell, sanitize_filename_part, generate_csv_chunks

def test_sanitize_csv_cell_formula_injection():
    """Verify that dangerous formula characters are escaped with a single quote."""
    assert sanitize_csv_cell("=SUM(A1:A2)") == "'=SUM(A1:A2)"
    assert sanitize_csv_cell("+123") == "'+123"
    assert sanitize_csv_cell("-50") == "'-50"
    assert sanitize_csv_cell("@username") == "'@username"
    assert sanitize_csv_cell("\tcontent") == "'\tcontent"
    assert sanitize_csv_cell("normal_text") == "normal_text"
    assert sanitize_csv_cell(123) == "123"
    assert sanitize_csv_cell(None) == ""

def test_sanitize_filename_part_path_traversal():
    """Verify that path traversal and special characters are stripped."""
    assert sanitize_filename_part("../../etc/passwd") == "etcpasswd"
    assert sanitize_filename_part("user/data/file.txt") == "userdatafiletxt"
    assert sanitize_filename_part("tenant_1\r\nX-Injected: True") == "tenant_1XInjectedTrue"
    assert sanitize_filename_part("valid-name_123") == "valid-name_123"

def test_generate_csv_chunks():
    """Verify the streaming generator produces correct, sanitized CSV content."""
    headers = ["id", "name", "amount"]
    data = [
        {"id": "1", "name": "Alice", "amount": "100"},
        {"id": "2", "name": "Bob", "amount": "=SUM(A1:A2)"}, # Should be escaped
        {"id": "3", "name": "Charlie", "amount": None},      # Should be empty string
    ]
    
    chunks = list(generate_csv_chunks(data, headers))
    
    # Combine chunks to verify full content
    full_output = "".join(chunks)
    lines = full_output.strip().split('\n')
    
    # Check header
    assert lines[0] == "id,name,amount"
    # Check row 1
    assert lines[1] == "1,Alice,100"
    # Check row 2 (Sanitization check)
    assert lines[2] == "2,Bob,'=SUM(A1:A2)"
    # Check row 3 (None check)
    assert lines[3] == "3,Charlie,"

def test_generate_csv_chunks_empty_data():
    """Verify behavior with empty data list."""
    headers = ["id", "name"]
    data = []
    chunks = list(generate_csv_chunks(data, headers))
    
    assert len(chunks) == 1  # Only the header chunk
    assert chunks[0].strip() == "id,name"
