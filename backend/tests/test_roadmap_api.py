from __future__ import annotations

import pytest
from httpx import ASGITransport, AsyncClient
from app.core.db import get_db_session
from app.main import app


@pytest.mark.asyncio
async def test_roadmap_list_and_seed(db_session):
    async def _override():
        yield db_session

    app.dependency_overrides[get_db_session] = _override
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            response = await ac.get("/api/v1/roadmap?tenant_id=test-tenant")
            assert response.status_code == 200
            data = response.json()
            assert isinstance(data, list)
            assert len(data) >= 1
            first = data[0]
            assert "id" in first
            assert "title" in first
            assert "stage" in first
            assert "rice" in first
    finally:
        app.dependency_overrides.pop(get_db_session, None)


@pytest.mark.asyncio
async def test_roadmap_create_and_lifecycle(db_session):
    async def _override():
        yield db_session

    app.dependency_overrides[get_db_session] = _override
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            payload = {
                "title": "Automated Security Audit Export",
                "stage": "discovery",
                "theme": "Enterprise Governance",
                "priority": "P1 - High",
                "target_persona": "Security SME",
                "quarter": "In Discovery",
                "summary": "1-click export of full audit history for compliance teams.",
                "problem_statement": "Auditors require full timestamped logs.",
                "user_story": "As a Security SME, I want a 1-click audit export.",
                "success_metrics": ["100% audit log completeness"],
                "acceptance_criteria": ["Given audit logs, when exported, format is valid JSON."],
                "technical_architecture": "FastAPI + asyncpg stream",
                "rice": {
                    "reach": 60,
                    "impact": 3,
                    "confidence": 80,
                    "effort": 2,
                    "score": 72.0
                },
                "upvotes": 5,
                "tags": ["Audit", "Security", "Compliance"],
                "tenant_id": "test-tenant"
            }
            res = await ac.post("/api/v1/roadmap", json=payload)
            assert res.status_code == 201
            created = res.json()
            assert created["title"] == payload["title"]
            assert created["upvotes"] == 5
            initiative_id = created["id"]

            # Test drag-and-drop stage patch
            patch_res = await ac.patch(
                f"/api/v1/roadmap/{initiative_id}",
                json={"stage": "development", "quarter": "Q3 2026"}
            )
            assert patch_res.status_code == 200
            assert patch_res.json()["stage"] == "development"
            assert patch_res.json()["quarter"] == "Q3 2026"

            # Test upvote atomic increment
            upvote_res = await ac.post(f"/api/v1/roadmap/{initiative_id}/upvote?delta=1")
            assert upvote_res.status_code == 200
            assert upvote_res.json()["upvotes"] == 6
    finally:
        app.dependency_overrides.pop(get_db_session, None)

