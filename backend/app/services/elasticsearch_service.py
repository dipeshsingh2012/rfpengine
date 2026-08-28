from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional
from elasticsearch import AsyncElasticsearch
from elasticsearch.exceptions import NotFoundError
from elasticsearch.helpers import async_bulk

from app.core.config import Settings

logger = logging.getLogger(__name__)


class ElasticsearchService:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.index_name = settings.elasticsearch_index

        client_kwargs: Dict[str, Any] = {
            "request_timeout": 15,
        }

        # 1. Host / Cloud ID configuration
        if settings.elastic_cloud_id:
            client_kwargs["cloud_id"] = settings.elastic_cloud_id
            client_kwargs["verify_certs"] = True
        else:
            client_kwargs["hosts"] = [settings.elasticsearch_url]
            is_https = settings.elasticsearch_url.startswith("https://")
            client_kwargs["verify_certs"] = True if is_https else settings.elasticsearch_verify_certs

        # 2. Authentication (API Key takes precedence over basic auth)
        if settings.elasticsearch_api_key:
            client_kwargs["api_key"] = settings.elasticsearch_api_key
        elif settings.elasticsearch_username and settings.elasticsearch_password:
            client_kwargs["basic_auth"] = (settings.elasticsearch_username, settings.elasticsearch_password)

        self.client = AsyncElasticsearch(**client_kwargs)

    async def close(self) -> None:
        await self.client.close()

    async def health_check(self) -> Dict[str, Any]:
        try:
            info = await self.client.info()
            return {
                "status": "ok",
                "version": info.get("version", {}).get("number", "unknown"),
                "cluster_name": info.get("cluster_name", "unknown"),
            }
        except Exception as exc:
            return {"status": "error", "details": str(exc)}

    async def ensure_index_exists(self) -> bool:
        try:
            exists = await self.client.indices.exists(index=self.index_name)
            if not exists:
                body = {
                    "settings": {
                        "number_of_shards": 1,
                        "number_of_replicas": 0,
                    },
                    "mappings": {
                        "properties": {
                            "tenant_id": {"type": "keyword"},
                            "question": {"type": "text", "analyzer": "standard"},
                            "answer": {"type": "text", "analyzer": "standard"},
                            "category": {"type": "keyword"},
                            "created_at": {"type": "date"},
                            "metadata": {
                                "properties": {
                                    "source_file": {"type": "keyword"},
                                    "format": {"type": "keyword"},
                                    "page_number": {"type": "integer"},
                                    "chunk_index": {"type": "integer"},
                                }
                            },
                        }
                    },
                }
                await self.client.indices.create(index=self.index_name, body=body)
                logger.info("Created Elasticsearch index: %s", self.index_name)
            return True
        except Exception as exc:
            logger.error("Failed to ensure Elasticsearch index: %s", exc)
            return False

    async def bulk_index_documents(self, documents: List[Dict[str, Any]]) -> int:
        """
        Bulk indexes multiple document chunks in a single high-performance request.
        """
        if not documents:
            return 0
        try:
            actions = [
                {
                    "_index": self.index_name,
                    "_id": doc["id"],
                    "_source": {
                        "tenant_id": doc.get("tenant_id", "acme-corp"),
                        "question": doc.get("question", ""),
                        "answer": doc.get("answer", ""),
                        "category": doc.get("category", ""),
                        "created_at": doc.get("created_at"),
                        "metadata": doc.get("metadata", {}),
                    },
                }
                for doc in documents
            ]
            success_count, errors = await async_bulk(self.client, actions, refresh=True)
            if errors:
                logger.warning("Elasticsearch bulk indexing had errors: %s", errors)
            return success_count
        except Exception as exc:
            logger.error("Elasticsearch bulk indexing failed: %s", exc)
            return 0

    async def index_document(
        self,
        doc_id: str,
        tenant_id: str,
        question: str,
        answer: str,
        category: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> bool:
        try:
            doc = {
                "tenant_id": tenant_id,
                "question": question,
                "answer": answer,
                "category": category or "",
                "metadata": metadata or {},
            }
            await self.client.index(index=self.index_name, id=doc_id, document=doc, refresh=True)
            return True
        except Exception as exc:
            logger.error("Elasticsearch indexing failed for doc %s: %s", doc_id, exc)
            return False

    async def delete_document(self, doc_id: str) -> bool:
        try:
            await self.client.delete(index=self.index_name, id=doc_id, refresh=True)
            return True
        except NotFoundError:
            return False
        except Exception as exc:
            logger.error("Elasticsearch deletion failed for doc %s: %s", doc_id, exc)
            return False

    async def search_sparse(
        self,
        tenant_id: str,
        query: str,
        top_k: int = 5,
    ) -> List[Dict[str, Any]]:
        try:
            search_body = {
                "size": top_k,
                "query": {
                    "bool": {
                        "filter": [{"term": {"tenant_id": tenant_id}}],
                        "must": [
                            {
                                "multi_match": {
                                    "query": query,
                                    "fields": ["question^2", "answer"],
                                    "fuzziness": "AUTO",
                                }
                            }
                        ],
                    }
                },
            }
            response = await self.client.search(index=self.index_name, body=search_body)
            hits = response.get("hits", {}).get("hits", [])
            results = []
            for hit in hits:
                source = hit.get("_source", {})
                results.append({
                    "id": hit["_id"],
                    "question": source.get("question", ""),
                    "answer": source.get("answer", ""),
                    "score": float(hit.get("_score", 0.0)),
                    "source_type": "elasticsearch",
                })
            return results
        except Exception as exc:
            logger.warning("Elasticsearch search failed or index not ready: %s", exc)
            return []

    async def list_documents(
        self,
        tenant_id: str,
        limit: int = 50,
        offset: int = 0,
        category: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        try:
            filters = [{"term": {"tenant_id": tenant_id}}]
            if category:
                filters.append({"term": {"category": category}})

            body = {
                "from": offset,
                "size": limit,
                "query": {"bool": {"filter": filters}},
                "sort": [{"_score": {"order": "desc"}}],
            }
            response = await self.client.search(index=self.index_name, body=body)
            hits = response.get("hits", {}).get("hits", [])
            return [
                {
                    "id": hit["_id"],
                    "tenant_id": hit["_source"].get("tenant_id", tenant_id),
                    "question": hit["_source"].get("question", ""),
                    "answer": hit["_source"].get("answer", ""),
                    "category": hit["_source"].get("category", ""),
                    "metadata": hit["_source"].get("metadata", {}),
                }
                for hit in hits
            ]
        except Exception as exc:
            logger.warning("Elasticsearch list_documents failed: %s", exc)
            return []

    async def get_document(self, doc_id: str) -> Optional[Dict[str, Any]]:
        try:
            res = await self.client.get(index=self.index_name, id=doc_id)
            if res and res.get("found"):
                source = res.get("_source", {})
                return {
                    "id": doc_id,
                    "tenant_id": source.get("tenant_id", ""),
                    "question": source.get("question", ""),
                    "answer": source.get("answer", ""),
                    "category": source.get("category", ""),
                    "metadata": source.get("metadata", {}),
                }
            return None
        except Exception as exc:
            logger.warning("Elasticsearch get_document failed for %s: %s", doc_id, exc)
            return None

