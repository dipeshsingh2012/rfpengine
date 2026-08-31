import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import AsyncSessionLocal, engine, Base
from app.core.config import get_settings

@pytest_asyncio.fixture(scope="session")
async def setup_database():
    """
    Sets up the database schema once per test session.
    """
    async with engine.begin() as conn:
        # Drop all tables to ensure a clean state
        await conn.run_sync(Base.metadata.drop_all)
        # Create all tables
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

@pytest_asyncio.fixture(scope="function")
async def db_session(setup_database) -> AsyncGenerator[AsyncSession, None]:
    """
    Provides a clean database session for every individual test.
    Uses a transaction rollback pattern to ensure isolation.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

@pytest.fixture(scope="session")
def settings():
    """
    Provides the application settings for testing.
    """
    return get_settings()
