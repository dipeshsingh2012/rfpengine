from __future__ import annotations

import asyncio
import logging
import os
from pathlib import Path
from typing import Any, Dict, List, Optional
from google import genai
from google.oauth2 import service_account

from app.core.config import Settings
from app.models.schemas import ExemplarItem, SearchRequest, SearchResponse, Source
from app.services.algolia_service import AlgoliaService
from app.services.pinecone_service import PineconeService

logger = logging.getLogger(__name__)


def reciprocal_rank_fusion(
    result_sets: List[List[Dict[str, Any]]],
    limit: int = 5,
    k_constant: int = 60,
    golden_qa_boost: float = 1.75,
) -> List[Dict[str, Any]]:
    """
    Combines ranked results from sparse (Algolia) and dense (Pinecone vector) retrievers using Reciprocal Rank Fusion.
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
        algolia_service: AlgoliaService,
        pinecone_service: PineconeService,
    ):
        self.settings = settings
        self.algolia_service = algolia_service
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

    async def search(
        self,
        request: SearchRequest,
        model_override: Optional[str] = None,
        company_name: str = "Acme Corp",
        tone: Optional[str] = None,
    ) -> SearchResponse:
        sparse_task = (
            self.algolia_service.search_sparse(
                tenant_id=request.tenant_id,
                query=request.question,
                top_k=request.top_k,
            )
            if self.algolia_service and self.algolia_service.is_configured()
            else asyncio.sleep(0, result=[])
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

        # Extract Golden Q&A exemplars from the fused results
        exemplars: List[ExemplarItem] = []
        for hit in fused_hits:
            is_golden = bool(
                hit.get("is_golden_qa")
                or hit.get("category") == "Golden Q&A"
                or (hit.get("metadata") and hit["metadata"].get("is_golden_qa") is True)
                or str(hit.get("id", "")).startswith("kb-gold-")
            )
            if is_golden:
                q_text = hit.get("title") or hit.get("question") or ""
                a_text = hit.get("content") or hit.get("answer") or ""
                if q_text and a_text:
                    exemplars.append(
                        ExemplarItem(
                            id=hit["id"],
                            question=q_text,
                            approved_answer=a_text,
                            category=hit.get("category") or "Golden Q&A",
                            relevance_score=round(hit.get("score", 0.0), 4),
                            source_file=hit.get("source_file"),
                        )
                    )

        # Synthesize grounded answer with Gemini or Tuned Model Endpoint
        applied_tone = tone or "Authoritative, Direct, and Concise"
        suggested_answer = await self._generate_answer(
            request.question,
            sources,
            exemplars=exemplars[:2],
            tone=applied_tone,
            company_name=company_name,
            model_override=model_override,
        )
        confidence = min(1.0, max((s.score for s in sources), default=0.0) * 60)

        return SearchResponse(
            suggested_answer=suggested_answer,
            confidence_score=round(confidence, 4),
            sources=sources,
            exemplars_used=exemplars[:2],
            tone_applied=applied_tone,
        )

    @classmethod
    def build_few_shot_prompt(
        cls,
        question: str,
        sources: List[Source],
        exemplars: Optional[List[ExemplarItem]] = None,
        tone: str = "Authoritative, Direct, and Concise",
        company_name: str = "Acme Corp",
    ) -> str:
        exemplars = exemplars or []

        # 1. Dynamic Few-Shot Demonstrations (Brand Voice & Formatting)
        demonstration_blocks = []
        for idx, ex in enumerate(exemplars[:2], start=1):
            category_tag = f" [{ex.category}]" if ex.category else ""
            demonstration_blocks.append(
                f"[Approved Reference Exemplar #{idx}{category_tag}]\n"
                f"Question / Requirement: {ex.question}\n"
                f"Approved Executive Response: {ex.approved_answer}"
            )

        exemplar_section = ""
        if demonstration_blocks:
            exemplar_section = (
                "=== APPROVED FEW-SHOT WINNING DEMONSTRATIONS (EXECUTIVE BRAND VOICE) ===\n"
                "The following reference pairs have been formally vetted and approved by company SMEs.\n"
                "Carefully study and mirror their direct tone, sentence cadence, assertive phrasing, and standard-citation style:\n\n"
                + "\n\n".join(demonstration_blocks)
            )

        # 2. Grounded Evidence Passages (Factual source material)
        context_blocks = []
        for s in sources:
            source_info = s.source_file or (s.metadata.get("source_file") if s.metadata else "Knowledge Base")
            page_info = f", Page {s.page_number}" if s.page_number else ""
            topic_info = f"Topic: {s.title}" if s.title else ""
            is_golden = (
                s.is_golden_qa
                or s.category == "Golden Q&A"
                or (s.metadata and s.metadata.get("is_golden_qa") is True)
                or str(s.id).startswith("kb-gold-")
            )
            authority_badge = " [⭐ SME-APPROVED GOLDEN Q&A - HIGHEST CANONICAL AUTHORITY]" if is_golden else ""
            header = f"--- Evidence Passage [{s.id}]{authority_badge} ({source_info}{page_info} | {topic_info}) ---"
            context_blocks.append(f"{header}\n{s.content}")

        context = "\n\n".join(context_blocks) if context_blocks else "No relevant documentation passages found in the knowledge base."

        # 3. Assemble Prompt
        prompt_parts = [
            f"You are the enterprise AI Proposal Drafter for {company_name}, specializing in technical, security, and compliance RFP questionnaires.\n",
            f"=== TARGET BRAND VOICE & EXECUTIVE PERSONA ===\n- Tone: {tone}\n- Style Directive: Emulate the exact phrasing structure, concise executive confidence, and compliance citation format demonstrated in the approved winning exemplars below.",
        ]

        if exemplar_section:
            prompt_parts.extend(["", exemplar_section])

        prompt_parts.extend([
            "",
            "=== APPROVED FACTUAL EVIDENCE (SOURCE PASSAGES) ===",
            "Extract facts, protocols, ciphers, SLAs, and technical parameters SOLELY from these approved passages:",
            context,
            "",
            "=== PRECEDENCE & GOVERNANCE RULES ===",
            "1. Golden Q&A Precedence: If any passage is tagged '[⭐ SME-APPROVED GOLDEN Q&A - HIGHEST CANONICAL AUTHORITY]', it represents a recent verified human sign-off. STRICTLY prioritize it as the latest ground truth.",
            "2. Direct & Conclusive: Open directly with compliance confirmation (e.g. 'Yes', 'Compliant', or explicit statement of capability) when supported by evidence.",
            "3. Specific Technical Ciphers: Cite exact standards (AES-256, TLS 1.3, SOC 2 Type II, ISO 27001) and metrics (RPO/RTO) found in the text.",
            "4. Anti-Hallucination: If the documentation does not provide sufficient detail, state clearly that the information is not specified in current approved documentation. Do not invent commitments.",
            "",
            f"Questionnaire Requirement / Buyer Question:\n{question}\n",
            "Synthesized Executive RFP Response:",
        ])

        return "\n".join(prompt_parts)

    async def _generate_answer(
        self,
        question: str,
        sources: List[Source],
        exemplars: Optional[List[ExemplarItem]] = None,
        tone: str = "Authoritative, Direct, and Concise",
        company_name: str = "Acme Corp",
        model_override: Optional[str] = None,
    ) -> str:
        prompt = self.build_few_shot_prompt(
            question=question,
            sources=sources,
            exemplars=exemplars,
            tone=tone,
            company_name=company_name,
        )

        model_to_use = model_override or self.settings.gemini_model

        if self.genai_client:
            try:
                response = await asyncio.to_thread(
                    self.genai_client.models.generate_content,
                    model=model_to_use,
                    contents=prompt,
                )
                if response.text:
                    return response.text.strip()
            except Exception as exc:
                logger.error("Vertex AI answer generation failed for model %s: %s", model_to_use, exc)

        if exemplars:
            for ex in exemplars:
                if ex.question.lower() in question.lower() or question.lower() in ex.question.lower():
                    return ex.approved_answer

        if sources:
            return sources[0].content or sources[0].answer
        return "Information regarding this questionnaire requirement is not available in approved documentation."

