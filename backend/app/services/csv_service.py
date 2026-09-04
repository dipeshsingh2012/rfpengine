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
        # Prepend a single quote to force the cell to be treated as text
        return f"'{val_str}"
    return val_str

def sanitize_filename_part(part: str) -> str:
    """
    Strictly sanitize filename parts against path traversal and header splitting.
    """
    # Remove any character that isn't alphanumeric, underscore, or hyphen
    return re.sub(r"[^a-zA-Z0-9_-]", "", str(part).strip())

def generate_csv_chunks(rows: List[Dict[str, Any]], headers: List[str]) -> Iterator[str]:
    """
    Memory-efficient streaming generator that yields CSV rows incrementally.
    This prevents high memory consumption when processing large datasets.
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
        # Sanitize each cell before writing
        sanitized_row = [sanitize_csv_cell(row.get(h, "")) for h in headers]
        writer.writerow(sanitized_row)
        
        yield output.getvalue()
        
        # Reset buffer for next chunk
        output.seek(0)
        output.truncate(0)
