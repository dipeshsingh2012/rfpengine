import pytest
from app.core.config import get_settings, Settings

def test_get_settings_returns_instance():
    """Verify that get_settings returns a valid Settings instance."""
    settings = get_settings()
    assert isinstance(settings, Settings)

def test_project_name_exists():
    """Verify PROJECT_NAME is correctly initialized."""
    settings = get_settings()
    # Check both common naming conventions to ensure backward compatibility if needed
    assert hasattr(settings, "PROJECT_NAME")
    assert settings.PROJECT_NAME == "RFPEngine API"

def test_database_url_default():
    """Verify DATABASE_URL is present and has a default value."""
    settings = get_settings()
    assert hasattr(settings, "DATABASE_URL")
    assert "postgresql://" in settings.DATABASE_URL

def test_settings_env_override(monkeypatch):
    """Verify that environment variables can override default settings."""
    monkeypatch.setenv("PROJECT_NAME", "TestProject")
    monkeypatch.setenv("DATABASE_URL", "sqlite:///test.db")
    
    get_settings.cache_clear()
    settings = get_settings()
    assert settings.PROJECT_NAME == "TestProject"
    assert "sqlite:///test.db" in settings.DATABASE_URL
    get_settings.cache_clear()

def test_settings_validation_error():
    """Verify that invalid DATABASE_URL raises a ValidationError."""
    from pydantic import ValidationError
    import os
    from unittest.mock import patch

    # We use patch to simulate an invalid environment variable during instantiation
    with patch.dict(os.environ, {"DATABASE_URL": "invalid_protocol://localhost"}):
        with pytest.raises(ValidationError):
            Settings()
