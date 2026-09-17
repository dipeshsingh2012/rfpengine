import pytest
from app.services.upload_service import UploadService

@pytest.mark.asyncio
async def test_process_csv_content():
    service = UploadService()
    content = b"id,name\n1,Alice\n2,Bob"
    result = await service.process_csv_content(content)
    assert len(result) == 2
    assert result[0]["name"] == "Alice"

@pytest.mark.asyncio
async def test_validate_upload_filename():
    service = UploadService()
    assert await service.validate_upload("data.csv") is True
    assert await service.validate_upload("data.txt") is False
