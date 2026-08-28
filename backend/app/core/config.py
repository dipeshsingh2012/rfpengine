from __future__ import annotations

import os
from functools import lru_cache
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # App Settings
    app_name: str = "RFPEngine API"
    app_version: str = "0.2.0"
    debug: bool = False

    # OpenAI Settings
    openai_api_key: Optional[str] = None
    openai_embedding_model: str = "text-embedding-3-small"
    openai_chat_model: str = "gpt-4o"

    # PostgreSQL Database Settings
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/rfpengine"

    # Elasticsearch Settings
    elasticsearch_url: str = "http://localhost:9200"
    elasticsearch_username: Optional[str] = None
    elasticsearch_password: Optional[str] = None
    elasticsearch_index: str = "rfq_knowledge_base"
    elasticsearch_verify_certs: bool = False

    # Pinecone Settings
    pinecone_api_key: Optional[str] = None
    pinecone_index: str = "rfq-knowledge-base"
    pinecone_environment: Optional[str] = None
    pinecone_host: Optional[str] = None
    pinecone_dimension: int = 1536
    pinecone_metric: str = "cosine"

    # CORS Settings
    cors_origins: List[str] = ["http://localhost:5173", "http://localhost:3000"]
    cors_origin_regex: str = r"chrome-extension://.*"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache()
def get_settings() -> Settings:
    return Settings()

