import io
import pytest
from starlette.testclient import TestClient
import openpyxl
import docx
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

from app.main import app
from app.services.questionnaire_parser_service import QuestionnaireParserService


def create_sample_excel() -> bytes:
    wb = openpyxl.Workbook()
    ws1 = wb.active
    ws1.title = "Security"
    ws1.append(["Control ID", "Question", "Category", "Response"])
    ws1.append(["SEC-01", "Do you enforce multi-factor authentication for all employees?", "Access Control", ""])
    ws1.append(["SEC-02", "What encryption algorithms are used for data at rest?", "Cryptography", ""])
    ws1.append(["SEC-03", "Does your organization maintain a SOC 2 Type II certification?", "Compliance", ""])

    ws2 = wb.create_sheet(title="Operations")
    ws2.append(["Item", "Requirement", "Area", "Vendor Comments"])
    ws2.append(["OPS-01", "What is your stated disaster recovery RTO and RPO?", "BCDR", ""])
    ws2.append(["OPS-02", "Do you perform annual third-party penetration tests?", "Vulnerability Management", ""])

    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


def create_sample_docx() -> bytes:
    doc = docx.Document()
    doc.add_heading("Vendor Security Assessment", level=1)
    doc.add_paragraph("Please complete the following technical questions.")

    table = doc.add_table(rows=1, cols=3)
    hdr_cells = table.rows[0].cells
    hdr_cells[0].text = "ID"
    hdr_cells[1].text = "Question"
    hdr_cells[2].text = "Response"

    row1 = table.add_row().cells
    row1[0].text = "1"
    row1[1].text = "Where are customer backups physically stored?"
    row1[2].text = ""

    row2 = table.add_row().cells
    row2[0].text = "2"
    row2[1].text = "How often are access keys rotated in Google Cloud?"
    row2[2].text = ""

    buf = io.BytesIO()
    doc.save(buf)
    return buf.getvalue()


def create_sample_pdf() -> bytes:
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=letter)
    c.drawString(100, 750, "Information Security Questionnaire 2026")
    c.drawString(100, 720, "1.1 Do you support SAML 2.0 Single Sign-On?")
    c.drawString(100, 690, "1.2 What is your incident response notification window?")
    c.drawString(100, 660, "1.3 Can customer data be exported in standard formats upon contract termination?")
    c.save()
    return buf.getvalue()


def test_excel_questionnaire_parsing():
    content = create_sample_excel()
    result = QuestionnaireParserService.parse_questionnaire(content, "vendor_rfp.xlsx")

    assert result.format == "excel"
    assert result.total_questions == 5
    assert "Security" in [q.sheet_name for q in result.questions]
    assert "Operations" in [q.sheet_name for q in result.questions]
    q_texts = [q.question_text for q in result.questions]
    assert any("multi-factor authentication" in q for q in q_texts)
    assert any("RTO and RPO" in q for q in q_texts)


def test_docx_questionnaire_parsing():
    content = create_sample_docx()
    result = QuestionnaireParserService.parse_questionnaire(content, "assessment.docx")

    assert result.format == "word"
    assert result.total_questions == 2
    q_texts = [q.question_text for q in result.questions]
    assert any("backups physically stored" in q for q in q_texts)
    assert any("access keys rotated" in q for q in q_texts)


def test_pdf_questionnaire_parsing():
    content = create_sample_pdf()
    result = QuestionnaireParserService.parse_questionnaire(content, "security_form.pdf")

    assert result.format == "pdf"
    assert result.total_questions >= 3
    q_texts = [q.question_text for q in result.questions]
    assert any("Single Sign-On" in q for q in q_texts)
    assert any("incident response" in q for q in q_texts)


def test_rejection_of_unsupported_json():
    with pytest.raises(ValueError) as exc:
        QuestionnaireParserService.parse_questionnaire(b'{"questions": []}', "data.json")
    assert "Unsupported questionnaire format" in str(exc.value)


def test_parse_file_api_endpoint():
    client = TestClient(app)
    excel_bytes = create_sample_excel()

    response = client.post(
        "/api/v1/responses/parse-file",
        files={"file": ("security_eval.xlsx", excel_bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
        headers={"X-Tenant-ID": "acme-corp"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["format"] == "excel"
    assert data["total_questions"] == 5
    assert len(data["questions"]) == 5
    assert data["questions"][0]["question_text"] != ""

