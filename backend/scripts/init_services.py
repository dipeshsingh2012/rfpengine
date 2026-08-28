from __future__ import annotations

import asyncio
import logging
import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.core.config import get_settings
from app.core.db import Base, get_engine
from app.services.elasticsearch_service import ElasticsearchService
from app.services.pinecone_service import PineconeService

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("init_services")


async def main() -> None:
    settings = get_settings()
    logger.info("Starting initialization of PostgreSQL, Elasticsearch, and Pinecone...")

    # 1. PostgreSQL Tables
    logger.info("Step 1: Initializing PostgreSQL database tables...")
    try:
        engine = get_engine()
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("✓ PostgreSQL tables created successfully.")
    except Exception as exc:
        logger.error("✗ Failed to initialize PostgreSQL tables: %s", exc)

    # 2. Elasticsearch Index
    logger.info("Step 2: Initializing Elasticsearch index '%s'...", settings.elasticsearch_index)
    es_service = ElasticsearchService(settings)
    try:
        success = await es_service.ensure_index_exists()
        if success:
            logger.info("✓ Elasticsearch index verified/created.")
        else:
            logger.warning("✗ Elasticsearch index creation failed.")
    except Exception as exc:
        logger.error("✗ Elasticsearch error: %s", exc)
    finally:
        await es_service.close()

    # 3. Pinecone Index
    logger.info("Step 3: Initializing Pinecone index '%s'...", settings.pinecone_index)
    pinecone_service = PineconeService(settings)
    if pinecone_service.is_configured():
        try:
            success = await pinecone_service.ensure_index_exists()
            if success:
                logger.info("✓ Pinecone index verified/created.")
            else:
                logger.warning("✗ Pinecone index creation failed.")
        except Exception as exc:
            logger.error("✗ Pinecone error: %s", exc)
    else:
        logger.info("ℹ PINECONE_API_KEY not set. Pinecone index creation skipped.")

    logger.info("Initialization complete.")


if __name__ == "__main__":
    asyncio.run(main())

