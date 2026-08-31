import pytest
from app.core.config import get_settings

def test_get_settings_returns_instance():
    """Verify that get_settings returns a Settings object."""
    settings = get_settings()
    assert settings.PROJECT_NAME == "RFP Engine"

def test_database_url_default():
    """Verify the default database URL is correctly set."""
    settings = get_settings()
    assert "postgresql://postgres:postgres@localhost:5432/rfpengine" in settings.DATABASE_URL

def test_settings_env_override(monkeypatch):
    """Verify that environment variables correctly override defaults."""
    monkeypatch.setenv("PROJECT_NAME", "Test Project")
    monkeypatch.setenv("DATABASE_URL", "postgresql://user:pass@remote:5432/db")
    
    # We must clear the cache because get_settings is @lru_cache'd
    get_settings.cache_clear()
    
    settings = get_settings()
    assert settings.PROJECT_NAME == "Test Project"
    assert settings.DATABASE_URL == "postgresql://user:pass@remote:5432/db"
