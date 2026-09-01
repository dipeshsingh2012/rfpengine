import io
import re
from typing import Any, Dict, List, Union, Optional, AsyncGenerator, Iterator
import pandas as pd

def sanitize_excel_cell(value: Any) -> Any:
    """
    Sanitize cell content to prevent Excel Formula Injection (CSV Injection).
    If a value starts with dangerous characters, prepend a single quote.
    """
    if value is None:
        return ""
    
    val_str = str(value).strip()
    # Dangerous characters that trigger formula execution in Excel/Google Sheets
    dangerous_chars = ('=', '+', '-', '@', '\t', '\r')
    
    if val_str.startswith(dangerous_chars):
        return f"'{val_str}"
    
    return value

def generate_excel_buffer(data: List[Dict[str, Any]], headers: Optional[List[str]] = None) -> io.BytesIO:
    """
    Converts a list of dictionaries into an Excel file stored in a BytesIO buffer.
    
    Args:
        data: List of dictionaries representing rows.
        headers: Optional list of column names. If None, keys from the first dict are used.
        
    Returns:
        io.BytesIO: A buffer containing the Excel file (xlsx format).
    """
    if not data and not headers:
        raise ValueError("No data or headers provided for Excel generation.")

    # Create DataFrame
    df = pd.DataFrame(data)

    # Reorder columns if headers are provided
    if headers:
        # Ensure all requested headers exist in the dataframe, fill missing with None
        for h in headers:
            if h not in df.columns:
                df[h] = None
        df = df[headers]

    # Apply sanitization to all object (string) columns to prevent formula injection
    for col in df.select_dtypes(include=['object']).columns:
        df[col] = df[col].apply(sanitize_excel_cell)

    # Write to buffer
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Sheet1')
    
    output.seek(0)
    return output

async def stream_excel_generator(data: List[Dict[str, Any]], headers: List[str]) -> AsyncGenerator[bytes, None]:
    """
    Async generator that yields the entire Excel buffer. 
    Note: Excel is a zipped format, so it cannot be easily streamed row-by-row 
    like CSV; we yield the full buffer to satisfy the AsyncGenerator interface.
    """
    buffer = generate_excel_buffer(data, headers)
    yield buffer.getvalue()
