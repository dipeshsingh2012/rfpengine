from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Autonomous Agentic Fleet"
    SECRET_KEY: str = "SUPER_SECRET_JWT_KEY_CHANGE_ME"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # Google OAuth Settings
    GOOGLE_CLIENT_ID: str = "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com"
    GOOGLE_CLIENT_SECRET: str = "YOUR_GOOGLE_CLIENT_SECRET"
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/auth/callback/google"

    class Config:
        env_file = ".env"

settings = Settings()
