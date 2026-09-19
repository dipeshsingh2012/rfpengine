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

    # Algolia Configuration
    ALGOLIA_APP_ID: str = Field(default="")
    ALGOLIA_API_KEY: str = Field(default="")
    ALGOLIA_INDEX_NAME: str = Field(default="rfp_knowledge_base")

    # GCP Secret Manager Configuration
    GCP_SECRET_MANAGER_ENABLED: bool = Field(default=False)
    GCP_SECRET_PREFIX: str = Field(default="rfpengine-")

    # Vector / Pinecone Configuration
    PINECONE_API_KEY: str = Field(default="")
    PINECONE_INDEX: str = Field(default="rfp-knowledge-base")
    PINECONE_CLOUD: str = Field(default="aws")
    PINECONE_REGION: str = Field(default="us-east-1")

    # LLM & Vertex AI Settings
    LLM_PROVIDER: str = Field(default="vertexai")
    GEMINI_MODEL: str = Field(default="gemini-2.5-flash")
    VERTEX_EMBEDDING_MODEL: str = Field(default="text-embedding-004")
    EMBEDDING_DIMENSION: int = Field(default=768)
    GOOGLE_APPLICATION_CREDENTIALS: Optional[str] = Field(default=None)
    GOOGLE_CLIENT_ID: str = Field(default="")

    @property
    def algolia_app_id(self) -> str:
        return self.ALGOLIA_APP_ID

    @property
    def algolia_api_key(self) -> str:
        return self.ALGOLIA_API_KEY

    @property
    def algolia_index_name(self) -> str:
        return self.ALGOLIA_INDEX_NAME

    @property
    def database_url(self) -> str:
        return self.DATABASE_URL

    @property
    def effective_database_url(self) -> str:
        return self.DATABASE_URL

    @property
    def debug(self) -> bool:
        return self.ENVIRONMENT.lower() in ("development", "dev", "local")

    @property
    def gcp_project_id(self) -> str:
        return self.GCP_PROJECT_ID

    @property
    def pinecone_api_key(self) -> str:
        return self.PINECONE_API_KEY

    @property
    def pinecone_index(self) -> str:
        return self.PINECONE_INDEX

    @property
    def pinecone_dimension(self) -> int:
        return self.EMBEDDING_DIMENSION

    @property
    def pinecone_metric(self) -> str:
        return "cosine"

    @property
    def effective_pinecone_namespace(self) -> str:
        return "default"

    @property
    def gemini_model(self) -> str:
        return self.GEMINI_MODEL

    @property
    def vertex_embedding_model(self) -> str:
        return self.VERTEX_EMBEDDING_MODEL

    @property
    def embedding_dimension(self) -> int:
        return self.EMBEDDING_DIMENSION

    @property
    def google_application_credentials(self) -> Optional[str]:
        return self.GOOGLE_APPLICATION_CREDENTIALS

    @property
    def env(self) -> str:
        return self.ENVIRONMENT

    @property
    def app_version(self) -> str:
        return "1.0.0"

    @property
    def gcp_secret_manager_enabled(self) -> bool:
        return self.GCP_SECRET_MANAGER_ENABLED

    @property
    def gcp_secret_prefix(self) -> str:
        return self.GCP_SECRET_PREFIX

    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore"  # Ignore extra env vars to prevent validation errors
    )

settings = Settings()

def get_settings() -> Settings:
    """Dependency provider for settings."""
    return settings
