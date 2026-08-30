from __future__ import annotations

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_search_valid_query_positive():
    """Positive test: /api/v1/search returns grounded proposal draft with citations."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        payload = {
            "tenant_id": "acme-corp",
            "question": "What encryption standard is enforced for data at rest?",
            "top_k": 3,
        }
        response = await ac.post("/api/v1/search", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "suggested_answer" in data
        assert isinstance(data["suggested_answer"], str)
        assert len(data["suggested_answer"]) > 0
        assert "confidence_score" in data
        assert 0.0 <= data["confidence_score"] <= 1.0
        assert "sources" in data
        assert isinstance(data["sources"], list)


@pytest.mark.asyncio
@pytest.mark.parametrize("top_k", [1, 3, 5, 10, 50])
async def test_search_top_k_boundaries_positive(top_k: int):
    """Positive test: Validates top_k boundary values (1, 3, 5, 10, 50)."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        payload = {
            "tenant_id": "demo-tenant",
            "question": "Describe disaster recovery RTO and RPO targets.",
            "top_k": top_k,
        }
        response = await ac.post("/api/v1/search", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert len(data["sources"]) <= top_k


@pytest.mark.asyncio
async def test_search_empty_question_negative():
    """Negative test: Submitting an empty question is rejected with 422 Unprocessable."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        payload = {
            "tenant_id": "acme-corp",
            "question": "",
            "top_k": 5,
        }
        response = await ac.post("/api/v1/search", json=payload)
        assert response.status_code == 422


@pytest.mark.asyncio
@pytest.mark.parametrize("invalid_top_k", [0, -1, -50, 51, 100, 500])
async def test_search_out_of_bounds_top_k_negative(invalid_top_k: int):
    """Negative test: Out-of-bounds top_k values (<1 or >50) are rejected with 422."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        payload = {
            "tenant_id": "acme-corp",
            "question": "What is the SLA commitment?",
            "top_k": invalid_top_k,
        }
        response = await ac.post("/api/v1/search", json=payload)
        assert response.status_code == 422


@pytest.mark.asyncio
async def test_search_missing_required_fields_negative():
    """Negative test: Missing question field completely in payload."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        payload = {
            "tenant_id": "acme-corp",
        }
        response = await ac.post("/api/v1/search", json=payload)
        assert response.status_code == 422
