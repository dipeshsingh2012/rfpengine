from __future__ import annotations

import pytest
from httpx import ASGITransport, AsyncClient
from app.core.db import get_db_session
from app.main import app


@pytest.mark.asyncio
async def test_promote_question_to_kb_lifecycle_positive(db_session):
    """
    Level 1 Closed-Loop AI Feedback (ADR 0019):
    Test creating a workspace with SME approval, promoting the answer to the Knowledge Base,
    and verifying Golden Q&A persistence and provenance tracking.
    """
    async def _override():
        yield db_session

    app.dependency_overrides[get_db_session] = _override
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            # 1. Create workspace
            ws_payload = {
                "id": "ws-feedback-001",
                "tenant_id": "acme-corp",
                "title": "Enterprise Security RFP 2026",
                "source_mode": "upload",
                "questions": [
                    {
                        "question_index": 0,
                        "question_text": "What encryption ciphers are supported for data in transit?",
                        "suggested_answer": "We support TLS 1.2 and TLS 1.3.",
                        "final_answer": "Strictly TLS 1.3 with AES-256-GCM. TLS 1.2 is deprecated per security policy.",
                        "review_status": "Approved",
                        "assigned_role": "Security SME",
                        "confidence_score": 0.96,
                    }
                ],
            }
            create_res = await ac.post("/api/v1/workspaces", json=ws_payload)
            assert create_res.status_code == 201

            # 2. Promote approved question to Knowledge Base
            promote_res = await ac.post("/api/v1/workspaces/ws-feedback-001/questions/0/promote")
            assert promote_res.status_code == 200
            promote_data = promote_res.json()
            assert promote_data["success"] is True
            assert promote_data["category"] == "Golden Q&A"
            assert "kb-gold-" in promote_data["kb_entry_id"] or "kb-" in promote_data["kb_entry_id"]
            assert promote_data["review"]["is_promoted_to_kb"] is True
            assert promote_data["review"]["promoted_kb_id"] == promote_data["kb_entry_id"]

            # 3. Verify KB Entry exists and has provenance metadata
            kb_id = promote_data["kb_entry_id"]
            kb_res = await ac.get(f"/api/v1/knowledge-base/{kb_id}")
            assert kb_res.status_code == 200
            kb_data = kb_res.json()
            assert kb_data["category"] == "Golden Q&A"
            assert kb_data["question"] == "What encryption ciphers are supported for data in transit?"
            assert "Strictly TLS 1.3" in kb_data["answer"]
            assert kb_data["metadata"]["is_golden_qa"] is True
            assert kb_data["metadata"]["origin_workspace_id"] == "ws-feedback-001"
            assert kb_data["metadata"]["approved_by_role"] == "Security SME"
    finally:
        app.dependency_overrides.pop(get_db_session, None)


@pytest.mark.asyncio
async def test_promote_question_idempotency_positive(db_session):
    """Test re-promoting an already promoted question updates the existing KB record without error."""
    async def _override():
        yield db_session

    app.dependency_overrides[get_db_session] = _override
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            ws_payload = {
                "id": "ws-feedback-002",
                "tenant_id": "acme-corp",
                "title": "SOC 2 Audit Questionnaire",
                "questions": [
                    {
                        "question_index": 0,
                        "question_text": "Do you perform annual penetration testing?",
                        "suggested_answer": "Yes, third-party pen tests are conducted annually.",
                        "final_answer": "Yes, CREST-accredited third-party penetration tests are executed annually.",
                        "review_status": "Approved",
                        "assigned_role": "Security SME",
                    }
                ],
            }
            await ac.post("/api/v1/workspaces", json=ws_payload)

            # First promotion
            res1 = await ac.post("/api/v1/workspaces/ws-feedback-002/questions/0/promote")
            assert res1.status_code == 200
            kb_id_1 = res1.json()["kb_entry_id"]

            # Second promotion
            res2 = await ac.post("/api/v1/workspaces/ws-feedback-002/questions/0/promote")
            assert res2.status_code == 200
            kb_id_2 = res2.json()["kb_entry_id"]
            assert kb_id_1 == kb_id_2
    finally:
        app.dependency_overrides.pop(get_db_session, None)


@pytest.mark.asyncio
async def test_promote_nonexistent_workspace_negative(db_session):
    """Negative test: Promoting from non-existent workspace returns 404."""
    async def _override():
        yield db_session

    app.dependency_overrides[get_db_session] = _override
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            res = await ac.post("/api/v1/workspaces/non-existent-ws/questions/0/promote")
            assert res.status_code == 404
            assert "Workspace 'non-existent-ws' not found" in res.json()["detail"]
    finally:
        app.dependency_overrides.pop(get_db_session, None)


@pytest.mark.asyncio
async def test_promote_invalid_question_index_negative(db_session):
    """Negative test: Promoting invalid question index returns 404."""
    async def _override():
        yield db_session

    app.dependency_overrides[get_db_session] = _override
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            ws_payload = {
                "id": "ws-feedback-003",
                "tenant_id": "acme-corp",
                "title": "Short Questionnaire",
                "questions": [
                    {
                        "question_index": 0,
                        "question_text": "Is SSO supported?",
                        "suggested_answer": "Yes, SAML 2.0 and OIDC.",
                        "review_status": "Approved",
                    }
                ],
            }
            await ac.post("/api/v1/workspaces", json=ws_payload)

            res = await ac.post("/api/v1/workspaces/ws-feedback-003/questions/99/promote")
            assert res.status_code == 404
            assert "Question index 99 not found" in res.json()["detail"]
    finally:
        app.dependency_overrides.pop(get_db_session, None)
