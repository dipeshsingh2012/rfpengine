import pytest
import io
from app.services.excel_service import sanitize_excel_cell, sanitize_filename, generate_excel_stream

def test_sanitize_excel_cell_injection():
    """Tests that formula injection characters are escaped."""
    assert sanitize_excel_cell("=SUM(A1:A10)") == "'=SUM(A1:A10)"
    assert sanitize_excel_cell("+100") == "'+100"
    assert sanitize_excel_cell("-50") == "'-50"
    assert sanitize_excel_cell("@username") == "'@username"
    assert sanitize_excel_cell("normal_text") == "normal_text"
    assert sanitize_excel_cell(123) == 123
    assert sanitize_excel_cell(None) == ""

def test_sanitize_filename_security():
    """Tests that filenames are stripped of dangerous characters."""
    assert sanitize_filename("../../etc/passwd") == "etcpasswd"
    assert sanitize_filename("report_2023!@#.xlsx") == "report_2023xlsx"
    assert sanitize_filename("tenant_123\r\nInjected") == "tenant_123Injected"
    assert sanitize_filename("valid-name_123") == "valid-name_123"

def test_generate_excel_stream_content():
    """Tests that the generator yields valid Excel bytes."""
    headers = ["id", "name", "amount"]
    data = [
        {"id": 1, "name": "Alice", "amount": 100.0},
        {"id": 2, "name": "=BAD_FORMULA", "amount": 200.0},
    ]
    
    chunks = list(generate_excel_stream(data, headers))
    
    # Ensure we actually got chunks
    assert len(chunks) > 0
    
    # Combine chunks and verify it's a valid zip (Excel files are zipped XML)
    full_content = b"".join(chunks)
    assert len(full_content) > 0
    # A basic check for the zip magic number
    assert full_content.startswith(b'\x50\x4b\x03\x04')

def test_generate_excel_stream_empty_data():
    """Tests the service with empty data sets."""
    headers = ["id", "name"]
    data = []
    
    chunks = list(generate_excel_stream(data, headers))
    assert len(chunks) > 0
    assert len(b"".join(chunks)) > 0
