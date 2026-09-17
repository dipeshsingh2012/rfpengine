import pytest
from unittest.mock import AsyncMock, patch, MagicMock
import httpx

from app.core.config import Settings
from app.services.algolia_service import AlgoliaService
from app.services.hybrid_search_service import HybridSearchService, reciprocal_rank_fusion
from app.models.schemas import SearchRequest


@pytest.fixture
def test_settings():
    return Settings(
        ALGOLIA_APP_ID="test-app-id",
        ALGOLIA_API_KEY="test-api-key",
        ALGOLIA_INDEX_NAME="rfp_knowledge_base",
    )


# ------------------------------------------------------------------------------
# 1. Configuration Tests
# ------------------------------------------------------------------------------

def test_algolia_service_configuration(test_settings):
    service = AlgoliaService(test_settings)
    assert service.is_configured() is True
    assert service.app_id == "test-app-id"
    assert service.api_key == "test-api-key"
    assert service.index_name == "rfp_knowledge_base"

    unconfigured = AlgoliaService(Settings(ALGOLIA_APP_ID="", ALGOLIA_API_KEY=""))
    assert unconfigured.is_configured() is False


# ------------------------------------------------------------------------------
# 2. Health Check Tests
# ------------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_algolia_health_check_ok(test_settings):
    service = AlgoliaService(test_settings)
    mock_response = MagicMock()
    mock_response.status_code = 200

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock, return_value=mock_response):
        health = await service.health_check()
        assert health["status"] == "ok"
        assert health["index_name"] == "rfp_knowledge_base"
        assert "latency_ms" in health


@pytest.mark.asyncio
async def test_algolia_health_check_unconfigured():
    unconfigured_service = AlgoliaService(Settings(ALGOLIA_APP_ID="", ALGOLIA_API_KEY=""))
    health = await unconfigured_service.health_check()
    assert health["status"] == "unconfigured"


@pytest.mark.asyncio
async def test_algolia_health_check_error_status(test_settings):
    service = AlgoliaService(test_settings)
    mock_response = MagicMock()
    mock_response.status_code = 403
    mock_response.text = "Forbidden - Invalid API key"

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock, return_value=mock_response):
        health = await service.health_check()
        assert health["status"] == "error"
        assert "403" in health["details"]


# ------------------------------------------------------------------------------
# 3. Index Settings & Setup Tests
# ------------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_algolia_ensure_index_exists_success(test_settings):
    service = AlgoliaService(test_settings)
    mock_response = MagicMock()
    mock_response.status_code = 200

    with patch("httpx.AsyncClient.put", new_callable=AsyncMock, return_value=mock_response) as mock_put:
        success = await service.ensure_index_exists()
        assert success is True
        mock_put.assert_called_once()
        _, kwargs = mock_put.call_args
        json_data = kwargs.get("json", {})
        assert "searchableAttributes" in json_data
        assert "attributesForFaceting" in json_data


# ------------------------------------------------------------------------------
# 4. Search Tests
# ------------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_algolia_search_sparse_success(test_settings):
    service = AlgoliaService(test_settings)
    mock_hits = {
        "hits": [
            {
                "objectID": "kb-101",
                "title": "Data Retention Policy",
                "content": "Customer data is retained for 30 days after account termination.",
                "category": "Privacy & Legal",
                "metadata": {"source_file": "privacy.pdf", "page_number": 3},
                "_rankingInfo": {"userScore": 0.95},
            }
        ]
    }
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = mock_hits

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=mock_response) as mock_post:
        results = await service.search_sparse(tenant_id="acme-corp", query="retention policy", top_k=5)
        assert len(results) == 1
        assert results[0]["id"] == "kb-101"
        assert results[0]["title"] == "Data Retention Policy"
        assert results[0]["category"] == "Privacy & Legal"
        assert results[0]["source_type"] == "algolia"
        assert results[0]["source_file"] == "privacy.pdf"

        # Verify query request structure
        mock_post.assert_called_once()
        _, kwargs = mock_post.call_args
        payload = kwargs.get("json", {})
        assert payload["query"] == "retention policy"
        assert payload["filters"] == "tenant_id:acme-corp"
        assert payload["hitsPerPage"] == 5


@pytest.mark.asyncio
async def test_algolia_search_sparse_unconfigured():
    service = AlgoliaService(Settings(ALGOLIA_APP_ID="", ALGOLIA_API_KEY=""))
    results = await service.search_sparse(tenant_id="acme-corp", query="SOC 2")
    assert results == []


