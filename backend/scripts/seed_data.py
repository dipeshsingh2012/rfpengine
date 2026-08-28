from __future__ import annotations

import asyncio
import hashlib
import logging
import sys
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

    # 2. Parse all sample documents into coherent passage chunks
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
            logger.info("📄 Parsed %d passage chunks from %s", len(chunks), file_path.name)
            all_chunks.extend(chunks)
        except Exception as exc:
            logger.error("Failed to parse %s: %s", file_path.name, exc)

    logger.info("Total passage chunks extracted across all sample documents: %d", len(all_chunks))

    # Generate deterministic IDs and embedding prompts for passage chunks
    doc_ids = []
    embed_prompts = []
    for chunk in all_chunks:
        raw_key = f"{chunk.tenant_id}::{chunk.title}::{chunk.content}"
        doc_id = f"kb-{hashlib.sha256(raw_key.encode('utf-8')).hexdigest()[:12]}"
        doc_ids.append(doc_id)
        embed_prompts.append(f"Title: {chunk.title}\n\nContent: {chunk.content}")

    # 3. PostgreSQL Database Sync (kb_entries)
    try:
        from app.core.db import get_session_factory
        from app.models.db_models import KBEntry
        from sqlalchemy import delete

        logger.info("Syncing %d passage chunks into PostgreSQL 'kb_entries' for tenant '%s'...", len(all_chunks), tenant_id)
        session_factory = get_session_factory()
        async with session_factory() as session:
            # Clear existing seed chunks for this tenant to keep in sync
            await session.execute(delete(KBEntry).where(KBEntry.tenant_id == tenant_id))
            for i, chunk in enumerate(all_chunks):
                db_entry = KBEntry(
                    id=doc_ids[i],
                    tenant_id=chunk.tenant_id,
                    question=chunk.title or chunk.question or "General",
                    answer=chunk.content or chunk.answer or "",
                    category=chunk.category or "General",
                    metadata_json=chunk.metadata or {},
                )
                session.add(db_entry)
            await session.commit()
            logger.info("✓ PostgreSQL sync completed: %d kb_entries synced.", len(all_chunks))
    except Exception as exc:
        logger.warning("PostgreSQL sync skipped or encountered error: %s", exc)

    # 4. Batch Index into Elasticsearch / Elastic Cloud
    logger.info("Indexing %d passage chunks into Elasticsearch index '%s'...", len(all_chunks), settings.elasticsearch_index)
    es_docs = [
        {
            "id": doc_ids[i],
            "tenant_id": chunk.tenant_id,
            "title": chunk.title,
            "content": chunk.content,
            "question": chunk.title,
            "answer": chunk.content,
            "category": chunk.category or "",
            "metadata": chunk.metadata or {},
        }
        for i, chunk in enumerate(all_chunks)
    ]
    try:
        await es_service.ensure_index_exists()
        try:
            await es_service.client.delete_by_query(
                index=settings.elasticsearch_index,
                query={"term": {"tenant_id": tenant_id}},
                refresh=True,
            )
        except Exception as del_err:
            logger.debug("Elasticsearch tenant prune notice: %s", del_err)

        indexed_count = await es_service.bulk_index_documents(es_docs)
        if indexed_count > 0:
            logger.info("✓ Elasticsearch bulk indexing completed: %d documents indexed.", indexed_count)
        else:
            logger.warning("Elasticsearch bulk indexing returned 0 documents indexed.")
    except Exception as exc:
        logger.error("✗ Failed to index in Elasticsearch: %s", exc)
    finally:
        await es_service.close()

    # 5. Batch Embed & Bulk Upsert into Pinecone Serverless
    if pinecone_service.is_configured():
        logger.info("Vectorizing and bulk-upserting %d passages into Pinecone (index: %s)...", len(all_chunks), settings.pinecone_index)
        try:
            await pinecone_service.ensure_index_exists()
            index = pinecone_service.client.Index(settings.pinecone_index)
            # Prune any stale vectors in the namespace not matching current doc_ids
            try:
                existing_ids = []
                for ids_page in index.list(namespace=""):
                    for item in ids_page:
                        item_id = item.id if hasattr(item, "id") else str(item)
                        existing_ids.append(item_id)
                stale_ids = [vid for vid in existing_ids if vid not in doc_ids]
                if stale_ids:
                    await asyncio.to_thread(index.delete, ids=stale_ids, namespace="")
                    logger.info("✓ Pruned %d stale vectors from Pinecone.", len(stale_ids))
            except Exception as del_exc:
                logger.debug("Pinecone pruning notice: %s", del_exc)

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
                            "title": chunk.title,
                            "content": chunk.content[:1000],
                            "question": chunk.title,
                            "answer": chunk.content[:1000],
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
        logger.info("ℹ Pinecone unconfigured (PINECONE_API_KEY is not set), skipping vector upsert.")

    logger.info("Knowledge base seeding process successfully finished.")


if __name__ == "__main__":
    asyncio.run(main())
