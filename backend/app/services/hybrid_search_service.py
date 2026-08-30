from __future__ import annotations

import asyncio
import logging
import os
from pathlib import Path
from typing import Any, Dict, List, Optional
from google import genai
from google.oauth2 import service_account

from app.core.config import Settings
from app.models.schemas import SearchRequest, SearchResponse, Source
from app.services.elasticsearch_service import ElasticsearchService
from app.services.pinecone_service import PineconeService

logger = logging.getLogger(__name__)


def reciprocal_rank_fusion(
    result_sets: List[List[Dict[str, Any]]],
    limit: int = 5,
    k_constant: int = 60,
    golden_qa_boost: float = 1.75,
) -> List[Dict[str, Any]]:
    """
    Combines ranked results from sparse (Elasticsearch BM25) and dense (Pinecone vector) retrievers using Reciprocal Rank Fusion.
    Applies an Authority Multiplier (golden_qa_boost) to SME-approved Golden Q&A passages per ADR 0019.
    """
    fused: Dict[str, Dict[str, Any]] = {}
    for result_list in result_sets:
        for rank, item in enumerate(result_list, start=1):
            doc_id = item["id"]
            if doc_id not in fused:
                title = item.get("title") or item.get("question", "")
                content = item.get("content") or item.get("answer", "")
                category = item.get("category", "")
                metadata = item.get("metadata", {}) or {}
                is_golden_qa = (
                    category == "Golden Q&A"
                    or metadata.get("is_golden_qa") is True
                    or doc_id.startswith("kb-gold-")
                )
                fused[doc_id] = {
                    "id": doc_id,
                    "title": title,
                    "content": content,
                    "question": title,
                    "answer": content,
                    "category": category,
                    "is_golden_qa": is_golden_qa,
                    "source_file": item.get("source_file"),
                    "page_number": item.get("page_number"),
                    "metadata": metadata,
                    "score": 0.0,
                    "matched_retrievers": [],
                }

            # Base RRF score with Authority Multiplier for SME-approved Golden Q&A
            rank_score = 1.0 / (k_constant + rank)
            if fused[doc_id].get("is_golden_qa"):
                rank_score *= golden_qa_boost

            fused[doc_id]["score"] += rank_score
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
        self.genai_client: Optional[genai.Client] = None

        # Initialize Google Cloud Vertex AI Client
        if settings.gcp_project_id:
            try:
                creds_path = settings.google_application_credentials
                credentials = None
                if creds_path:
                    path_obj = Path(creds_path)
                    if not path_obj.is_absolute():
                        if not path_obj.exists() and (Path.cwd() / creds_path).exists():
                            path_obj = Path.cwd() / creds_path
                        elif not path_obj.exists() and (Path.cwd().parent / creds_path).exists():
                            path_obj = Path.cwd().parent / creds_path
                    if path_obj.exists():
                        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = str(path_obj.resolve())
                        credentials = service_account.Credentials.from_service_account_file(
                            str(path_obj.resolve()),
                            scopes=["https://www.googleapis.com/auth/cloud-platform"],
                        )

                self.genai_client = genai.Client(
                    vertexai=True,
                    project=settings.gcp_project_id,
                    location="us-central1",
                    credentials=credentials,
                )
                logger.info(
                    "Initialized Google Cloud Vertex AI Client (project: %s, gemini: %s, embeddings: %s)",
                    settings.gcp_project_id,
                    settings.gemini_model,
                    settings.vertex_embedding_model,
                )
            except Exception as exc:
                logger.warning("Could not initialize Google Vertex AI client: %s", exc)

    async def generate_embedding(self, text: str) -> Optional[List[float]]:
        """
        Generates a 768-dimensional vector embedding using Google Cloud Vertex AI text-embedding-004.
        """
        if self.genai_client:
            try:
                resp = await asyncio.to_thread(
                    self.genai_client.models.embed_content,
                    model=self.settings.vertex_embedding_model,
                    contents=text,
                )
                if resp.embeddings and len(resp.embeddings) > 0:
                    return resp.embeddings[0].values
            except Exception as exc:
                logger.error("Vertex AI embedding generation failed: %s", exc)
        return None

    async def generate_embeddings_batch(self, texts: List[str]) -> List[Optional[List[float]]]:
        """
        Generates 768-dimensional vector embeddings for a batch of text passages using Vertex AI.
        """
        if not texts:
            return []

        if self.genai_client:
            try:
                resp = await asyncio.to_thread(
                    self.genai_client.models.embed_content,
                    model=self.settings.vertex_embedding_model,
                    contents=texts,
                )
                if resp.embeddings:
                    return [emb.values for emb in resp.embeddings]
            except Exception as exc:
                logger.error("Vertex AI batched embedding failed for %d texts: %s", len(texts), exc)

        return [None for _ in texts]

    async def search(self, request: SearchRequest) -> SearchResponse:
        sparse_task = self.es_service.search_sparse(
            tenant_id=request.tenant_id,
            query=request.question,
            top_k=request.top_k,
        )

        embedding = None
        if self.pinecone_service and self.pinecone_service.is_configured():
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

        sources: List[Source] = []
        for hit in fused_hits:
            source_types = hit.get("matched_retrievers", [])
            retriever_label = "+".join(source_types) if source_types else "hybrid"
            title = hit.get("title") or hit.get("question", "")
            content = hit.get("content") or hit.get("answer", "")
            category = hit.get("category") or ""
            is_golden = bool(hit.get("is_golden_qa"))
            sources.append(
                Source(
                    id=hit["id"],
                    title=title,
                    content=content,
                    category=category,
                    is_golden_qa=is_golden,
                    question=title,
                    answer=content,
                    score=round(hit["score"], 6),
                    source_type=retriever_label,
                    source_file=hit.get("source_file"),
                    page_number=hit.get("page_number"),
                    metadata=hit.get("metadata"),
                )
            )

        # Synthesize grounded answer with Gemini 2.5 Flash
        suggested_answer = await self._generate_answer(request.question, sources)
        confidence = min(1.0, max((s.score for s in sources), default=0.0) * 60)

        return SearchResponse(
            suggested_answer=suggested_answer,
            confidence_score=round(confidence, 4),
            sources=sources,
        )

    async def _generate_answer(self, question: str, sources: List[Source]) -> str:
        context_blocks = []
        for s in sources:
            source_info = s.source_file or (s.metadata.get("source_file") if s.metadata else "Knowledge Base")
            page_info = f", Page {s.page_number}" if s.page_number else ""
            topic_info = f"Topic: {s.title}" if s.title else ""
            is_golden = (
                s.is_golden_qa
                or s.category == "Golden Q&A"
                or (s.metadata and s.metadata.get("is_golden_qa") is True)
                or s.id.startswith("kb-gold-")
            )
            authority_badge = " [⭐ SME-APPROVED GOLDEN Q&A - HIGHEST CANONICAL AUTHORITY]" if is_golden else ""
            header = f"--- Source Document Passage [{s.id}]{authority_badge} ({source_info}{page_info} | {topic_info}) ---"
            context_blocks.append(f"{header}\n{s.content}")

        context = "\n\n".join(context_blocks) if context_blocks else "No relevant documentation passages found in the knowledge base."

        prompt = (
            "You are an enterprise AI Proposal Drafter specializing in technical, security, and compliance RFP questionnaires.\n\n"
            "Your task is to synthesize a direct, authoritative, and audit-ready answer to the buyer's questionnaire requirement "
            "based SOLELY on the approved documentation passages provided below.\n\n"
            "Precedence & Grounding Hierarchy (ADR 0019 Closed-Loop AI Feedback):\n"
            "1. Golden Q&A Precedence: If any provided passage is tagged '[⭐ SME-APPROVED GOLDEN Q&A - HIGHEST CANONICAL AUTHORITY]', "
            "it represents a recent verified human sign-off by a Security SME or Legal Counsel. "
            "STRICTLY prioritize the Golden Q&A as the latest authoritative ground truth, using its exact terms to override any contradictory statements in older raw PDF/policy documents.\n"
            "2. Direct & Professional Tone: Address the requirement directly and clearly (e.g. state 'Yes' or confirm capabilities when supported by documentation).\n"
            "3. Exact Specifics: Extract and incorporate specific standards, protocols, SLAs, ciphers, and technical metrics mentioned in the passages.\n"
            "4. Anti-Hallucination: If the documentation passages do not provide sufficient information to answer the question, state clearly that the information is not specified in current approved documentation.\n"
            "5. Strict Boundary: Do NOT extrapolate, assume unmentioned features, or invent capabilities beyond the provided text passages.\n\n"
            f"Questionnaire Requirement / Buyer Question:\n{question}\n\n"
            f"Approved Documentation Passages (Ordered by Relevance & SME Authority):\n{context}\n\n"
            "Synthesized RFP Answer:"
        )

        if self.genai_client:
            try:
                response = await asyncio.to_thread(
                    self.genai_client.models.generate_content,
                    model=self.settings.gemini_model,
                    contents=prompt,
                )
                if response.text:
                    return response.text.strip()
            except Exception as exc:
                logger.error("Vertex AI Gemini answer generation failed: %s", exc)

        if sources:
            return sources[0].content or sources[0].answer
        return "Information regarding this questionnaire requirement is not available in approved documentation."
