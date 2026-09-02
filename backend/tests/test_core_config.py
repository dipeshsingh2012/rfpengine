import pytest
from app.core.config import Settings
from app.core.constants import PROJECT_NAME

def test_project_name_exists():
    # Ensure the constant matches the expected branding
    assert PROJECT_NAME == "RFP Engine"

def test_settings_validation_error():
    from pydantic import ValidationError
    with pytest.raises(ValidationError):
        # Invalid type for port
        Settings(gcp_project_id="test", port="not-an-int")
