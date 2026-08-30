from __future__ import annotations

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.db import get_db_session
from app.main import app


@pytest.mark.asyncio
async def test_workspace_and_governance_lifecycle(db_session):
    """Positive test: Creates workspace, retrieves it, and executes 4-role SME review sign-offs."""
    async def _override():
        yield db_session

    app.dependency_overrides[get_db_session] = _override
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            payload = {
                "id": "ws-governance-test-1",
                "tenant_id": "acme-corp",
                "title": "Enterprise Security & SLA RFP",
                "source_mode": "upload",
                "questions": [
                    {
                        "question_index": 0,
                        "question_text": "What is your data retention policy?",
                        "suggested_answer": "Data is retained for 90 days after contract termination.",
                        "review_status": "Draft",
                        "assigned_role": "Proposal Drafter",
                        "confidence_score": 0.95,
                    },
                    {
                        "question_index": 1,
                        "question_text": "Do you provide 99.99% uptime guarantee?",
                        "suggested_answer": "Our standard SLA offers 99.9% monthly uptime.",
                        "review_status": "Draft",
                        "assigned_role": "Legal Counsel",
                        "confidence_score": 0.88,
                    },
                ],
            }
            create_res = await ac.post("/api/v1/workspaces", json=payload)
            assert create_res.status_code == 201
            data = create_res.json()
            assert data["id"] == "ws-governance-test-1"
            assert len(data["questions"]) == 2

            # 1. Fetch workspace by ID
            get_res = await ac.get("/api/v1/workspaces/ws-governance-test-1")
            assert get_res.status_code == 200
            assert get_res.json()["title"] == "Enterprise Security & SLA RFP"

            # 2. Security SME Review: Update answer and approve
            patch_q0 = await ac.patch(
                "/api/v1/workspaces/ws-governance-test-1/questions/0",
                json={
                    "final_answer": "Data is retained for 90 days, then securely purged per NIST 800-88.",
                    "review_status": "Approved",
                    "assigned_role": "Security SME",
                },
            )
            assert patch_q0.status_code == 200
            q0_data = patch_q0.json()
            assert q0_data["review_status"] == "Approved"
            assert q0_data["assigned_role"] == "Security SME"

            # 3. Legal Review: Request changes
            patch_q1 = await ac.patch(
                "/api/v1/workspaces/ws-governance-test-1/questions/1",
                json={
                    "review_status": "Changes requested",
                    "assigned_role": "Legal Counsel",
                },
            )
            assert patch_q1.status_code == 200
            assert patch_q1.json()["review_status"] == "Changes requested"
    finally:
        app.dependency_overrides.pop(get_db_session, None)


@pytest.mark.asyncio
async def test_workspace_get_nonexistent_negative(db_session):
    """Negative test: Requesting a non-existent workspace returns 404."""
    async def _override():
        yield db_session

    app.dependency_overrides[get_db_session] = _override
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            res = await ac.get("/api/v1/workspaces/ws-does-not-exist-999")
            assert res.status_code == 404
    finally:
        app.dependency_overrides.pop(get_db_session, None)


@pytest.mark.asyncio
async def test_workspace_patch_invalid_question_index_negative(db_session):
    """Negative test: Patching an invalid question index returns 404."""
    async def _override():
        yield db_session

    app.dependency_overrides[get_db_session] = _override
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            # Create workspace with 1 question
            await ac.post(
                "/api/v1/workspaces",
                json={
                    "id": "ws-test-neg-1",
                    "tenant_id": "acme-corp",
                    "title": "Single Question RFP",
                    "questions": [
                        {
                            "question_index": 0,
                            "question_text": "Single Q?",
                            "suggested_answer": "Answer",
                        }
                    ],
                },
            )
            # Patch question index 99
            res = await ac.patch(
                "/api/v1/workspaces/ws-test-neg-1/questions/99",
                json={"review_status": "Approved"},
            )
            assert res.status_code == 404
    finally:
        app.dependency_overrides.pop(get_db_session, None)
