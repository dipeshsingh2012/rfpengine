import pytest
from app.services.email_service import EmailService

@pytest.mark.asyncio
async def test_send_email_success():
    service = EmailService()
    success = await service.send_email_async(
        recipient="user@example.com",
        subject="Hello",
        body="World"
    )
    assert success is True

@pytest.mark.asyncio
async def test_send_email_invalid_recipient():
    service = EmailService()
    success = await service.send_email_async(
        recipient="invalid-email",
        subject="Hello",
        body="World"
    )
    assert success is False
