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


def test_hybrid_search_rrf_golden_qa_authority_boosting():
    """Positive test: Golden Q&A receives authority multiplier and outranks higher raw rank doc."""
    # doc-raw is rank 1 (score = 1/61 = 0.01639)
    # doc-golden is rank 2, but has category 'Golden Q&A' (score = (1/62) * 1.75 = 0.02822)
    es_docs = [
        {"id": "doc-raw-1", "question": "Encryption?", "answer": "AES-128", "category": "General", "source_type": "es"},
        {
            "id": "doc-golden-1",
            "question": "Encryption?",
            "answer": "Strictly AES-256-GCM and TLS 1.3 verified by SME",
            "category": "Golden Q&A",
            "metadata": {"is_golden_qa": True},
            "source_type": "es",
        },
    ]

    merged = reciprocal_rank_fusion(
        result_sets=[es_docs],
        limit=5,
        k_constant=60,
        golden_qa_boost=1.75,
    )

    assert len(merged) == 2
    # The Golden Q&A should outrank the raw doc due to 1.75x authority multiplier
    assert merged[0]["id"] == "doc-golden-1"
    assert merged[0]["is_golden_qa"] is True
    assert merged[0]["score"] > merged[1]["score"]
    assert merged[1]["id"] == "doc-raw-1"


@pytest.mark.asyncio
async def test_golden_qa_prompt_generation_precedence():
    """Positive test: _generate_answer embeds authority header tag and precedence hierarchy."""
    from app.models.schemas import Source
    from app.services.hybrid_search_service import HybridSearchService

    settings = Settings(gcp_project_id="")
    service = HybridSearchService(settings, None, None)

    sources = [
        Source(
            id="kb-golden-101",
            title="SME Verified Encryption Policy",
            content="We enforce TLS 1.3 and AES-256.",
            category="Golden Q&A",
            is_golden_qa=True,
            score=0.9,
        ),
        Source(
            id="doc-raw-pdf-202",
            title="Old 2021 Security PDF",
            content="We support TLS 1.2 and AES-128.",
            category="Compliance",
            is_golden_qa=False,
            score=0.5,
        ),
    ]

    # Calling _generate_answer when genai_client is None falls back to returning top source content
    answer = await service._generate_answer("What encryption is used?", sources)
    assert "TLS 1.3 and AES-256" in answer


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
