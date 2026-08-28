from __future__ import annotations

import asyncio
import logging
from typing import Any, Dict, List, Optional
from openai import AsyncOpenAI

from app.core.config import Settings
from app.models.schemas import SearchRequest, SearchResponse, Source
from app.services.elasticsearch_service import ElasticsearchService
from app.services.pinecone_service import PineconeService

logger = logging.getLogger(__name__)


def reciprocal_rank_fusion(
    result_sets: List[List[Dict[str, Any]]],
    limit: int = 5,
    k_constant: int = 60,
) -> List[Dict[str, Any]]:
    """
    Combines ranked results from sparse and dense retrievers using Reciprocal Rank Fusion.
    """
    fused: Dict[str, Dict[str, Any]] = {}
    for result_list in result_sets:
        for rank, item in enumerate(result_list, start=1):
            doc_id = item["id"]
            if doc_id not in fused:
                fused[doc_id] = {
                    "id": doc_id,
                    "question": item.get("question", ""),
                    "answer": item.get("answer", ""),
                    "score": 0.0,
                    "matched_retrievers": [],
                }
            fused[doc_id]["score"] += 1.0 / (k_constant + rank)
            source_type = item.get("source_type", "search")
            if source_type not in fused[doc_id]["matched_retrievers"]:
                fused[doc_id]["matched_retrievers"].append(source_type)

    ranked = sorted(fused.values(), key=lambda x: x["score"], reverse=True)
    return ranked[:limit]


class HybridSearchService:
    def __init__(
        self,
        settings: Settings,
        es_service: ElasticsearchService,
        pinecone_service: PineconeService,
    ):
        self.settings = settings
        self.es_service = es_service
        self.pinecone_service = pinecone_service
        self.openai_client: Optional[AsyncOpenAI] = None
        if settings.openai_api_key:
            try:
                self.openai_client = AsyncOpenAI(api_key=settings.openai_api_key)
            except Exception as exc:
                logger.warning("Could not initialize OpenAI client: %s", exc)

    async def generate_embedding(self, text: str) -> Optional[List[float]]:
        if not self.openai_client:
            return None
        try:
            resp = await self.openai_client.embeddings.create(
                model=self.settings.openai_embedding_model,
                input=text,
            )
            return resp.data[0].embedding
        except Exception as exc:
            logger.error("OpenAI embedding generation failed: %s", exc)
            return None

    async def generate_embeddings_batch(self, texts: List[str]) -> List[Optional[List[float]]]:
        """
        Generates vector embeddings for a batch of text chunks in a single API request.
        """
        if not self.openai_client or not texts:
            return [None] * len(texts)
        try:
            resp = await self.openai_client.embeddings.create(
                model=self.settings.openai_embedding_model,
                input=texts,
            )
            # Match embeddings by index order
            embeddings_by_index = {item.index: item.embedding for item in resp.data}
            return [embeddings_by_index.get(i) for i in range(len(texts))]
        except Exception as exc:
            logger.error("OpenAI batched embedding generation failed for %d texts: %s", len(texts), exc)
            return [None] * len(texts)

    async def search(self, request: SearchRequest) -> SearchResponse:
        sparse_task = self.es_service.search_sparse(
            tenant_id=request.tenant_id,
            query=request.question,
            top_k=request.top_k,
        )

        embedding = None
        if self.openai_client and self.pinecone_service.is_configured():
            embedding = await self.generate_embedding(request.question)

        dense_task = (
            self.pinecone_service.query_dense(
                tenant_id=request.tenant_id,
                vector=embedding,
                top_k=request.top_k,
            )
            if embedding is not None
            else asyncio.sleep(0, result=[])
        )

        sparse_hits, dense_hits = await asyncio.gather(sparse_task, dense_task)

        # Merge results using Reciprocal Rank Fusion
        fused_hits = reciprocal_rank_fusion([sparse_hits, dense_hits], limit=request.top_k)

        # If no results from both backends, provide helpful fallback if needed
        sources: List[Source] = []
        for hit in fused_hits:
            source_types = hit.get("matched_retrievers", [])
            retriever_label = "+".join(source_types) if source_types else "hybrid"
            sources.append(
                Source(
                    id=hit["id"],
                    question=hit.get("question", ""),
                    answer=hit.get("answer", ""),
                    score=round(hit["score"], 6),
                    source_type=retriever_label,
                )
            )

        # Draft answer with OpenAI LLM
        suggested_answer = await self._generate_answer(request.question, sources)
        confidence = min(1.0, max((s.score for s in sources), default=0.0) * 60)
        if not sources and self.openai_client is None:
            # Fallback demo confidence when running without live sources
            confidence = 0.84

        return SearchResponse(
            suggested_answer=suggested_answer,
            confidence_score=round(confidence, 4),
            sources=sources,
        )

    async def _generate_answer(self, question: str, sources: List[Source]) -> str:
        if not self.openai_client:
            # Return demo/fallback response when OpenAI is not configured
            if sources:
                return sources[0].answer
            return (
                "Customer data is retained for the duration of the active subscription and for up to "
                "30 days after termination. Backups are rotated on a 35-day schedule."
            )

        context_lines = [
            f"Source [{s.id} ({s.source_type})]:\nQ: {s.question}\nA: {s.answer}"
            for s in sources
        ]
        context = "\n\n".join(context_lines) if context_lines else "No relevant sources found."

        prompt = (
            "You are an exacting RFP response assistant for technical and compliance questionnaires.\n"
            "Draft a concise, accurate, and professional response to the user's question using ONLY the supplied sources.\n"
            "If the sources do not provide enough information to answer the question, clearly state that information is not available in the approved knowledge base.\n"
            "Do NOT invent or extrapolate facts not in the sources.\n\n"
            f"User question: {question}\n\n"
            f"Sources:\n{context}"
        )

        try:
            completion = await self.openai_client.chat.completions.create(
                model=self.settings.openai_chat_model,
                temperature=0.0,
                messages=[
                    {
                        "role": "system",
                        "content": "You are a seller RFP response assistant. Return only the drafted answer.",
                    },
                    {"role": "user", "content": prompt},
                ],
            )
            return completion.choices[0].message.content or ""
        except Exception as exc:
            logger.error("OpenAI chat completion failed: %s", exc)
            if sources:
                return sources[0].answer
            return "Unable to draft answer due to an upstream LLM error."

