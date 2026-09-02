import pytest
import sys
import os

# Ensure the backend directory is in the path for correct imports during pytest execution
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.services.csv_service import sanitize_csv_cell, sanitize_filename_part, generate_csv_chunks

def test_sanitize_csv_cell_formula_injection():
    """Verify that dangerous formula prefixes are escaped with a single quote."""
    assert sanitize_csv_cell("=SUM(A1:A2)") == "'=SUM(A1:A2)"
    assert sanitize_csv_cell("+123") == "'+123"
    assert sanitize_csv_cell("-100") == "'-100"
    assert sanitize_csv_cell("@username") == "'@username"
    assert sanitize_csv_cell("normal_text") == "normal_text"
    assert sanitize_csv_cell(123) == "123"

def test_sanitize_filename_part_path_traversal():
    """Verify that path traversal characters and control characters are stripped."""
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
    # Check sanitized formula
    assert "'=SUM(1,2)" in full_output
    # Check normal data
    assert "Alice" in full_output
    assert "Bob" in full_output
    # Check row separation
    assert "1,Alice,'=SUM(1,2)" in full_output