# ------------------------------------------------------------------------------
# 5. Indexing & Document Management Tests
# ------------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_algolia_index_document_success(test_settings):
    service = AlgoliaService(test_settings)
    mock_response = MagicMock()
    mock_response.status_code = 200

    with patch("httpx.AsyncClient.put", new_callable=AsyncMock, return_value=mock_response) as mock_put:
        success = await service.index_document(
            doc_id="doc-001",
            tenant_id="acme-corp",
            question="What is your uptime SLA?",
            answer="We offer a 99.9% uptime SLA guarantee.",
            category="Operations",
        )
        assert success is True
        mock_put.assert_called_once()
        _, kwargs = mock_put.call_args
        record = kwargs.get("json", {})
        assert record["objectID"] == "doc-001"
        assert record["tenant_id"] == "acme-corp"
        assert record["title"] == "What is your uptime SLA?"
        assert record["content"] == "We offer a 99.9% uptime SLA guarantee."


@pytest.mark.asyncio
async def test_algolia_bulk_index_documents_success(test_settings):
    service = AlgoliaService(test_settings)
    docs = [
        {"id": "doc-001", "tenant_id": "acme-corp", "title": "Title 1", "content": "Content 1"},
        {"id": "doc-002", "tenant_id": "acme-corp", "title": "Title 2", "content": "Content 2"},
    ]
    mock_response = MagicMock()
    mock_response.status_code = 200

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=mock_response) as mock_post:
        indexed_count = await service.bulk_index_documents(docs)
        assert indexed_count == 2
        mock_post.assert_called_once()
        _, kwargs = mock_post.call_args
        body = kwargs.get("json", {})
        assert len(body["requests"]) == 2
        assert body["requests"][0]["action"] == "updateObject"


@pytest.mark.asyncio
async def test_algolia_delete_document_success(test_settings):
    service = AlgoliaService(test_settings)
    mock_response = MagicMock()
    mock_response.status_code = 200

    with patch("httpx.AsyncClient.delete", new_callable=AsyncMock, return_value=mock_response) as mock_delete:
        success = await service.delete_document("doc-001")
        assert success is True
        mock_delete.assert_called_once()


@pytest.mark.asyncio
async def test_algolia_get_document_success(test_settings):
    service = AlgoliaService(test_settings)
    mock_record = {
        "objectID": "doc-777",
        "tenant_id": "acme-corp",
        "title": "Encryption Standard",
        "content": "AES-256 for data at rest.",
        "category": "Security",
    }
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = mock_record

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock, return_value=mock_response):
        doc = await service.get_document("doc-777")
        assert doc is not None
        assert doc["id"] == "doc-777"
        assert doc["title"] == "Encryption Standard"
        assert doc["content"] == "AES-256 for data at rest."


# ------------------------------------------------------------------------------
# 6. Hybrid Search RRF Integration Tests
# ------------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_hybrid_search_rrf_combining_algolia_and_pinecone(test_settings):
    algolia_service = AlgoliaService(test_settings)
    pinecone_service = MagicMock()
    pinecone_service.is_configured.return_value = True

    hybrid_service = HybridSearchService(
        settings=test_settings,
        algolia_service=algolia_service,
        pinecone_service=pinecone_service,
    )

    algolia_hits = [
        {
            "id": "doc-alg-1",
            "title": "SOC 2 Report Summary",
            "content": "SOC 2 Type II compliance verified.",
            "category": "Security",
            "source_type": "algolia",
            "score": 0.9,
        }
    ]

    pinecone_hits = [
        {
            "id": "doc-pc-1",
            "title": "ISO 27001 Certification",
            "content": "ISO 27001 certified data center operations.",
            "category": "Security",
            "source_type": "pinecone",
            "score": 0.88,
        }
    ]

    with patch.object(algolia_service, "search_sparse", new_callable=AsyncMock, return_value=algolia_hits):
        with patch.object(pinecone_service, "query_dense", new_callable=AsyncMock, return_value=pinecone_hits):
            with patch.object(hybrid_service, "generate_embedding", new_callable=AsyncMock, return_value=[0.1] * 768):
                with patch.object(hybrid_service, "_generate_answer", new_callable=AsyncMock, return_value="Verified security standards."):
                    req = SearchRequest(question="What certifications do you hold?", tenant_id="acme-corp", top_k=5)
                    resp = await hybrid_service.search(req)

                    assert len(resp.sources) == 2
                    source_ids = [s.id for s in resp.sources]
                    assert "doc-alg-1" in source_ids
                    assert "doc-pc-1" in source_ids
                    assert resp.suggested_answer == "Verified security standards."
