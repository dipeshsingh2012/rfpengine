from __future__ import annotations

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.db import get_db_session
from app.main import app


@pytest.mark.asyncio
async def test_kb_create_and_get_lifecycle(db_session):
    """Positive test: Creates a KB entry and retrieves it by ID."""
    async def _override():
        yield db_session

    app.dependency_overrides[get_db_session] = _override
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            payload = {
                "tenant_id": "test-kb-tenant",
                "title": "Data Encryption in Transit",
                "content": "All external and inter-service HTTP communications use TLS 1.3.",
                "category": "Security",
                "metadata": {"source": "SOC 2 Type II"},
            }
            res = await ac.post("/api/v1/knowledge-base", json=payload)
            assert res.status_code == 201
            created = res.json()
            assert created["title"] == payload["title"]
            assert created["category"] == "Security"
            entry_id = created["id"]

            # Get by ID
            get_res = await ac.get(f"/api/v1/knowledge-base/{entry_id}")
            assert get_res.status_code == 200
            assert get_res.json()["id"] == entry_id

            # List entries
            list_res = await ac.get("/api/v1/knowledge-base?tenant_id=test-kb-tenant")
            assert list_res.status_code == 200
            assert any(item["id"] == entry_id for item in list_res.json())

            # Delete entry
            del_res = await ac.delete(f"/api/v1/knowledge-base/{entry_id}")
            assert del_res.status_code == 204
    finally:
        app.dependency_overrides.pop(get_db_session, None)


@pytest.mark.asyncio
async def test_kb_bulk_import_positive(db_session):
    """Positive test: Bulk import multiple passages in one atomic payload."""
    async def _override():
        yield db_session

    app.dependency_overrides[get_db_session] = _override
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            payload = {
                "tenant_id": "bulk-tenant",
                "entries": [
                    {
                        "title": "Business Continuity SLA",
                        "content": "99.9% uptime target with automated failover.",
                        "category": "Operations",
                    },
                    {
                        "title": "GDPR Compliance Notice",
                        "content": "Data subjects can request deletion within 30 days.",
                        "category": "Privacy",
                    },
                ],
            }
            res = await ac.post("/api/v1/knowledge-base/bulk", json=payload)
            assert res.status_code == 201
            data = res.json()
            assert len(data) == 2
    finally:
        app.dependency_overrides.pop(get_db_session, None)


@pytest.mark.asyncio
async def test_kb_get_nonexistent_negative(db_session):
    """Negative test: Querying non-existent KB entry returns 404."""
    async def _override():
        yield db_session

    app.dependency_overrides[get_db_session] = _override
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            res = await ac.get("/api/v1/knowledge-base/non-existent-id-999")
            assert res.status_code == 404
    finally:
        app.dependency_overrides.pop(get_db_session, None)


@pytest.mark.asyncio
async def test_kb_create_invalid_payload_negative(db_session):
    """Negative test: Empty tenant_id fails min_length validation with 422."""
    async def _override():
        yield db_session

    app.dependency_overrides[get_db_session] = _override
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            res = await ac.post("/api/v1/knowledge-base", json={"tenant_id": "", "title": "Test"})
            assert res.status_code == 422
    finally:
        app.dependency_overrides.pop(get_db_session, None)
