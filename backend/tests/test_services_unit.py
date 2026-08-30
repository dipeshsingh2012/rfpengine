from __future__ import annotations

import pytest

from app.core.config import Settings
from app.services.document_parser_service import DocumentParserService
from app.services.gcp_secret_service import GCPSecretService
from app.services.hybrid_search_service import reciprocal_rank_fusion


def test_hybrid_search_rrf_scoring():
    """Positive test: Reciprocal Rank Fusion correctly merges and boosts reciprocal ranks."""
    es_docs = [
        {"id": "doc-1", "question": "Q1", "answer": "A1", "_score": 10.0, "source_type": "es"},
        {"id": "doc-2", "question": "Q2", "answer": "A2", "_score": 8.0, "source_type": "es"},
    ]
    pinecone_matches = [
        {"id": "doc-2", "score": 0.95, "title": "Q2", "content": "A2", "source_type": "vector"},
        {"id": "doc-3", "score": 0.85, "title": "Q3", "content": "A3", "source_type": "vector"},
    ]

    merged = reciprocal_rank_fusion(
        result_sets=[es_docs, pinecone_matches],
        limit=3,
        k_constant=60,
    )

    assert len(merged) == 3
    # doc-2 appeared in both Elasticsearch (rank 2) and Pinecone (rank 1), so should rank #1
    assert merged[0]["id"] == "doc-2"
    assert merged[0]["score"] > merged[1]["score"]
    assert "matched_retrievers" in merged[0]


def test_hybrid_search_empty_lists():
    """Negative/Edge test: Handles both search results being empty without error."""
    merged = reciprocal_rank_fusion(
        result_sets=[[], []],
        limit=5,
        k_constant=60,
    )
    assert merged == []


def test_category_inference_heuristics():
    """Positive test: Accurately infers category from keywords."""
    assert DocumentParserService.infer_category("SOC 2 Type II compliance report.pdf") == "Compliance & Security"
    assert DocumentParserService.infer_category("GDPR right to be forgotten policy.md") == "Privacy & Legal"
    assert DocumentParserService.infer_category("Disaster recovery RTO and failover SLA.pdf") == "SLA & Operations"
    assert DocumentParserService.infer_category("Architecture diagram and cloud microservices.docx") == "Cloud & Architecture"
    assert DocumentParserService.infer_category("General company overview.txt") == "General"


def test_sliding_window_chunking_with_overlap():
    """Positive test: Chunks long text with specified chunk size and overlap."""
    text = "Word " * 200  # 1000 characters
    chunks = DocumentParserService._chunk_text(text, max_size=300, overlap=50)
    assert len(chunks) > 1
    assert all(len(c) <= 350 for c in chunks)


def test_gcp_secret_service_unconfigured():
    """Negative/Edge test: Returns unconfigured state gracefully when project ID is empty."""
    settings = Settings(gcp_project_id="")
    service = GCPSecretService(settings)
    assert service.is_configured() is False
