import io
import re
from typing import Any, Dict, Iterator, List

def sanitize_excel_cell(value: Any) -> str:
    """Strip whitespace and escape formula injection characters for Excel/CSV."""
    val_str = str(value) if value is not None else ""
    cleaned = val_str.strip()
    dangerous_chars = ('=', '+', '-', '@', '\t', '\r')
    if cleaned.startswith(dangerous_chars):
        return f"'{val_str}"
    return val_str

def sanitize_filename_part(part: str) -> str:
    """Strictly sanitize filename part against path traversal and header splitting."""
    return re.sub(r"[^a-zA-Z0-9_-]", "", str(part).strip())

def generate_excel_csv_chunks(rows: List[Dict[str, Any]], headers: List[str]) -> Iterator[str]:
    """Memory-efficient streaming generator that yields sanitized CSV/Excel rows incrementally."""
    import csv
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write header
    writer.writerow(headers)
    yield output.getvalue()
    output.seek(0)
    output.truncate(0)
    
    # Write rows in chunks
    for row in rows:
        sanitized_row = [sanitize_excel_cell(row.get(h, "")) for h in headers]
        writer.writerow(sanitized_row)
        yield output.getvalue()
        output.seek(0)
        output.truncate(0)
