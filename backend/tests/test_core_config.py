import pytest
from pydantic import ValidationError
from app.core.config import Settings
from app.core.constants import PROJECT_NAME

def test_project_name_exists():
    # Ensure the constant matches the expected branding
    assert PROJECT_NAME == "RFP Engine"

def test_settings_validation_error():
    """Verify that providing an invalid type for a typed field (like PORT) raises a ValidationError."""
    with pytest.raises(ValidationError):
        # PORT is typed as int; passing a string should trigger validation failure
        Settings(GCP_PROJECT_ID="test", PORT="not-an-int")
