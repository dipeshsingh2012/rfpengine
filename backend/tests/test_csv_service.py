import pytest
from app.services.csv_service import sanitize_csv_cell, sanitize_filename_part, generate_csv_chunks

def test_sanitize_csv_cell_formula_injection():
    """Verify that dangerous formula characters are escaped with a single quote."""
    assert sanitize_csv_cell(" =SUM(A1:A2)").startswith("'")
    assert sanitize_csv_cell("  -100").startswith("'")
    assert sanitize_csv_cell("@username").startswith("'")
    assert sanitize_csv_cell("normal_text") == "normal_text"
    assert sanitize_csv_cell(None) == ""

def test_sanitize_filename_part_path_traversal():
    """Verify that path traversal attempts and control characters are stripped."""
    assert sanitize_filename_part("../../etc/passwd") == "etcpasswd"
    assert sanitize_filename_part("tenant_1\r\nX-Injected: True") == "tenant_1XInjectedTrue"
    assert sanitize_filename_part("file name!.txt") == "filenametxt"

def test_generate_csv_chunks():
    """Verify the streaming generator produces correct, sanitized CSV content."""
    data = [
        {"id": "1", "name": "Alice", "notes": "=SUM(1,2)"},
        {"id": "2", "name": "Bob", "notes": "normal"}
    ]
    headers = ["id", "name", "notes"]
    
    # Collect all chunks
    chunks = list(generate_csv_chunks(data, headers))
    full_output = "".join(chunks)
    
    # Check headers exist
    assert "id,name,notes" in full_output
    
    # Check that the formula in the first row was escaped
    assert "'=SUM(1,2)" in full_output
    
    # Check that the second row is present and correct
    assert "2,Bob,normal" in full_output
    
    # Verify chunk count (1 header + 2 data rows = 3 chunks)
    assert len(chunks) == 3
