from __future__ import annotations

import asyncio
import logging
from typing import Any, Dict, List, Optional

from app.core.config import Settings

logger = logging.getLogger(__name__)


class PineconeService:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.index_name = settings.pinecone_index
        self.dimension = settings.pinecone_dimension
        self.metric = settings.pinecone_metric
        self.client = None
        self._index = None

        if settings.pinecone_api_key:
            try:
                from pinecone import Pinecone
                self.client = Pinecone(api_key=settings.pinecone_api_key)
            except Exception as exc:
                logger.warning("Could not initialize Pinecone client: %s", exc)

    def is_configured(self) -> bool:
        return self.client is not None

    def _get_index(self):
        if not self.client:
            return None
        if self._index is None:
            try:
                self._index = self.client.Index(self.index_name)
            except Exception as exc:
                logger.error("Failed to connect to Pinecone index %s: %s", self.index_name, exc)
                return None
        return self._index

    async def health_check(self) -> Dict[str, Any]:
        if not self.is_configured():
            return {"status": "unconfigured", "details": "PINECONE_API_KEY is not set"}
        try:
            indexes = await asyncio.to_thread(self.client.list_indexes)
            index_names = [idx.name for idx in indexes]
            has_index = self.index_name in index_names
            return {
                "status": "ok" if has_index else "index_missing",
                "indexes": index_names,
                "target_index": self.index_name,
            }
        except Exception as exc:
            return {"status": "error", "details": str(exc)}

    async def ensure_index_exists(self) -> bool:
        if not self.is_configured():
            logger.warning("Pinecone is not configured, skipping index creation.")
            return False
        try:
            from pinecone import ServerlessSpec
            indexes = await asyncio.to_thread(self.client.list_indexes)
            index_names = [idx.name for idx in indexes]
            if self.index_name not in index_names:
                spec = ServerlessSpec(
                    cloud=self.settings.pinecone_cloud or "aws",
                    region=self.settings.pinecone_region or "us-east-1",
                )
                await asyncio.to_thread(
                    self.client.create_index,
                    name=self.index_name,
                    dimension=self.dimension,
                    metric=self.metric,
                    spec=spec,
                )
                logger.info(
                    "Created Pinecone serverless index: %s (%s/%s)",
                    self.index_name,
                    self.settings.pinecone_cloud,
                    self.settings.pinecone_region,
                )
            return True
        except Exception as exc:
            logger.error("Failed to ensure Pinecone index %s: %s", self.index_name, exc)
            return False

    async def bulk_upsert_vectors(self, vectors: List[Dict[str, Any]]) -> int:
        """
        Batched upsert of vector objects to Pinecone in a single API call.
        Each vector item format: {"id": str, "values": List[float], "metadata": Dict[str, Any]}
        """
        index = self._get_index()
        if not index or not vectors:
            return 0
        try:
            await asyncio.to_thread(index.upsert, vectors=vectors)
            return len(vectors)
        except Exception as exc:
            logger.error("Pinecone bulk upsert failed for %d vectors: %s", len(vectors), exc)
            return 0

    async def upsert_vector(
        self,
        doc_id: str,
        vector: List[float],
        metadata: Dict[str, Any],
    ) -> bool:
        index = self._get_index()
        if not index:
            return False
        try:
            item = {
                "id": doc_id,
                "values": vector,
                "metadata": metadata,
            }
            await asyncio.to_thread(index.upsert, vectors=[item])
            return True
        except Exception as exc:
            logger.error("Pinecone upsert failed for %s: %s", doc_id, exc)
            return False

    async def delete_vector(self, doc_id: str) -> bool:
        index = self._get_index()
        if not index:
            return False
        try:
            await asyncio.to_thread(index.delete, ids=[doc_id])
            return True
        except Exception as exc:
            logger.error("Pinecone delete failed for %s: %s", doc_id, exc)
            return False

    async def query_dense(
        self,
        tenant_id: str,
        vector: List[float],
        top_k: int = 5,
    ) -> List[Dict[str, Any]]:
        index = self._get_index()
        if not index:
            return []
        try:
            filter_query = {"tenant_id": {"$eq": tenant_id}}
            response = await asyncio.to_thread(
                index.query,
                vector=vector,
                top_k=top_k,
                filter=filter_query,
                include_metadata=True,
            )
            matches = response.get("matches", [])
            results = []
            for match in matches:
                meta = match.get("metadata", {}) or {}
                title = meta.get("title") or meta.get("question", "")
                content = meta.get("content") or meta.get("answer", "")
                results.append({
                    "id": match["id"],
                    "title": title,
                    "content": content,
                    "question": title,
                    "answer": content,
                    "score": float(match.get("score", 0.0)),
                    "source_type": "pinecone",
                    "source_file": meta.get("source_file"),
                    "page_number": meta.get("page_number"),
                    "metadata": meta,
                })
            return results
        except Exception as exc:
            logger.warning("Pinecone query failed: %s", exc)
            return []

