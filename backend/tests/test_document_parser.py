import pytest
from app.services.document_parser import DocumentParser

def test_parse_text_with_content():
    parser = DocumentParser()
    content = "Contact us at support@example.com or admin@test.org on 2023-10-01."
    result = parser.parse_text(content)
    
    assert "support@example.com" in result["emails"]
    assert "admin@test.org" in result["emails"]
    assert "2023-10-01" in result["dates"]
    assert result["word_count"] > 0

def test_parse_text_empty():
    parser = DocumentParser()
    result = parser.parse_text("")
    assert result["emails"] == []
    assert result["dates"] == []
    assert result["word_count"] == 0
