import pytest
from app.core.config import get_settings

def test_settings_load_defaults(settings):
    """
    Verify that settings load with default values when no env vars are present.
    This confirms the fix for the ValidationError.
    """
    assert settings.GCP_PROJECT_ID == "test-project-id"
    assert settings.PROJECT_NAME == "RFP Engine"

def test_settings_get_settings_dependency():
    """Verify the dependency provider works."""
    deps_settings = get_settings()
    assert deps_settings.GCP_PROJECT_ID == "test-project-id"
