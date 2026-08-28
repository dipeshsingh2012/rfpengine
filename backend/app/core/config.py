from __future__ import annotations

import json
import re
from functools import lru_cache
from typing import Any, Dict, List, Optional, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # App Settings
    app_name: str = "RFPEngine API"
    app_version: str = "0.2.0"
    env: str = "dev"  # "dev", "staging", "prod"
    debug: bool = False

    @property
    def is_production(self) -> bool:
        return self.env.lower() in ("prod", "production")

    # Google Cloud Secret Manager Settings
    gcp_project_id: Optional[str] = None
    gcp_secret_manager_enabled: bool = False
    gcp_secret_prefix: str = "rfpengine-"  # Standard Terraform prefix: rfpengine-
    google_application_credentials: Optional[str] = None

    # LLM & Embedding Provider Settings ("vertexai" or "openai")
    llm_provider: str = "vertexai"
    gemini_model: str = "gemini-2.5-flash"
    vertex_embedding_model: str = "text-embedding-004"
    embedding_dimension: int = 768

    # OpenAI Settings (Optional fallback)
    openai_api_key: Optional[str] = None
    openai_embedding_model: str = "text-embedding-3-small"
    openai_chat_model: str = "gpt-4o"

    # PostgreSQL Database Settings
    database_url: Optional[str] = None
    postgres_user: Optional[str] = None
    postgres_password: Optional[str] = None
    postgres_host: Optional[str] = None
    postgres_port: int = 5432
    postgres_db: Optional[str] = None
    postgres_ssl: bool = True

    # Elasticsearch / Elastic Cloud Settings
    elasticsearch_url: str = "http://localhost:9200"
    elasticsearch_api_key: Optional[str] = None
    elastic_cloud_id: Optional[str] = None
    elasticsearch_username: Optional[str] = None
    elasticsearch_password: Optional[str] = None
    elasticsearch_index: str = "rfq_knowledge_base"
    elasticsearch_verify_certs: bool = False

    # Pinecone Serverless Settings
    pinecone_api_key: Optional[str] = None
    pinecone_index: str = "rfq-knowledge-base"
    pinecone_environment: Optional[str] = None
    pinecone_host: Optional[str] = None
    pinecone_cloud: str = "aws"
    pinecone_region: str = "us-east-1"
    pinecone_dimension: int = 768
    pinecone_metric: str = "cosine"

    # CORS Settings
    cors_origins: Union[str, List[str]] = "http://localhost:5173,http://localhost:3000"
    cors_origin_regex: str = r"chrome-extension://.*"

    def apply_gcp_secrets(self, secrets: Dict[str, Any]) -> None:
        """
        Dynamically applies secrets retrieved from GCP Secret Manager.
        """
        if not secrets:
            return

        for k, v in secrets.items():
            normalized_key = k.upper().replace("-", "_")
            if normalized_key.endswith("OPENAI_API_KEY") or normalized_key == "OPENAI_API_KEY":
                self.openai_api_key = v
            elif normalized_key.endswith("DATABASE_URL") or normalized_key == "DATABASE_URL":
                self.database_url = v
            elif normalized_key.endswith("PINECONE_API_KEY") or normalized_key == "PINECONE_API_KEY":
                self.pinecone_api_key = v
            elif normalized_key.endswith("PINECONE_INDEX") or normalized_key == "PINECONE_INDEX":
                self.pinecone_index = v
            elif normalized_key.endswith("ELASTICSEARCH_API_KEY") or normalized_key == "ELASTICSEARCH_API_KEY":
                self.elasticsearch_api_key = v
            elif normalized_key.endswith("ELASTIC_CLOUD_ID") or normalized_key == "ELASTIC_CLOUD_ID":
                self.elastic_cloud_id = v
            elif normalized_key.endswith("ELASTICSEARCH_URL") or normalized_key == "ELASTICSEARCH_URL":
                self.elasticsearch_url = v
            elif normalized_key.endswith("ELASTICSEARCH_PASSWORD") or normalized_key == "ELASTICSEARCH_PASSWORD":
                self.elasticsearch_password = v

    @property
    def effective_database_url(self) -> str:
        """
        Returns the resolved database URL from either DATABASE_URL or individual POSTGRES_* components.
        """
        if self.database_url:
            return self.database_url
        if self.postgres_host and self.postgres_user and self.postgres_password and self.postgres_db:
            ssl_param = "?ssl=require" if self.postgres_ssl else ""
            return (
                f"postgresql+asyncpg://{self.postgres_user}:{self.postgres_password}"
                f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}{ssl_param}"
            )
        return "postgresql+asyncpg://postgres:postgres@localhost:5432/rfpengine"

    @property
    def masked_database_url(self) -> str:
        """
        Returns the database URL with credentials redacted for safe logging and diagnostics.
        """
        url = self.effective_database_url
        return re.sub(r"://([^:@]+):([^@]+)@", r"://\1:***@", url)

    @property
    def cors_origins_list(self) -> List[str]:
        if isinstance(self.cors_origins, list):
            return self.cors_origins
        if isinstance(self.cors_origins, str):
            if self.cors_origins.startswith("[") and self.cors_origins.endswith("]"):
                try:
                    return json.loads(self.cors_origins)
                except Exception:
                    pass
            return [o.strip() for o in self.cors_origins.split(",") if o.strip()]
        return ["http://localhost:5173"]

    model_config = SettingsConfigDict(
        env_file=(".env", "../.env", "../../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache()
def get_settings() -> Settings:
    return Settings()
