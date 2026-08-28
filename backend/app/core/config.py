from __future__ import annotations

import json
import re
from functools import lru_cache
from typing import Any, Dict, List, Optional, Union
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # App & Environment Settings
    app_name: str = "RFPEngine API"
    app_version: str = "0.2.0"
    env: str = "local"  # "local", "dev", "staging", "prod"
    debug: bool = False

    @property
    def is_production(self) -> bool:
        return self.env.lower() in ("prod", "production")

    @property
    def is_local(self) -> bool:
        return self.env.lower() in ("local", "dev", "test")

    # Google Cloud & Vertex AI Settings
    gcp_project_id: Optional[str] = None
    gcp_secret_manager_enabled: bool = True
    gcp_secret_prefix: str = "rfpengine-"
    google_application_credentials: Optional[str] = None

    llm_provider: str = "vertexai"
    gemini_model: str = "gemini-2.5-flash"
    vertex_embedding_model: str = "text-embedding-004"
    embedding_dimension: int = 768

    # PostgreSQL Database Settings (Neon Cloud)
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
    elasticsearch_index: str = "rfq_knowledge_base"
    elasticsearch_verify_certs: bool = True

    # Pinecone Serverless Settings
    pinecone_api_key: Optional[str] = None
    pinecone_index: str = "rfq-knowledge-base"
    pinecone_cloud: str = "aws"
    pinecone_region: str = "us-east-1"
    pinecone_dimension: int = 768
    pinecone_metric: str = "cosine"
    pinecone_namespace: Optional[str] = None

    @property
    def effective_pinecone_namespace(self) -> str:
        """
        Returns environment-specific Pinecone namespace to isolate local vs prod vector embeddings.
        """
        if self.pinecone_namespace is not None:
            return self.pinecone_namespace
        return "prod" if self.is_production else "local"

    # CORS Settings
    cors_origins: Union[str, List[str]] = "http://localhost:5173,http://localhost:3000,https://www.rfpengine.net,https://rfpengine.net"
    cors_origin_regex: str = r"chrome-extension://.*"

    def apply_gcp_secrets(self, secrets: Dict[str, Any]) -> None:
        """
        Dynamically applies secrets retrieved from GCP Secret Manager.
        """
        if not secrets:
            return

        for k, v in secrets.items():
            normalized_key = k.upper().replace("-", "_")
            if normalized_key.endswith("DATABASE_URL") or normalized_key == "DATABASE_URL":
                self.database_url = v
            elif normalized_key.endswith("PINECONE_API_KEY") or normalized_key == "PINECONE_API_KEY":
                self.pinecone_api_key = v
            elif normalized_key.endswith("PINECONE_INDEX") or normalized_key == "PINECONE_INDEX":
                self.pinecone_index = v
            elif normalized_key.endswith("ELASTICSEARCH_API_KEY") or normalized_key == "ELASTICSEARCH_API_KEY":
                self.elasticsearch_api_key = v
            elif normalized_key.endswith("ELASTICSEARCH_URL") or normalized_key == "ELASTICSEARCH_URL":
                self.elasticsearch_url = v

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
        env_file=(".env.local", ".env", "../.env.local", "../.env", "../../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache()
def get_settings() -> Settings:
    return Settings()
