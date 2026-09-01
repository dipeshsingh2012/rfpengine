from typing import List, Optional
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    """
    Application settings managed via environment variables.
    Uses Pydantic Settings for validation and type safety.
    """
    # Project Metadata
    PROJECT_NAME: str = "RFPEngine API"
    APP_NAME: str = "RFPEngine API"
    APP_VERSION: str = "0.2.0"
    ENV: str = "development"
    DEBUG: bool = False

    # API Configuration
    API_V1_STR: str = "/api/v1"
    
    # Database Configuration
    DATABASE_URL: str = "postgresql://user:password@localhost:5432/rfp_db"

    # Security
    SECRET_KEY: str = "super-secret-key-change-me-in-production"
    CORS_ORIGINS: List[str] = ["http://localhost:3000"]
    CORS_ORIGIN_REGEX: str = "chrome-extension://.*"

    # GCP Configuration
    GCP_PROJECT_ID: Optional[str] = None
    GCP_SECRET_MANAGER_ID: Optional[str] = None

    model_config = SettingsConfigDict(
        env_file=".env", 
        env_file_encoding="utf-8",
        extra="ignore"  # Prevents errors if extra env vars are present
    )

    @field_validator("DATABASE_URL")
    @classmethod
    def validate_database_url(cls, v: str) -> str:
        if not v.startswith(("postgresql://", "sqlite://", "mysql://")):
            raise ValueError("DATABASE_URL must be a valid connection string")
        return v

def get_settings() -> Settings:
    """Dependency provider for application settings."""
    return Settings()
