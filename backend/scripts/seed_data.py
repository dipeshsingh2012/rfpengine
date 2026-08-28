from __future__ import annotations

import asyncio
import logging
import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.core.config import get_settings
from app.core.db import get_session_factory
from app.models.schemas import KBEntryBase
from app.services.elasticsearch_service import ElasticsearchService
from app.services.hybrid_search_service import HybridSearchService
from app.services.pinecone_service import PineconeService
from app.services.postgres_service import PostgresService

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("seed_data")

SEED_ENTRIES = [
    KBEntryBase(
        question="Describe your data retention and deletion policy.",
        answer=(
            "Acme retains customer data for the duration of the active subscription and for up to 30 days "
            "after termination to support recovery and orderly account closure. Backups are rotated on a 35-day schedule, "
            "after which data is permanently deleted unless a longer period is required by law."
        ),
        category="Privacy & Retention",
        metadata={"owner": "legal", "confidence": 0.98},
    ),
    KBEntryBase(
        question="What encryption standards and key management practices do you use?",
        answer=(
            "Customer data is encrypted in transit using TLS 1.2 or higher and at rest using AES-256 encryption. "
            "Cryptographic keys are managed through an automated key management service with annual key rotation."
        ),
        category="Security",
        metadata={"owner": "security", "confidence": 0.99},
    ),
    KBEntryBase(
        question="What security certifications and compliance audits do you maintain?",
        answer=(
            "Our security program complies with SOC 2 Type II and ISO 27001 standards. Third-party audit reports "
            "and penetration test summaries are available upon request under mutual NDA."
        ),
        category="Compliance",
        metadata={"owner": "compliance", "confidence": 0.95},
    ),
    KBEntryBase(
        question="What is your standard implementation timeline and onboarding process?",
        answer=(
            "A standard implementation typically takes 4 to 8 weeks, depending on data migration complexity "
            "and single sign-on integrations. A dedicated implementation manager is assigned to coordinate kickoff, "
            "testing, and go-live."
        ),
        category="Implementation",
        metadata={"owner": "product", "confidence": 0.92},
    ),
    KBEntryBase(
        question="What technical support and SLA tiers are included with the platform?",
        answer=(
            "Standard subscriptions include 24x5 email and help-center support with a 4-hour critical issue SLA. "
            "Enterprise tier adds 24x7 phone support, dedicated Slack channels, and a 1-hour critical response SLA."
        ),
        category="Support",
        metadata={"owner": "support", "confidence": 0.94},
    ),
]


async def main() -> None:
    settings = get_settings()
    tenant_id = "acme-corp"
    logger.info("Starting seed data insertion for tenant '%s'...", tenant_id)

    # 1. Initialize services
    session_factory = get_session_factory()
    es_service = ElasticsearchService(settings)
    pinecone_service = PineconeService(settings)
    hybrid_search = HybridSearchService(
        settings=settings,
        es_service=es_service,
        pinecone_service=pinecone_service,
    )

    # 2. Insert into PostgreSQL
    logger.info("Seeding %d entries into PostgreSQL...", len(SEED_ENTRIES))
    created_entries = []
    try:
        async with session_factory() as session:
            created_entries = await PostgresService.create_batch_kb_entries(
                session, tenant_id=tenant_id, entries=SEED_ENTRIES
            )
        logger.info("✓ Inserted %d entries into PostgreSQL.", len(created_entries))
    except Exception as exc:
        logger.error("✗ Failed to insert entries into PostgreSQL: %s", exc)

    # 3. Index into Elasticsearch
    logger.info("Indexing entries into Elasticsearch...")
    try:
        for entry in created_entries:
            await es_service.index_document(
                doc_id=entry.id,
                tenant_id=entry.tenant_id,
                question=entry.question,
                answer=entry.answer,
                category=entry.category,
                metadata=entry.metadata_json,
            )
        logger.info("✓ Elasticsearch indexing completed.")
    except Exception as exc:
        logger.error("✗ Failed to index in Elasticsearch: %s", exc)
    finally:
        await es_service.close()

    # 4. Upsert into Pinecone
    if pinecone_service.is_configured():
        logger.info("Vectorizing and upserting entries into Pinecone...")
        try:
            for entry in created_entries:
                embedding = await hybrid_search.generate_embedding(entry.question)
                if embedding:
                    await pinecone_service.upsert_vector(
                        doc_id=entry.id,
                        vector=embedding,
                        metadata={
                            "tenant_id": entry.tenant_id,
                            "doc_id": entry.id,
                            "question": entry.question,
                            "answer": entry.answer,
                            "category": entry.category or "",
                        },
                    )
            logger.info("✓ Pinecone vector upsert completed.")
        except Exception as exc:
            logger.error("✗ Failed to upsert to Pinecone: %s", exc)
    else:
        logger.info("ℹ Pinecone unconfigured, skipped vector upsert.")

    logger.info("Seed process completed.")


if __name__ == "__main__":
    asyncio.run(main())

