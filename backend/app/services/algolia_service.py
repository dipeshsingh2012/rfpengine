from __future__ import annotations

import logging
import time
from typing import Any, Dict, List, Optional
import httpx

from app.core.config import Settings

logger = logging.getLogger(__name__)


class AlgoliaService:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.app_id = settings.algolia_app_id
        self.api_key = settings.algolia_api_key
        self.index_name = settings.algolia_index_name

        self._headers = {
            "X-Algolia-Application-Id": self.app_id,
            "X-Algolia-API-Key": self.api_key,
            "Content-Type": "application/json",
        }
        self.base_url = f"https://{self.app_id}-dsn.algolia.net/1/indexes/{self.index_name}" if self.app_id else ""

    def is_configured(self) -> bool:
        return bool(self.app_id and self.api_key)

    async def close(self) -> None:
        pass

    async def health_check(self) -> Dict[str, Any]:
        if not self.is_configured():
            return {"status": "unconfigured", "details": "ALGOLIA_APP_ID or ALGOLIA_API_KEY is missing"}

        start_time = time.perf_counter()
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(
                    f"https://{self.app_id}-dsn.algolia.net/1/indexes/{self.index_name}/settings",
                    headers=self._headers,
                )
                latency = round((time.perf_counter() - start_time) * 1000, 2)
                if resp.status_code == 200:
                    return {
                        "status": "ok",
                        "index_name": self.index_name,
                        "latency_ms": latency,
                        "details": f"Connected to Algolia index '{self.index_name}'",
                    }
                else:
                    return {
                        "status": "error",
                        "details": f"Algolia API returned HTTP {resp.status_code}: {resp.text}",
                    }
        except Exception as exc:
            return {"status": "error", "details": str(exc)}

    async def ensure_index_exists(self) -> bool:
        if not self.is_configured():
            logger.warning("Algolia index setup skipped: ALGOLIA_APP_ID/ALGOLIA_API_KEY unconfigured.")
            return False

        try:
            index_settings = {
                "searchableAttributes": [
                    "title,question",
                    "content,answer",
                    "category",
                ],
                "attributesForFaceting": [
                    "filterOnly(tenant_id)",
                    "filterOnly(category)",
                ],
                "customRanking": ["desc(created_at)"],
            }
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.put(
                    f"https://{self.app_id}.algolia.net/1/indexes/{self.index_name}/settings",
                    headers=self._headers,
                    json=index_settings,
                )
                if resp.status_code in (200, 201):
                    logger.info("Configured Algolia index settings for: %s", self.index_name)
                    return True
                else:
                    logger.error("Failed to set Algolia index settings: %s", resp.text)
                    return False
        except Exception as exc:
            logger.error("Algolia index creation/configuration failed: %s", exc)
            return False

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
        if not self.is_configured():
            logger.warning("Algolia index_document skipped: unconfigured credentials.")
            return False

        try:
            eff_title = title or question
            eff_content = content or answer
            record = {
                "objectID": doc_id,
                "id": doc_id,
                "tenant_id": tenant_id,
                "title": eff_title,
                "content": eff_content,
                "question": eff_title,
                "answer": eff_content,
                "category": category or "",
                "created_at": int(time.time()),
                "metadata": metadata or {},
            }
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.put(
                    f"{self.base_url}/{doc_id}",
                    headers=self._headers,
                    json=record,
                )
                return resp.status_code in (200, 201)
        except Exception as exc:
            logger.error("Algolia index_document failed for doc %s: %s", doc_id, exc)
            return False

    async def bulk_index_documents(self, documents: List[Dict[str, Any]]) -> int:
        if not documents or not self.is_configured():
            return 0

        try:
            requests = []
            for doc in documents:
                title = doc.get("title") or doc.get("question", "")
                content = doc.get("content") or doc.get("answer", "")
                requests.append({
                    "action": "updateObject",
                    "body": {
                        "objectID": doc["id"],
                        "id": doc["id"],
                        "tenant_id": doc.get("tenant_id", "acme-corp"),
                        "title": title,
                        "content": content,
                        "question": title,
                        "answer": content,
                        "category": doc.get("category", ""),
                        "created_at": int(time.time()),
                        "metadata": doc.get("metadata", {}),
                    },
                })

            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.post(
                    f"{self.base_url}/batch",
                    headers=self._headers,
                    json={"requests": requests},
                )
                if resp.status_code in (200, 201):
                    return len(documents)
                else:
                    logger.warning("Algolia bulk indexing failed: %s", resp.text)
                    return 0
        except Exception as exc:
            logger.error("Algolia bulk indexing error: %s", exc)
            return 0

    async def delete_document(self, doc_id: str) -> bool:
        if not self.is_configured():
            return False

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.delete(
                    f"{self.base_url}/{doc_id}",
                    headers=self._headers,
                )
                return resp.status_code in (200, 202, 404)
        except Exception as exc:
            logger.error("Algolia delete_document failed for doc %s: %s", doc_id, exc)
            return False

    async def search_sparse(
        self,
        tenant_id: str,
        query: str,
        top_k: int = 5,
    ) -> List[Dict[str, Any]]:
        if not self.is_configured():
            return []

        try:
            payload = {
                "query": query,
                "hitsPerPage": top_k,
                "filters": f"tenant_id:{tenant_id}",
            }
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(
                    f"{self.base_url}/query",
                    headers=self._headers,
                    json=payload,
                )
                if resp.status_code != 200:
                    logger.warning("Algolia search failed with status %d: %s", resp.status_code, resp.text)
                    return []

                data = resp.json()
                hits = data.get("hits", [])
                results = []
                for rank, hit in enumerate(hits, start=1):
                    doc_id = hit.get("objectID") or hit.get("id")
                    title = hit.get("title") or hit.get("question", "")
                    content = hit.get("content") or hit.get("answer", "")
                    meta = hit.get("metadata", {})
                    score = float(hit.get("_rankingInfo", {}).get("userScore", 1.0 / rank))
                    results.append({
                        "id": doc_id,
                        "title": title,
                        "content": content,
                        "question": title,
                        "answer": content,
                        "category": hit.get("category", ""),
                        "score": score,
                        "source_type": "algolia",
                        "source_file": meta.get("source_file"),
                        "page_number": meta.get("page_number"),
                        "metadata": meta,
                    })
                return results
        except Exception as exc:
            logger.warning("Algolia search_sparse exception: %s", exc)
            return []

    async def list_documents(
        self,
        tenant_id: str,
        limit: int = 50,
        offset: int = 0,
        category: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        if not self.is_configured():
            return []

        try:
            filters = f"tenant_id:{tenant_id}"
            if category:
                filters += f" AND category:{category}"

            payload = {
                "query": "",
                "hitsPerPage": limit,
                "page": offset // limit if limit > 0 else 0,
                "filters": filters,
            }
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(
                    f"{self.base_url}/query",
                    headers=self._headers,
                    json=payload,
                )
                if resp.status_code != 200:
                    return []

                hits = resp.json().get("hits", [])
                results = []
                for hit in hits:
                    doc_id = hit.get("objectID") or hit.get("id")
                    title = hit.get("title") or hit.get("question", "")
                    content = hit.get("content") or hit.get("answer", "")
                    results.append({
                        "id": doc_id,
                        "tenant_id": hit.get("tenant_id", tenant_id),
                        "title": title,
                        "content": content,
                        "question": title,
                        "answer": content,
                        "category": hit.get("category", ""),
                        "metadata": hit.get("metadata", {}),
                    })
                return results
        except Exception as exc:
            logger.warning("Algolia list_documents exception: %s", exc)
            return []

    async def get_document(self, doc_id: str) -> Optional[Dict[str, Any]]:
        if not self.is_configured():
            return None

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(
                    f"{self.base_url}/{doc_id}",
                    headers=self._headers,
                )
                if resp.status_code == 200:
                    hit = resp.json()
                    title = hit.get("title") or hit.get("question", "")
                    content = hit.get("content") or hit.get("answer", "")
                    return {
                        "id": doc_id,
                        "tenant_id": hit.get("tenant_id", ""),
                        "title": title,
                        "content": content,
                        "question": title,
                        "answer": content,
                        "category": hit.get("category", ""),
                        "metadata": hit.get("metadata", {}),
                    }
                return None
        except Exception as exc:
            logger.warning("Algolia get_document failed for %s: %s", doc_id, exc)
            return None

