import pytest
import io
import pandas as pd
from app.services.excel_service import sanitize_excel_cell, generate_excel_buffer, stream_excel_generator

def test_sanitize_excel_cell_injection():
    """Test that dangerous characters are escaped with a single quote."""
    assert sanitize_excel_cell("=SUM(A1:A10)") == "'=SUM(A1:A10)"
    assert sanitize_excel_cell("+123") == "'+123"
    assert sanitize_excel_cell("-50") == "'-50"
    assert sanitize_excel_cell("@username") == "'@username"
    assert sanitize_excel_cell("normal_text") == "normal_text"
    assert sanitize_excel_cell(123) == 123  # Numbers should remain numbers

def test_generate_excel_buffer_success():
    """Test successful generation of an Excel buffer."""
    data = [
        {"id": 1, "name": "Alice", "formula": "=SUM(1,2)"},
        {"id": 2, "name": "Bob", "formula": "normal"}
    ]
    headers = ["id", "name", "formula"]
    
    buffer = generate_excel_buffer(data, headers)
    
    assert isinstance(buffer, io.BytesIO)
    
    # Read the buffer back with pandas to verify content
    df = pd.read_excel(buffer)
    
    assert len(df) == 2
    assert list(df.columns) == headers
    # Verify sanitization worked in the resulting file
    assert df.iloc[0]["formula"] == "'=SUM(1,2)"
    assert df.iloc[1]["formula"] == "normal"

def test_generate_excel_buffer_empty_data():
    """Test that providing no data/headers raises a ValueError."""
    with pytest.raises(ValueError, match="No data or headers provided"):
        generate_excel_buffer([], None)

def test_stream_excel_generator():
    """Test the async generator yields the correct bytes."""
    import asyncio

    async def run_test():
        data = [{"id": 1, "val": "test"}]
        headers = ["id", "val"]
        
        gen = stream_excel_generator(data, headers)
        chunks = []
        async for chunk in gen:
            chunks.append(chunk)
        
        assert len(chunks) == 1
        # Verify it's a valid excel file
        df = pd.read_excel(io.BytesIO(chunks[0]))
        assert df.iloc[0]["val"] == "test"

    asyncio.run(run_test())
