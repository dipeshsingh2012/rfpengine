import pytest
from app.services.csv_service import generate_csv_chunks, sanitize_csv_cell

def test_generate_csv_chunks_output():
    data = [{"id": "1", "name": "Test"}]
    headers = ["id", "name"]
    chunks = list(generate_csv_chunks(data, headers))
    assert len(chunks) > 0
    assert "id,name" in chunks[0]
    assert "1,Test" in "".join(chunks)

def test_sanitize_csv_cell_injection():
    assert sanitize_csv_cell("=SUM(A1)") == "'=SUM(A1)"
    assert sanitize_csv_cell("normal") == "normal"
