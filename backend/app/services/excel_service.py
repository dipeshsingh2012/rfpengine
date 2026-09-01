import io
import re
from typing import Any, Dict, List, Iterator
from openpyxl import Workbook

def sanitize_excel_cell(value: Any) -> Any:
    """
    Prevents Excel Formula Injection by prepending a single quote 
    to values that start with dangerous characters.
    """
    if value is None:
        return ""
    
    val_str = str(value).strip()
    dangerous_chars = ('=', '+', '-', '@', '\t', '\r')
    
    if val_str.startswith(dangerous_chars):
        return f"'{val_str}"
    
    return value

def sanitize_filename(part: str) -> str:
    """
    Strictly sanitizes filename parts to prevent path traversal 
    and header injection attacks.
    """
    # Remove any character that isn't alphanumeric, underscore, or hyphen
    return re.sub(r"[^a-zA-Z0-9_-]", "", str(part).strip())

def generate_excel_stream(data: List[Dict[str, Any]], headers: List[str], chunk_size: int = 8192) -> Iterator[bytes]:
    """
    Generates an Excel file in memory and yields it in chunks for 
    memory-efficient streaming via FastAPI StreamingResponse.
    """
    wb = Workbook()
    ws = wb.active
    
    # Write Headers
    ws.append(headers)
    
    # Write Data Rows
    for row_dict in data:
        sanitized_row = [sanitize_excel_cell(row_dict.get(h, "")) for h in headers]
        ws.append(sanitized_row)
    
    # Save to buffer
    buffer = io.BytesIO()
    wb.save(buffer)
    buffer.seek(0)
    
    # Yield chunks of the buffer
    while True:
        chunk = buffer.read(chunk_size)
        if not chunk:
            break
        yield chunk
    
    buffer.close()
