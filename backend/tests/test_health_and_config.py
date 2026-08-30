from __future__ import annotations

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.config import Settings, get_settings
from app.core.db import normalize_database_url
from app.main import app


@pytest.mark.asyncio
async def test_health_endpoint_positive():
    """Positive test: /health endpoint returns 200 with structured service statuses."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert "version" in data
        assert "services" in data
        assert isinstance(data["services"], dict)


def test_config_settings_defaults():
    """Positive test: Settings loads default environment and properties."""
    settings = get_settings()
    assert settings.app_name == "RFPEngine API"
    assert settings.app_version == "0.2.0"
    assert isinstance(settings.cors_origins_list, list)


def test_config_apply_gcp_secrets():
    """Positive test: Dynamic secrets injection from GCP Secret Manager."""
    settings = Settings()
    dynamic_secrets = {
        "PINECONE_API_KEY": "pc-test-mock-secret",
        "DATABASE_URL": "postgresql://test_user:test_pass@localhost:5432/test_db",
    }
    settings.apply_gcp_secrets(dynamic_secrets)
    assert settings.pinecone_api_key == "pc-test-mock-secret"
    assert settings.database_url == "postgresql://test_user:test_pass@localhost:5432/test_db"


@pytest.mark.parametrize(
    "raw_url,expected_prefix",
    [
        ("postgres://user:pass@host:5432/db", "postgresql+asyncpg://"),
        ("postgresql://user:pass@host:5432/db", "postgresql+asyncpg://"),
        ("postgresql+asyncpg://user:pass@host:5432/db", "postgresql+asyncpg://"),
    ],
)
def test_normalize_database_url_positive(raw_url: str, expected_prefix: str):
    """Positive test: Ensures asyncpg driver prefix is correctly enforced."""
    normalized = normalize_database_url(raw_url)
    assert normalized.startswith(expected_prefix)


def test_normalize_database_url_query_param_stripping():
    """Negative/Edge test: Strips libpq-specific unsupported asyncpg params."""
    raw = "postgresql://user:pass@host:5432/db?sslmode=require&channel_binding=disable&target_session_attrs=read-write"
    normalized = normalize_database_url(raw)
    assert "channel_binding" not in normalized
    assert "target_session_attrs" not in normalized
    assert "ssl=require" in normalized


def test_normalize_database_url_empty():
    """Negative/Edge test: Handles empty/none URL gracefully without exception."""
    assert normalize_database_url("") == ""
