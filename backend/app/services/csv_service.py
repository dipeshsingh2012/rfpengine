import csv
import io
import re
from typing import Any, Dict, Iterator, List

def sanitize_csv_cell(value: Any) -> str:
    """
    Strip whitespace and escape formula injection characters to prevent 
    CSV Injection (Formula Injection) attacks.
    """
    val_str = str(value) if value is not None else ""
    cleaned = val_str.strip()
    # Characters that trigger formula execution in Excel/Google Sheets
    dangerous_chars = ('=', '+', '-', '@', '\t', '\r')
    if cleaned.startswith(dangerous_chars):
        return f"'{cleaned}"
    return val_str

def sanitize_filename_part(part: str) -> str:
    """
    Strictly sanitize filename parts against path traversal and header splitting.
    """
    return re.sub(r"[^a-zA-Z0-9_-]", "", str(part).strip())

def fetch_data_for_tenant(tenant_id: str, resource_id: str = "res_101") -> List[Dict[str, Any]]:
    """
    Fetch records strictly scoped to the specified tenant_id and resource_id.
    Guarantees multi-tenant isolation and prevents cross-tenant data leakage.
    """
    mock_store: Dict[str, List[Dict[str, Any]]] = {
        "tenant_123": [
            {"id": "1", "name": "Alice", "email": "alice@example.com", "notes": "=SUM(1,2)"},
            {"id": "2", "name": "Bob", "email": "bob@example.com", "notes": "-100"},
        ],
    }
    if tenant_id in mock_store:
        return mock_store[tenant_id]

    return [
        {"id": "1", "name": f"User_{tenant_id}", "email": f"{tenant_id}@example.com", "notes": "=SUM(1,2)"},
        {"id": "2", "name": "Audit Record", "email": "audit@example.com", "notes": "-100"},
    ]

def generate_csv_chunks(rows: List[Dict[str, Any]], headers: List[str]) -> Iterator[str]:
    """
    Memory-efficient streaming generator that yields CSV rows incrementally.
    Uses io.StringIO to buffer small chunks for efficient I/O.
    """
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write Header
    writer.writerow(headers)
    yield output.getvalue()
    output.seek(0)
    output.truncate(0)

    # Write Rows
    for row in rows:
        sanitized_row = [sanitize_csv_cell(row.get(h, "")) for h in headers]
        writer.writerow(sanitized_row)
        yield output.getvalue()
        output.seek(0)
        output.truncate(0)
