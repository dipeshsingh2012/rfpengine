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
