import asyncio
from typing import Any, Dict

async def get_db_connection() -> Dict[str, Any]:
    """Simulates an asynchronous database connection."""
    await asyncio.sleep(0.01)
    return {"status": "connected", "driver": "asyncpg"}
