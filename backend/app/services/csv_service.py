import csv
import io
import re
from typing import Any, AsyncGenerator, Dict, Iterator, List

def sanitize_csv_cell(value: Any) -> str:
    """
    Strip whitespace and escape formula injection characters.
    Prevents Excel/Sheets from executing code via cells starting with =, +, -, or @.
    """
    val_str = str(value).strip() if value is not None else ""
    dangerous_chars = ('=', '+', '-', '@', '\t', '\r')
    
    if val_str.startswith(dangerous_chars):
        return f"'{val_str}"
    return val_str

def sanitize_filename_part(part: str) -> str:
    """
    Strictly sanitize filename part against path traversal and header splitting.
    Removes any character that isn't alphanumeric, underscore, or hyphen.
    """
    # Remove whitespace and strip, then regex replace non-allowed chars
    clean_part = str(part).strip()
    return re.sub(r"[^a-zA-Z0-9_-]", "", clean_part)

def generate_csv_chunks(rows: List[Dict[str, Any]], headers: List[str]) -> Iterator[str]:
    """
    Memory-efficient streaming generator that yields CSV rows incrementally.
    Prevents OOM (Out of Memory) errors when exporting large datasets.
    """
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write header
    writer.writerow(headers)
    yield output.getvalue()
    output.seek(0)
    output.truncate(0)
    
    # Write rows in chunks
    for row in rows:
        # Sanitize each cell before writing to prevent injection
        sanitized_row = [sanitize_csv_cell(row.get(h, "")) for h in headers]
        writer.writerow(sanitized_row)
        yield output.getvalue()
        output.seek(0)
        output.truncate(0)
