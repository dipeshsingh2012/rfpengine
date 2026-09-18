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
import app.models.db_models  # noqa: F401 - Register models with Base.metadata
from app.services.algolia_service import AlgoliaService
from app.services.pinecone_service import PineconeService

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("init_services")


async def main() -> None:
    settings = get_settings()
    logger.info("Starting initialization of PostgreSQL, Algolia, and Pinecone...")

    # 1. PostgreSQL Tables
    logger.info("Step 1: Initializing PostgreSQL database tables...")
    try:
        engine = get_engine()
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
            from sqlalchemy import text
            await conn.execute(text("ALTER TABLE workspace_settings ADD COLUMN IF NOT EXISTS active_tuned_model_id VARCHAR(256);"))
        logger.info("✓ PostgreSQL tables created successfully.")
    except Exception as exc:
        logger.error("✗ Failed to initialize PostgreSQL tables: %s", exc)
        raise
    finally:
        from app.core.db import close_db_connection
        await close_db_connection()

    # 2. Algolia Index
    logger.info("Step 2: Initializing Algolia index '%s'...", settings.algolia_index_name)
    algolia_service = AlgoliaService(settings)
    if algolia_service.is_configured():
        try:
            success = await algolia_service.ensure_index_exists()
            if success:
                logger.info("✓ Algolia index verified/configured.")
            else:
                logger.warning("✗ Algolia index configuration failed.")
        except Exception as exc:
            logger.error("✗ Algolia error: %s", exc)
        finally:
            await algolia_service.close()
    else:
        logger.info("ℹ ALGOLIA_APP_ID / ALGOLIA_API_KEY not set. Algolia index configuration skipped.")

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

