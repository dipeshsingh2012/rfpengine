import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.services.email_service import EmailService
from app.core.config import Settings

@pytest.mark.asyncio
async def test_email_service_offline_fallback():
    settings = Settings(email_provider="mock")
    email_svc = EmailService(settings=settings)
    
    res = await email_svc.send_sme_review_request(
        recipient_email="security-lead@acme.corp",
        recipient_name="Alex Security",
        workspace_title="Acme Corp RFP Q3",
        question_text="Describe your disaster recovery and RTO/RPO objectives.",
        draft_preview="We maintain active-passive multi-region failover with RTO < 15 mins and RPO < 1 min.",
        category="Disaster Recovery",
        workspace_id="ws-acme-123",
        question_index=4
    )
    
    assert res["status"] == "sent"
    assert res["provider"] == "mock"
    assert res["recipient"] == "security-lead@acme.corp"
    assert res["offline_logged"] is True


@pytest.mark.asyncio
async def test_email_service_completion_digest():
    settings = Settings(email_provider="mock")
    email_svc = EmailService(settings=settings)
    
    res = await email_svc.send_proposal_completion_digest(
        recipient_email="deal-lead@company.com",
        owner_name="Sarah Dealmaker",
        workspace_title="Acme Corp RFP Q3",
        total_questions=48,
        workspace_id="ws-acme-123"
    )
    
    assert res["status"] == "sent"
    assert res["provider"] == "mock"
    assert res["recipient"] == "deal-lead@company.com"


@pytest.mark.asyncio
async def test_email_api_sme_review_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "recipient_email": "compliance@enterprise.com",
            "recipient_name": "Jordan Compliance",
            "workspace_title": "Enterprise Cloud Proposal",
            "question_text": "Do you support SAML 2.0 Single Sign-On with Okta and Azure AD?",
            "draft_preview": "Yes, full enterprise SSO via SAML 2.0 and OIDC is supported.",
            "category": "Identity & Access",
            "workspace_id": "ws-ent-456",
            "question_index": 2
        }
        resp = await client.post("/api/v1/email/sme-review", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "sent"
        assert data["provider"] == "mock"


@pytest.mark.asyncio
async def test_email_api_completion_digest_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "recipient_email": "lead@company.com",
            "owner_name": "Sam Lead",
            "workspace_title": "Enterprise Cloud Proposal",
            "total_questions": 65,
            "workspace_id": "ws-ent-456"
        }
        resp = await client.post("/api/v1/email/completion-digest", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "sent"
        assert data["provider"] == "mock"
