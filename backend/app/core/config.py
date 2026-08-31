from functools import lru_cache
from typing import Optional
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    """
    Application settings management using Pydantic Settings.
    Environment variables take precedence over defaults.
    """
    # Project Metadata
    PROJECT_NAME: str = "RFP Engine"
    API_V1_STR: str = "/api/v1"
    
    # Database Configuration
    # Default for local development; overridden by CI environment variables
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/rfpengine"
    
    # Security
    SECRET_KEY: str = "super-secret-dev-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    model_config = SettingsConfigDict(
        env_file=".env", 
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @field_validator("DATABASE_URL")
    @classmethod
    def validate_db_url(cls, v: str) -> str:
        if not v.startswith("postgresql"):
            raise ValueError("DATABASE_URL must start with 'postgresql'")
        return v

@lru_cache()
def get_settings() -> Settings:
    """
    Dependency provider for application settings.
    Uses lru_cache to ensure settings are parsed only once.
    """
    return Settings()
