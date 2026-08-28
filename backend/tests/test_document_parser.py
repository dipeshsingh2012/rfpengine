"""
Document Parser & Knowledge Base File Upload Tests.
Validates multi-format document parsing (CSV, JSON, Markdown, TXT) and the
POST /api/v1/knowledge-base/upload endpoint.
"""

from __future__ import annotations

import io
import pytest
import httpx
from app.main import app
from app.services.document_parser_service import DocumentParserService


def test_csv_document_parsing():
    csv_content = b"""question,answer,category
What is your data retention period?,Customer data is retained for 30 days after contract termination.,Compliance
Where are production servers hosted?,All infrastructure is hosted in AWS us-east-1 and us-west-2.,Infrastructure
Do you support SAML 2.0 SSO?,Yes SAML 2.0 and OIDC integrations are supported across all tiers.,Security
"""
    entries = DocumentParserService.parse_document(
        content=csv_content,
        filename="security_faq.csv",
        tenant_id="test-tenant",
    )

    assert len(entries) == 3
    assert entries[0].question == "What is your data retention period?"
    assert "30 days" in entries[0].answer
    assert entries[0].category == "Compliance"
    assert entries[1].category == "Infrastructure"
    assert entries[2].category == "Security"


def test_json_document_parsing():
    json_content = b"""[
        {"question": "How are encryption keys managed?", "answer": "AWS KMS with annual key rotation.", "category": "Security"},
        {"question": "What is the disaster recovery RPO/RTO?", "answer": "RPO is 1 hour and RTO is 4 hours.", "category": "Operations"}
    ]"""
    entries = DocumentParserService.parse_document(
        content=json_content,
        filename="dr_and_keys.json",
        tenant_id="test-tenant",
    )

    assert len(entries) == 2
    assert entries[0].question == "How are encryption keys managed?"
    assert entries[1].answer == "RPO is 1 hour and RTO is 4 hours."


def test_markdown_heading_chunking():
    md_content = b"""# Data Protection Policy

This document outlines the core encryption and data protection principles followed across the engineering team.

## Encryption in Transit

All external and internal network communications are encrypted using TLS 1.3 with strong cipher suites. Legacy protocols like TLS 1.0 and SSLv3 are strictly disabled on all load balancers and edge proxies.

## Encryption at Rest

Databases, EBS volumes, and S3 object buckets are encrypted at rest using AES-256 with Customer-Managed Keys (CMK) in AWS Key Management Service.
"""
    entries = DocumentParserService.parse_document(
        content=md_content,
        filename="data_protection_policy.md",
        tenant_id="test-tenant",
        default_category="Security Policy",
    )

    assert len(entries) >= 2
    headings = [e.question for e in entries]
    assert any("Encryption in Transit" in h for h in headings)
    assert any("Encryption at Rest" in h for h in headings)


def test_text_recursive_chunking():
    # Generate ~3500 chars of prose
    paragraph = (
        "Acme maintains a comprehensive vendor risk management program. Every third-party service provider "
        "must undergo an annual security assessment and provide a valid SOC 2 Type II report or ISO 27001 certificate. "
    ) * 15
    text_content = paragraph.encode("utf-8")

    entries = DocumentParserService.parse_document(
        content=text_content,
        filename="vendor_risk_policy.txt",
        tenant_id="test-tenant",
        default_category="Vendor Management",
    )

    assert len(entries) > 1, "Long text document must be chunked into multiple pieces"
    for e in entries:
        assert len(e.answer) <= DocumentParserService.CHUNK_SIZE_CHARS + 50


@pytest.mark.asyncio
async def test_upload_endpoint_csv_integration():
    """
    Validates end-to-end multipart file upload via POST /api/v1/knowledge-base/upload.
    """
    csv_bytes = b"""question,answer,category
What is the incident response SLA?,P1 critical incidents are acknowledged within 15 minutes.,Support SLA
Is multi-factor authentication mandatory?,MFA is enforced on all corporate systems via WebAuthn/FIDO2.,Security
"""
    files = {"file": ("test_upload_sla.csv", io.BytesIO(csv_bytes), "text/csv")}
    data = {"tenant_id": "test-upload-tenant", "category": "Security & Support"}

    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        async with app.router.lifespan_context(app):
            response = await client.post(
                "/api/v1/knowledge-base/upload",
                files=files,
                data=data,
            )

            assert response.status_code == 201, f"Upload failed: {response.text}"
            payload = response.json()
            assert payload["records_created"] == 2
            assert payload["tenant_id"] == "test-upload-tenant"
            assert "Security" in payload["categories"] or "Support SLA" in payload["categories"]
            assert len(payload["preview"]) == 2

