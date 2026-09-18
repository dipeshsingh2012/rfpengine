import pytest
from app.models.schemas import ExemplarItem, SearchRequest, SearchResponse, Source
from app.services.hybrid_search_service import HybridSearchService


def test_build_few_shot_prompt_with_exemplars():
    question = "Do you encrypt backups and databases at rest?"
    sources = [
        Source(
            id="src-001",
            title="Encryption Standards",
            content="All customer data at rest is encrypted using AES-256 via AWS KMS.",
            category="Security",
            score=0.95,
            source_file="01_Security_Whitepaper.md"
        )
    ]
    exemplars = [
        ExemplarItem(
            id="kb-gold-001",
            question="What ciphers are enforced for database encryption?",
            approved_answer="We strictly enforce FIPS 140-2 validated AES-256 encryption across all primary databases and replica storage volumes.",
            category="Golden Q&A",
            relevance_score=0.98
        )
    ]

    prompt = HybridSearchService.build_few_shot_prompt(
        question=question,
        sources=sources,
        exemplars=exemplars,
        tone="Direct & Authoritative",
        company_name="Acme Corporation"
    )

    assert "Acme Corporation" in prompt
    assert "Direct & Authoritative" in prompt
    assert "APPROVED FEW-SHOT WINNING DEMONSTRATIONS" in prompt
    assert "kb-gold-001" not in prompt  # ID kept internal, content exposed
    assert "What ciphers are enforced for database encryption?" in prompt
    assert "We strictly enforce FIPS 140-2 validated AES-256" in prompt
    assert "APPROVED FACTUAL EVIDENCE" in prompt
    assert "All customer data at rest is encrypted using AES-256" in prompt
    assert question in prompt


def test_build_few_shot_prompt_without_exemplars():
    question = "What are your RPO and RTO metrics?"
    sources = [
        Source(
            id="src-002",
            title="SLA Policies",
            content="RPO is 1 hour and RTO is 4 hours.",
            category="SLA",
            score=0.88
        )
    ]

    prompt = HybridSearchService.build_few_shot_prompt(
        question=question,
        sources=sources,
        exemplars=[],
        tone="Concise",
        company_name="Acme Corp"
    )

    assert "Acme Corp" in prompt
    assert "APPROVED FEW-SHOT WINNING DEMONSTRATIONS" not in prompt
    assert "APPROVED FACTUAL EVIDENCE" in prompt
    assert "RPO is 1 hour and RTO is 4 hours." in prompt
    assert question in prompt


def test_search_response_exemplar_serialization():
    resp = SearchResponse(
        suggested_answer="Yes, all data is encrypted with AES-256.",
        confidence_score=0.96,
        sources=[
            Source(
                id="s-1",
                title="Whitepaper",
                content="AES-256",
                score=0.92
            )
        ],
        exemplars_used=[
            ExemplarItem(
                id="kb-gold-123",
                question="Do you encrypt data?",
                approved_answer="Yes, AES-256 is enforced.",
                category="Golden Q&A",
                relevance_score=0.95
            )
        ],
        tone_applied="Authoritative & Direct"
    )

    data = resp.model_dump()
    assert len(data["exemplars_used"]) == 1
    assert data["exemplars_used"][0]["question"] == "Do you encrypt data?"
    assert data["tone_applied"] == "Authoritative & Direct"

