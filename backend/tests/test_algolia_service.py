from __future__ import annotations

import pytest
from app.services.algolia_service import AlgoliaService

@pytest.mark.asyncio
async def test_algolia_search_returns_results():
    service = AlgoliaService(app_id="id", api_key="key", index_name="idx")
    results = await service.search("test query")
    assert isinstance(results, list)
    assert len(results) > 0
    assert "name" in results[0]

@pytest.mark.asyncio
async def test_algolia_index_document():
    service = AlgoliaService(app_id="id", api_key="key", index_name="idx")
    success = await service.index_document(
        doc_id="1",
        tenant_id="tenant_1",
        question="Test?",
        answer="Answer"
    )
    assert success is True
