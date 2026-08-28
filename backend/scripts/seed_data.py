from __future__ import annotations

import asyncio
import logging
import sys
import uuid
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.core.config import get_settings
from app.services.document_parser_service import DocumentParserService
from app.services.elasticsearch_service import ElasticsearchService
from app.services.hybrid_search_service import HybridSearchService
from app.services.pinecone_service import PineconeService

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("seed_data")


async def main() -> None:
    settings = get_settings()
    tenant_id = "acme-corp"
    project_root = backend_dir.parent
    sample_docs_dir = project_root / "sample_docs"

    logger.info("Starting knowledge base ingestion from '%s' for tenant '%s'...", sample_docs_dir, tenant_id)

    # 1. Initialize services
    es_service = ElasticsearchService(settings)
    pinecone_service = PineconeService(settings)
    hybrid_search = HybridSearchService(
        settings=settings,
        es_service=es_service,
        pinecone_service=pinecone_service,
    )

    # 2. Parse all sample documents
    doc_files = sorted(list(sample_docs_dir.glob("*.*")))
    if not doc_files:
        logger.warning("No sample documents found in '%s'", sample_docs_dir)
        return

    all_chunks = []
    for file_path in doc_files:
        if file_path.name.startswith("."):
            continue
        try:
            content = file_path.read_bytes()
            chunks = DocumentParserService.parse_document(
                content=content,
                filename=file_path.name,
                tenant_id=tenant_id,
            )
            logger.info("📄 Parsed %d chunks from %s", len(chunks), file_path.name)
            all_chunks.extend(chunks)
        except Exception as exc:
            logger.error("Failed to parse %s: %s", file_path.name, exc)

    logger.info("Total chunks extracted across all sample documents: %d", len(all_chunks))

    # 3. Index into Elasticsearch
    logger.info("Indexing chunks into Elasticsearch index '%s'...", settings.elasticsearch_index)
    es_indexed_count = 0
    try:
        await es_service.ensure_index_exists()
        for chunk in all_chunks:
            doc_id = f"kb-{uuid.uuid4().hex[:8]}"
            success = await es_service.index_document(
                doc_id=doc_id,
                tenant_id=chunk.tenant_id,
                question=chunk.question,
                answer=chunk.answer,
                category=chunk.category,
                metadata=chunk.metadata,
            )
            if success:
                es_indexed_count += 1
        logger.info("✓ Elasticsearch indexing completed: %d documents indexed.", es_indexed_count)
    except Exception as exc:
        logger.error("✗ Failed to index in Elasticsearch: %s", exc)
    finally:
        await es_service.close()

    # 4. Upsert into Pinecone
    if pinecone_service.is_configured():
        logger.info("Vectorizing and upserting chunks into Pinecone...")
        pinecone_count = 0
        try:
            for chunk in all_chunks:
                doc_id = f"kb-{uuid.uuid4().hex[:8]}"
                embed_text = f"Topic: {chunk.question}\n{chunk.answer}"
                embedding = await hybrid_search.generate_embedding(embed_text)
                if embedding:
                    await pinecone_service.upsert_vector(
                        doc_id=doc_id,
                        vector=embedding,
                        metadata={
                            "tenant_id": chunk.tenant_id,
                            "doc_id": doc_id,
                            "question": chunk.question,
                            "answer": chunk.answer[:1000],
                            "category": chunk.category or "",
                            "source_file": chunk.metadata.get("source_file", "sample_doc") if chunk.metadata else "sample_doc",
                        },
                    )
                    pinecone_count += 1
            logger.info("✓ Pinecone vector upsert completed: %d vectors upserted.", pinecone_count)
        except Exception as exc:
            logger.error("✗ Failed to upsert to Pinecone: %s", exc)
    else:
        logger.info("ℹ Pinecone unconfigured or in offline mode, skipped vector upsert.")

    logger.info("Knowledge base seeding process successfully finished.")


if __name__ == "__main__":
    asyncio.run(main())
