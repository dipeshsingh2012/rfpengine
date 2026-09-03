from typing import Optional
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    """
    Application settings managed via environment variables.
    Provides robust defaults to prevent ValidationError during pytest collection
    while maintaining strict typing for production and Cloud Run environments.
    """
    PROJECT_NAME: str = Field(default="Autonomous Agentic Fleet")
    SECRET_KEY: str = Field(default="super-secret-dev-key-change-in-production")
    ALGORITHM: str = Field(default="HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=1440)  # 24 hours
    
    # Google OAuth Settings
    GOOGLE_CLIENT_ID: str = Field(default="YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com")
    GOOGLE_CLIENT_SECRET: str = Field(default="YOUR_GOOGLE_CLIENT_SECRET")
    GOOGLE_REDIRECT_URI: str = Field(default="http://localhost:8000/auth/callback/google")

    # Cloud Run & Environment Configuration
    PORT: int = Field(default=8080)
    HOST: str = Field(default="0.0.0.0")
    ENVIRONMENT: str = Field(default="development")
    API_V1_STR: str = Field(default="/api/v1")
    DATABASE_URL: str = Field(default="postgresql://postgres:postgres@localhost:5432/postgres")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()

def get_settings() -> Settings:
    """Dependency provider for settings ensuring test suite compatibility."""
    return settings
