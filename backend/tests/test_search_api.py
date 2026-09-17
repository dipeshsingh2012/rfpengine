import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from app.models.schemas import SearchRequest, SearchResponse, Source
from app.services.algolia_service import AlgoliaService
from app.services.hybrid_search_service import HybridSearchService
from app.core.config import Settings


@pytest.mark.asyncio
async def test_algolia_hybrid_search_api_pipeline():
    settings = Settings(
        ALGOLIA_APP_ID="test-app",
        ALGOLIA_API_KEY="test-key",
        ALGOLIA_INDEX_NAME="rfp_knowledge_base",
    )
    algolia_service = AlgoliaService(settings)
    pinecone_service = MagicMock()
    pinecone_service.is_configured.return_value = False

    hybrid_service = HybridSearchService(
        settings=settings,
        algolia_service=algolia_service,
        pinecone_service=pinecone_service,
    )

    mock_algolia_hits = [
        {
            "id": "kb-alg-404",
            "title": "BCP & Disaster Recovery",
            "content": "RTO is 4 hours and RPO is 1 hour.",
            "category": "Operations",
            "source_type": "algolia",
            "score": 0.95,
        }
    ]

    with patch.object(algolia_service, "search_sparse", new_callable=AsyncMock, return_value=mock_algolia_hits):
        with patch.object(hybrid_service, "_generate_answer", new_callable=AsyncMock, return_value="RTO is 4 hours."):
            request = SearchRequest(question="What is your RTO?", tenant_id="acme-corp", top_k=5)
            response = await hybrid_service.search(request)

            assert isinstance(response, SearchResponse)
            assert response.suggested_answer == "RTO is 4 hours."
            assert len(response.sources) == 1
            assert response.sources[0].id == "kb-alg-404"
            assert response.sources[0].source_type == "algolia"
