from __future__ import annotations

import sys
from pathlib import Path
from typing import Any, Dict, List, Optional
import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.pool import NullPool

# Ensure backend directory is in sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.core.config import get_settings, Settings
from app.core.db import normalize_database_url
from app.main import app as fastapi_app
from app.models.schemas import SearchRequest, SearchResponse, Source


class MockHybridSearchService:
    """Mock HybridSearchService providing deterministic test responses."""
    async def generate_embedding(self, text: str) -> Optional[List[float]]:
        return [0.1] * 768

    async def generate_embeddings_batch(self, texts: List[str]) -> List[Optional[List[float]]]:
        return [[0.1] * 768 for _ in texts]

    async def search(self, request: SearchRequest) -> SearchResponse:
        sources = [
            Source(
                id=f"doc-mock-{i}",
                title=f"Security Policy Section {i}",
                content=f"Encrypted using AES-256 standard and verified under SOC 2 Type II guidelines (passage {i}).",
                question=request.question,
                answer=f"Encrypted using AES-256 standard (passage {i}).",
                score=round(0.95 - (i * 0.05), 2),
                source_type="hybrid",
                metadata={"source_file": "Security_Whitepaper.pdf"}
            )
            for i in range(1, min(request.top_k + 1, 6))
        ]
        return SearchResponse(
            suggested_answer="All data is encrypted at rest using AES-256 and in transit via TLS 1.3 across all services.",
            confidence_score=0.94,
            sources=sources,
        )


@pytest.fixture(scope="session")
def settings() -> Settings:
    return get_settings()


@pytest.fixture(autouse=True)
def init_app_state_mocks():
    """Ensures app.state has mock search services attached during tests."""
    if not hasattr(fastapi_app.state, "hybrid_search") or fastapi_app.state.hybrid_search is None:
        fastapi_app.state.hybrid_search = MockHybridSearchService()


from app.core.db import Base
import app.models.db_models  # Ensure all models are registered on Base.metadata


@pytest_asyncio.fixture(scope="function")
async def db_session() -> AsyncSession:
    """
    Yields an active async database session and ensures clean engine disposal per test.
    """
    app_settings = get_settings()
    normalized_url = normalize_database_url(app_settings.effective_database_url)
    engine = create_async_engine(normalized_url, poolclass=NullPool)

    # Ensure all tables exist in test database
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await conn.execute(text("ALTER TABLE question_reviews ADD COLUMN IF NOT EXISTS is_promoted_to_kb BOOLEAN DEFAULT FALSE;"))
        await conn.execute(text("ALTER TABLE question_reviews ADD COLUMN IF NOT EXISTS promoted_kb_id VARCHAR(64);"))

    session_factory = async_sessionmaker(
        bind=engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )
    async with session_factory() as session:
        yield session
    await engine.dispose()
