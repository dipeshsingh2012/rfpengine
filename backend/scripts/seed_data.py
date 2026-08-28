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

from app.services.gcp_secret_service import GCPSecretService

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("seed_data")


async def main() -> None:
    settings = get_settings()
    tenant_id = "acme-corp"
    project_root = backend_dir.parent
    sample_docs_dir = project_root / "sample_docs"

    # 0. Load GCP Secret Manager secrets if enabled
    gcp_service = GCPSecretService(settings)
    if settings.gcp_secret_manager_enabled and gcp_service.is_configured():
        try:
            secrets = await gcp_service.get_all_app_secrets()
            if secrets:
                settings.apply_gcp_secrets(secrets)
                logger.info("Loaded %d secrets from GCP Secret Manager (project: %s).", len(secrets), settings.gcp_project_id)
        except Exception as exc:
            logger.warning("Could not fetch secrets from GCP Secret Manager: %s", exc)

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

    # Generate IDs and embedding prompts for chunks
    doc_ids = []
    embed_prompts = []
    for chunk in all_chunks:
        doc_id = f"kb-{uuid.uuid4().hex[:8]}"
        doc_ids.append(doc_id)
        embed_prompts.append(f"Topic: {chunk.question}\n{chunk.answer}")

    # 3. Elasticsearch Indexing (Temporarily commented out)
    # logger.info("Indexing %d chunks into Elasticsearch index '%s'...", len(all_chunks), settings.elasticsearch_index)
    # es_docs = [
    #     {
    #         "id": doc_ids[i],
    #         "tenant_id": chunk.tenant_id,
    #         "question": chunk.question,
    #         "answer": chunk.answer,
    #         "category": chunk.category or "",
    #         "metadata": chunk.metadata or {},
    #     }
    #     for i, chunk in enumerate(all_chunks)
    # ]
    # try:
    #     await es_service.ensure_index_exists()
    #     await es_service.bulk_index_documents(es_docs)
    # except Exception as exc:
    #     logger.warning("Elasticsearch indexing skipped: %s", exc)
    # finally:
    #     await es_service.close()

    # 4. Batch Embed & Bulk Upsert into Pinecone Serverless
    if pinecone_service.is_configured() and settings.openai_api_key:
        logger.info("Vectorizing and bulk-upserting %d chunks into Pinecone...", len(all_chunks))
        try:
            await pinecone_service.ensure_index_exists()
            embeddings = await hybrid_search.generate_embeddings_batch(embed_prompts)
            pc_vectors = []
            for i, chunk in enumerate(all_chunks):
                emb = embeddings[i] if i < len(embeddings) else None
                if emb:
                    pc_vectors.append({
                        "id": doc_ids[i],
                        "values": emb,
                        "metadata": {
                            "tenant_id": chunk.tenant_id,
                            "doc_id": doc_ids[i],
                            "question": chunk.question,
                            "answer": chunk.answer[:1000],
                            "category": chunk.category or "",
                            "source_file": chunk.metadata.get("source_file", "sample_doc") if chunk.metadata else "sample_doc",
                            "page_number": chunk.metadata.get("page_number", 1) if chunk.metadata else 1,
                        },
                    })
            if pc_vectors:
                upserted = await pinecone_service.bulk_upsert_vectors(pc_vectors)
                logger.info("✓ Pinecone bulk vector upsert completed: %d vectors upserted.", upserted)
            else:
                logger.warning("No embeddings generated for Pinecone upsert.")
        except Exception as exc:
            logger.error("✗ Failed to upsert to Pinecone: %s", exc)
    else:
        if not pinecone_service.is_configured():
            logger.info("ℹ Pinecone unconfigured (PINECONE_API_KEY is not set), skipping vector upsert.")
        elif not settings.openai_api_key:
            logger.info("ℹ OpenAI API Key is not set, skipping Pinecone vector generation.")

    logger.info("Knowledge base seeding process successfully finished.")


if __name__ == "__main__":
    asyncio.run(main())
