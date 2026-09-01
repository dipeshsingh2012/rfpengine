import pytest
import pandas as pd
import io
import asyncio
from app.services.excel_service import ExcelService

@pytest.fixture
def excel_service():
    return ExcelService()

@pytest.fixture
def sample_excel_buffer():
    """Creates an in-memory Excel file for testing."""
    output = io.BytesIO()
    data = {
        "Question": ["Do you use MFA?", "Is data encrypted?"],
        "Response": ["Yes", "=SUM(1,2)"],  # Testing formula injection
        "Implementation Notes": ["Used Okta", "AES-256"]
    }
    df = pd.DataFrame(data)
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False)
    output.seek(0)
    return output

@pytest.mark.asyncio
async def test_parse_excel_buffer_success(excel_service, sample_excel_buffer):
    df = await excel_service.parse_excel_buffer(sample_excel_buffer)
    assert not df.empty
    assert len(df) == 2
    assert list(df.columns) == ["Question", "Response", "Implementation Notes"]

@pytest.mark.asyncio
async def test_parse_excel_buffer_empty(excel_service):
    empty_buffer = io.BytesIO()
    # Create an empty excel file
    df_empty = pd.DataFrame()
    with pd.ExcelWriter(empty_buffer, engine='openpyxl') as writer:
        df_empty.to_excel(writer, index=False)
    empty_buffer.seek(0)
    
    df = await excel_service.parse_excel_buffer(empty_buffer)
    assert df.empty

@pytest.mark.asyncio
async def test_transform_to_caiq_format(excel_service):
    data = {
        "Question": ["Q1"],
        "Response": ["R1"],
        "Implementation Notes": ["N1"]
    }
    df = pd.DataFrame(data)
    caiq_data = excel_service.transform_to_caiq_format(df)
    
    assert len(caiq_data) == 1
    assert caiq_data[0]["question"] == "Q1"
    assert caiq_data[0]["notes"] == "N1"

@pytest.mark.asyncio
async def test_stream_dataframe_to_csv_sanitization(excel_service):
    data = {
        "id": [1, 2],
        "val": ["normal", "=SUM(1,2)"]  # The second row contains a formula
    }
    df = pd.DataFrame(data)
    
    chunks = []
    async for chunk in excel_service.stream_dataframe_to_csv(df, chunk_size=1):
        chunks.append(chunk)
    
    full_csv = "".join(chunks)
    
    # Check that the formula was escaped with a single quote
    assert "'=SUM(1,2)" in full_csv
    assert "normal" in full_csv

@pytest.mark.asyncio
async def test_parse_excel_buffer_invalid_format(excel_service):
    invalid_buffer = io.BytesIO(b"this is not an excel file")
    with pytest.raises(ValueError, match="Failed to parse Excel buffer"):
        await excel_service.parse_excel_buffer(invalid_buffer)

def test_sanitize_csv_cell_logic(excel_service):
    # Test standard text
    assert excel_service.sanitize_csv_cell("hello") == "hello"
    # Test formula injection characters
    assert excel_service.sanitize_csv_cell("=1+1") == "'=1+1"
    assert excel_service.sanitize_csv_cell("+100") == "'+100"
    assert excel_service.sanitize_csv_cell("-50") == "'-50"
    assert excel_service.sanitize_csv_cell("@user") == "'@user"
    # Test whitespace handling
    assert excel_service.sanitize_csv_cell("  =1+1") == "'=1+1"
