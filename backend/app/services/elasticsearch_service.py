from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional
from elasticsearch import AsyncElasticsearch
from elasticsearch.exceptions import NotFoundError

from app.core.config import Settings

logger = logging.getLogger(__name__)


class ElasticsearchService:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.index_name = settings.elasticsearch_index
        auth = None
        if settings.elasticsearch_username and settings.elasticsearch_password:
            auth = (settings.elasticsearch_username, settings.elasticsearch_password)

        self.client = AsyncElasticsearch(
            hosts=[settings.elasticsearch_url],
            basic_auth=auth,
            verify_certs=settings.elasticsearch_verify_certs,
            request_timeout=10,
        )

    async def close(self) -> None:
        await self.client.close()

    async def health_check(self) -> Dict[str, Any]:
        try:
            info = await self.client.info()
            return {"status": "ok", "version": info.get("version", {}).get("number", "unknown")}
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
                        }
                    },
                }
                await self.client.indices.create(index=self.index_name, body=body)
                logger.info("Created Elasticsearch index: %s", self.index_name)
            return True
        except Exception as exc:
            logger.error("Failed to ensure Elasticsearch index: %s", exc)
            return False

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

