from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.health import router as health_router
from app.api.knowledge_base import router as kb_router
from app.api.responses import router as responses_router
from app.api.search import router as search_router
from app.core.config import get_settings
from app.core.db import Base, close_db_connection, get_engine
from app.services.elasticsearch_service import ElasticsearchService
from app.services.hybrid_search_service import HybridSearchService
from app.services.pinecone_service import PineconeService

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("rfpengine")


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    logger.info("Initializing RFPEngine backend services...")

    # 1. Initialize PostgreSQL tables
    try:
        engine = get_engine()
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("PostgreSQL database tables verified/created.")
    except Exception as exc:
        logger.warning("Could not automatically create PostgreSQL tables (DB may be offline): %s", exc)

    # 2. Initialize Elasticsearch client & index
    es_service = ElasticsearchService(settings)
    app.state.elasticsearch = es_service
    try:
        await es_service.ensure_index_exists()
    except Exception as exc:
        logger.warning("Elasticsearch index initialization deferred: %s", exc)

    # 3. Initialize Pinecone client & index
    pinecone_service = PineconeService(settings)
    app.state.pinecone = pinecone_service
    if pinecone_service.is_configured():
        try:
            await pinecone_service.ensure_index_exists()
        except Exception as exc:
            logger.warning("Pinecone index initialization deferred: %s", exc)

    # 4. Initialize Hybrid Search Service (orchestrator)
    hybrid_search = HybridSearchService(
        settings=settings,
        es_service=es_service,
        pinecone_service=pinecone_service,
    )
    app.state.hybrid_search = hybrid_search

    logger.info("RFPEngine API initialized successfully.")
    yield

    # Shutdown / Cleanup
    logger.info("Shutting down services...")
    await es_service.close()
    await close_db_connection()
    logger.info("Services shut down.")


def create_application() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_origin_regex=settings.cors_origin_regex,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health_router)
    app.include_router(search_router)
    app.include_router(kb_router)
    app.include_router(responses_router)

    return app


app = create_application()
