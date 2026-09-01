import pytest
import asyncio
from app.db.postgres import get_db_connection

@pytest.mark.asyncio
async def test_connection_success():
    conn = await get_db_connection()
    assert conn["status"] == "connected"
    assert "driver" in conn
