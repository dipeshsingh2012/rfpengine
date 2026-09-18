import io
import pytest
from starlette.testclient import TestClient
from unittest.mock import MagicMock

from app.main import app
from app.services.parser_feedback_service import (
    ParserFeedbackPayload,
    QuestionDeletion,
    QuestionEditDiff,
    QuestionAddition,
    parser_feedback_service,
)
from app.services.questionnaire_parser_service import QuestionnaireParserService


def test_rephrase_question_service_fallback():
    raw_prompt = "  what is your stated recovery time objective (rto)   "
    rephrased = QuestionnaireParserService.rephrase_question(raw_prompt)
    assert "recovery time objective" in rephrased
    assert rephrased.endswith("?")


def test_rephrase_question_service_with_gemini(monkeypatch):
    mock_client = MagicMock()
    mock_response = MagicMock()
    mock_response.text = "Please specify your disaster recovery RTO and RPO metrics for production environments."
    mock_client.models.generate_content.return_value = mock_response

    monkeypatch.setattr(QuestionnaireParserService, "_get_genai_client", classmethod(lambda cls: mock_client))

    rephrased = QuestionnaireParserService.rephrase_question("what's your rto and rpo?")
    assert "disaster recovery RTO and RPO" in rephrased


def test_rephrase_question_api_endpoint():
    client = TestClient(app)
    response = client.post(
        "/api/v1/responses/rephrase-question",
        json={"question_text": "do you enforce multi-factor authentication?", "style": "formal"},
        headers={"X-Tenant-ID": "acme-corp"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "rephrased_text" in data
    assert "multi-factor authentication" in data["rephrased_text"]


def test_parser_feedback_service_and_api():
    client = TestClient(app)
    payload = {
        "filename": "security_form.pdf",
        "format": "pdf",
        "rating": "thumbs_up",
        "comment": "Accurately extracted technical requirements",
        "total_ai_detected": 10,
        "total_curated": 9,
        "edits": [
            {
                "id": "SEC-01",
                "original_text": "1.1 Describe encryption",
                "corrected_text": "Describe your data encryption methods for data at rest.",
                "section": "Data Protection",
            }
        ],
        "deletions": [
            {
                "id": "HDR-01",
                "rejected_text": "Table of Contents Page 1",
                "section": "General",
                "reason": "header",
            }
        ],
        "additions": [
            {
                "question_text": "Vendor must provide SOC 2 Type II report.",
                "section": "Compliance",
                "expected_type": "narrative",
            }
        ],
    }

    response = client.post(
        "/api/v1/responses/parser-feedback",
        json=payload,
        headers={"X-Tenant-ID": "acme-corp"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["id"].startswith("pfb_")
    assert data["rating"] == "thumbs_up"
    assert len(data["deletions"]) == 1
    assert len(data["edits"]) == 1

    # Verify guardrail learning
    guardrails = parser_feedback_service.get_extraction_guardrails("acme-corp")
    assert any("Table of Contents" in g for g in guardrails)


def test_parse_file_with_guidance():
    client = TestClient(app)
    from tests.test_questionnaire_parser import create_sample_excel

    excel_bytes = create_sample_excel()
    response = client.post(
        "/api/v1/responses/parse-file",
        files={"file": ("security_eval.xlsx", excel_bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
        data={"guidance": "Focus on Access Control requirements"},
        headers={"X-Tenant-ID": "acme-corp"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total_questions"] == 5

