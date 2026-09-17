import sys
from pathlib import Path

# Ensure backend root is always on sys.path regardless of execution working directory
backend_dir = str(Path(__file__).resolve().parent.parent)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

import pytest
from typing import Any
from app.core.config import get_settings, Settings

@pytest.fixture(scope="session")
def settings() -> Settings:
    """
    Provides the application settings for the entire test session.
    Using a session scope ensures we don't re-instantiate settings repeatedly.
    """
    return get_settings()

@pytest.fixture(scope="session")
def app_settings_dict() -> dict[str, Any]:
    """Provides settings as a dictionary for easy comparison in tests."""
    return get_settings().model_dump()


def pytest_sessionstart(session):
    """
    Ensure database schema is created once per test session if database is reachable.
    If database is unreachable (e.g. offline unit testing or sandboxed network),
    safely continue so unit tests can still run without failure.
    """
    import asyncio
    from app.core.db import Base, get_engine, close_db_connection
    import app.models.db_models  # noqa: F401 - Register all models with Base.metadata

    async def _init_schema():
        try:
            engine = get_engine()
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
        except Exception:
            pass
        finally:
            await close_db_connection()

    try:
        asyncio.run(_init_schema())
    except Exception:
        pass

