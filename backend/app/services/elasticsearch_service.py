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
                            "title": {"type": "text", "analyzer": "standard"},
                            "content": {"type": "text", "analyzer": "standard"},
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
                                    "section": {"type": "keyword"},
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
        Bulk indexes multiple document chunks / passages in a single high-performance request.
        """
        if not documents:
            return 0
        try:
            actions = []
            for doc in documents:
                title = doc.get("title") or doc.get("question", "")
                content = doc.get("content") or doc.get("answer", "")
                actions.append({
                    "_index": self.index_name,
                    "_id": doc["id"],
                    "_source": {
                        "tenant_id": doc.get("tenant_id", "acme-corp"),
                        "title": title,
                        "content": content,
                        "question": title,
                        "answer": content,
                        "category": doc.get("category", ""),
                        "created_at": doc.get("created_at"),
                        "metadata": doc.get("metadata", {}),
                    },
                })
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
        question: str = "",
        answer: str = "",
        title: Optional[str] = None,
        content: Optional[str] = None,
        category: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> bool:
        try:
            eff_title = title or question
            eff_content = content or answer
            doc = {
                "tenant_id": tenant_id,
                "title": eff_title,
                "content": eff_content,
                "question": eff_title,
                "answer": eff_content,
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
                                    "fields": ["title^2", "content", "question^2", "answer"],
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
                title = source.get("title") or source.get("question", "")
                content = source.get("content") or source.get("answer", "")
                meta = source.get("metadata", {})
                results.append({
                    "id": hit["_id"],
                    "title": title,
                    "content": content,
                    "question": title,
                    "answer": content,
                    "category": source.get("category", ""),
                    "score": float(hit.get("_score", 0.0)),
                    "source_type": "elasticsearch",
                    "source_file": meta.get("source_file"),
                    "page_number": meta.get("page_number"),
                    "metadata": meta,
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
            results = []
            for hit in hits:
                src = hit["_source"]
                title = src.get("title") or src.get("question", "")
                content = src.get("content") or src.get("answer", "")
                results.append({
                    "id": hit["_id"],
                    "tenant_id": src.get("tenant_id", tenant_id),
                    "title": title,
                    "content": content,
                    "question": title,
                    "answer": content,
                    "category": src.get("category", ""),
                    "metadata": src.get("metadata", {}),
                })
            return results
        except Exception as exc:
            logger.warning("Elasticsearch list_documents failed: %s", exc)
            return []

    async def get_document(self, doc_id: str) -> Optional[Dict[str, Any]]:
        try:
            res = await self.client.get(index=self.index_name, id=doc_id)
            if res and res.get("found"):
                source = res.get("_source", {})
                title = source.get("title") or source.get("question", "")
                content = source.get("content") or source.get("answer", "")
                return {
                    "id": doc_id,
                    "tenant_id": source.get("tenant_id", ""),
                    "title": title,
                    "content": content,
                    "question": title,
                    "answer": content,
                    "category": source.get("category", ""),
                    "metadata": source.get("metadata", {}),
                }
            return None
        except Exception as exc:
            logger.warning("Elasticsearch get_document failed for %s: %s", doc_id, exc)
            return None
