import pytest
from app.services.csv_service import sanitize_csv_cell, sanitize_filename_part, generate_csv_chunks

def test_sanitize_csv_cell_formula_injection():
    assert sanitize_csv_cell(" =SUM(A1:A2)").startswith("'")
    assert sanitize_csv_cell("  -100").startswith("'")
    assert sanitize_csv_cell("normal_text") == "normal_text"

def test_sanitize_filename_part_path_traversal():
    assert sanitize_filename_part("../../etc/passwd") == "etcpasswd"
    assert sanitize_filename_part("tenant_1\r\nX-Injected: True") == "tenant_1X-InjectedTrue"

def test_generate_csv_chunks():
    data = [{"id": "1", "name": "Alice", "notes": "=SUM(1,2)"}]
    headers = ["id", "name", "notes"]
    chunks = list(generate_csv_chunks(data, headers))
    full_output = "".join(chunks)
    assert "id,name,notes" in full_output
    assert "'=SUM(1,2)" in full_output
