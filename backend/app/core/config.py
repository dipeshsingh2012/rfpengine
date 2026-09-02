from typing import Optional
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    """
    Application settings managed via environment variables.
    Defaults are provided to prevent ValidationError during pytest collection,
    while maintaining strict typing for Cloud Run deployment and configuration.
    """
    # GCP Configuration
    GCP_PROJECT_ID: str = Field(default="test-project-id")
    GCP_REGION: str = Field(default="us-central1")

    # Database Configuration
    DATABASE_URL: str = Field(default="postgresql://postgres:postgres@localhost:5432/postgres")

    # API Configuration
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "RFP Engine"
    
    # Cloud Run / Deployment Settings
    PORT: int = Field(default=8080)
    HOST: str = Field(default="0.0.0.0")
    ENVIRONMENT: str = Field(default="development")

    # Security
    SECRET_KEY: str = Field(default="super-secret-dev-key-change-in-production")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"  # Ignore extra env vars to prevent validation errors
    )

settings = Settings()

def get_settings() -> Settings:
    """Dependency provider for settings."""
    return settings
