import io
import pytest
from fastapi import status
from fastapi.testclient import TestClient

from app.main import app
from app.models.schemas import KBEntryCreate
from app.services.document_parser_service import DocumentParserService

client = TestClient(app)


# ==============================================================================
# 1. DocumentParserService CSV Parsing Unit Tests
# ==============================================================================

def test_parse_csv_standard_headers():
    """Test parsing standard CSV with Question, Answer, and Category columns."""
    csv_data = (
        "Question,Answer,Category\n"
        "What is your encryption standard?,All data at rest is encrypted with AES-256.,Security & Cryptography\n"
        "What is your SLA uptime guarantee?,We guarantee 99.9% monthly uptime.,SLA & Operations\n"
    ).encode("utf-8")

    entries = DocumentParserService.parse_document(
        content=csv_data,
        filename="security_questionnaire.csv",
        tenant_id="acme-corp",
    )

    assert len(entries) == 2
    assert isinstance(entries[0], KBEntryCreate)
    assert entries[0].title == "What is your encryption standard?"
    assert entries[0].content == "All data at rest is encrypted with AES-256."
    assert entries[0].category == "Security & Cryptography"
    assert entries[0].metadata["source_file"] == "security_questionnaire.csv"
    assert entries[0].metadata["row_number"] == 1
    assert entries[0].metadata["format"] == "csv"

    assert entries[1].title == "What is your SLA uptime guarantee?"
    assert entries[1].content == "We guarantee 99.9% monthly uptime."
    assert entries[1].category == "SLA & Operations"


def test_parse_csv_column_synonyms():
    """Test parsing CSV with alternate column names (Title, Content, Section, Prompt, Response)."""
    csv_data = (
        "Title,Content,Section\n"
        "Data Protection Policy,We comply with GDPR and CCPA standards.,Privacy & Legal\n"
    ).encode("utf-8")

    entries = DocumentParserService.parse_document(
        content=csv_data,
        filename="privacy_policy.csv",
        tenant_id="test-tenant",
    )

    assert len(entries) == 1
    assert entries[0].title == "Data Protection Policy"
    assert entries[0].content == "We comply with GDPR and CCPA standards."
    assert entries[0].category == "Privacy & Legal"


def test_parse_csv_utf8_bom():
    """Test parsing UTF-8 CSV with Byte Order Mark (BOM - common in Excel exports)."""
    csv_data = "\ufeffQuestion,Answer\nWhere are data centers located?,Data centers are in US-East-1.".encode("utf-8-sig")

    entries = DocumentParserService.parse_document(
        content=csv_data,
        filename="excel_export.csv",
        tenant_id="acme-corp",
    )

    assert len(entries) == 1
    assert entries[0].title == "Where are data centers located?"
    assert entries[0].content == "Data centers are in US-East-1."


def test_parse_tsv_tab_delimited():
    """Test auto-detection and parsing of TSV (tab-separated) files."""
    tsv_data = "Question\tAnswer\tCategory\nWhat SSO protocols are supported?\tSAML 2.0 and OIDC.\tSecurity\n".encode("utf-8")

    entries = DocumentParserService.parse_document(
        content=tsv_data,
        filename="sso_specs.tsv",
        tenant_id="acme-corp",
    )

    assert len(entries) == 1
    assert entries[0].title == "What SSO protocols are supported?"
    assert entries[0].content == "SAML 2.0 and OIDC."


def test_parse_csv_category_inference():
    """Test automatic category taxonomy inference when category column is absent."""
    csv_data = (
        "Question,Answer\n"
        "How do you handle SOC 2 Type II compliance?,We undergo annual SOC 2 Type II audits.\n"
        "What encryption is used in transit?,TLS 1.3 encryption is enforced for all network traffic.\n"
    ).encode("utf-8")

    entries = DocumentParserService.parse_document(
        content=csv_data,
        filename="data_sheet.csv",
        tenant_id="acme-corp",
    )

    assert len(entries) == 2
    assert entries[0].category == "Compliance & Security"
    assert entries[1].category == "Security & Cryptography"


def test_parse_csv_unsupported_file_extension():
    """Test error handling when trying to parse unsupported file formats."""
    with pytest.raises(ValueError, match="Unsupported file format"):
        DocumentParserService.parse_document(
            content=b"some content",
            filename="unsupported_file.xyz",
            tenant_id="acme-corp",
        )


# ==============================================================================
# 2. Knowledge Base CSV Upload API Endpoint Tests
# ==============================================================================

def test_upload_csv_file_api_success():
    """Test POST /api/v1/knowledge-base/upload with a valid CSV file."""
    csv_content = (
        "Question,Answer,Category\n"
        "What is your backup frequency?,Hourly automated snapshots.,SLA & Operations\n"
        "Do you support custom encryption keys?,Yes AWS KMS Customer Managed Keys.,Security & Cryptography\n"
    )

    response = client.post(
        "/api/v1/knowledge-base/upload",
        data={"tenant_id": "acme-corp"},
        files={"file": ("vendor_questionnaire.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")},
    )

    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["filename"] == "vendor_questionnaire.csv"
    assert data["records_created"] == 2
    assert data["tenant_id"] == "acme-corp"
    assert "SLA & Operations" in data["categories"]
    assert "Security & Cryptography" in data["categories"]


def test_upload_csv_file_api_category_override():
    """Test POST /api/v1/knowledge-base/upload with explicit category override parameter."""
    csv_content = (
        "Question,Answer\n"
        "What is your RTO?,RTO is 4 hours.\n"
    )

    response = client.post(
        "/api/v1/knowledge-base/upload",
        data={"tenant_id": "acme-corp", "category": "Custom Support Tier"},
        files={"file": ("rto_spec.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")},
    )

    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["records_created"] == 1
    assert data["categories"] == ["Custom Support Tier"]


def test_upload_csv_file_api_empty_file_error():
    """Test POST /api/v1/knowledge-base/upload with an empty file returns 400 Bad Request."""
    response = client.post(
        "/api/v1/knowledge-base/upload",
        data={"tenant_id": "acme-corp"},
        files={"file": ("empty.csv", io.BytesIO(b""), "text/csv")},
    )

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "empty" in response.json()["detail"].lower()


def test_upload_csv_file_api_invalid_extension_error():
    """Test POST /api/v1/knowledge-base/upload with unsupported file extension returns 422 Unprocessable Entity."""
    response = client.post(
        "/api/v1/knowledge-base/upload",
        data={"tenant_id": "acme-corp"},
        files={"file": ("executable.exe", io.BytesIO(b"binary data"), "application/octet-stream")},
    )

    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    assert "unsupported file format" in response.json()["detail"].lower()


def test_parse_csv_quoted_commas_and_empty_answers():
    """Test parsing CSV where questions contain commas inside quotes and answer column is unpopulated."""
    csv_data = (
        'Question,Answer,Category\n'
        '"Do you support SSO, SAML 2.0, and MFA?",,"Security & Cryptography"\n'
        '"What are your RTO, RPO, and SLA metrics?",,"SLA & Operations"\n'
    ).encode("utf-8")

    entries = DocumentParserService.parse_document(
        content=csv_data,
        filename="blank_questionnaire.csv",
        tenant_id="acme-corp",
    )

    assert len(entries) == 2
    assert entries[0].title == "Do you support SSO, SAML 2.0, and MFA?"
    assert entries[0].category == "Security & Cryptography"
    assert entries[1].title == "What are your RTO, RPO, and SLA metrics?"
    assert entries[1].category == "SLA & Operations"
