from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.db_models import KBEntry, QuestionReview, ResponseWorkspace, RoadmapInitiativeModel
from app.models.schemas import (
    KBEntryBase,
    KBEntryCreate,
    KBEntryUpdate,
    QuestionReviewItem,
    WorkspaceCreate,
    RoadmapInitiativeCreate,
    RoadmapInitiativeUpdate,
)

DEFAULT_SEEDS = [
    {
        "id": "proposal-drafter-agent",
        "title": "Proposal Drafter Agent (Grounded Knowledge Engine)",
        "stage": "shipped",
        "theme": "Core AI & Retrieval",
        "priority": "P0 - Critical",
        "target_persona": "Proposal Drafter",
        "quarter": "Shipped",
        "summary": "Production Python FastAPI service on Google Cloud Run with Gemini 2.5 Flash and hybrid retrieval, acting as the foundational drafting agent.",
        "problem_statement": "Enterprise sales teams spend 30+ hours per RFP searching through outdated sales decks and disconnected wikis for accurate compliance answers, risking factual inaccuracies.",
        "user_story": "As a Proposal Drafter, I want an AI Proposal Drafter to generate baseline response drafts strictly grounded in verified company collateral with exact citations.",
        "success_metrics": ["99.4% factual grounding precision", "< 1.2s end-to-end retrieval latency", "Zero ungrounded hallucinations in production"],
        "acceptance_criteria": [
            "Given a question, the Proposal Drafter retrieves top-k passages with semantic and keyword scores.",
            "When confidence is high, citations and exact source document IDs are returned.",
            "Responses return structured JSON with confidence score and passage attribution."
        ],
        "technical_architecture": "FastAPI + Vertex AI gemini-2.5-flash + pgvector cosine similarity + Cloud Run container with auto-scaling.",
        "rice_reach": 100, "rice_impact": 4, "rice_confidence": 95, "rice_effort": 3, "rice_score": 126.7,
        "upvotes": 84, "tags": ["Proposal Drafter", "Vertex AI", "Gemini 2.5", "Cloud Run", "pgvector"]
    },
    {
        "id": "chrome-extension-mv3",
        "title": "Manifest V3 Assistant with Background Service Worker",
        "stage": "shipped",
        "theme": "Enterprise Governance",
        "priority": "P0 - Critical",
        "target_persona": "Proposal Drafter",
        "quarter": "Shipped",
        "summary": "In-page buyer form autofill and side panel assistant utilizing chrome.storage.local and 3-tier DOM matching.",
        "problem_statement": "Buyers mandate filling out custom web portals (Coupa, Google Forms, Typeform) with 50+ text fields, forcing sellers to manually copy and paste answers one-by-one.",
        "user_story": "As a Proposal Drafter, I want an extension that detects all form fields on external buyer portals and injects approved workspace answers in one click, so that manual data entry is eliminated.",
        "success_metrics": ["100% field match rate across 9-question mock procurement portal", "Zero LLM API calls required during handoff insertion", "< 500ms 1-click batch injection time"],
        "acceptance_criteria": [
            "Extension listens to Background Service Worker message passing.",
            "Matches fields via 3-tier heuristic (exact text -> fuzzy overlap -> positional index).",
            "Triggers React/Angular input/change events to ensure form validation passes."
        ],
        "technical_architecture": "Chrome Manifest V3 + Service Worker (background.js) + content script DOM injector + sandboxed storage.",
        "rice_reach": 90, "rice_impact": 4, "rice_confidence": 90, "rice_effort": 3, "rice_score": 108.0,
        "upvotes": 67, "tags": ["Chrome Extension", "MV3", "Autofill", "DOM Matching"]
    },
    {
        "id": "governance-approval-workflow",
        "title": "4-Role Enterprise Governance & SME Review Queue",
        "stage": "shipped",
        "theme": "Enterprise Governance",
        "priority": "P0 - Critical",
        "target_persona": "Security SME / Legal Counsel",
        "quarter": "Shipped",
        "summary": "Multi-stage routing workflow with Proposal Drafter, Security SME, Legal Reviewer, and Final Approver roles.",
        "problem_statement": "RFPs contain sensitive legal terms and technical commitments that cannot be submitted without sign-off from dedicated security and legal stakeholders.",
        "user_story": "As a Security Director, I want a structured review queue where draft answers are routed to me for audit and sign-off before submission, so that liability risks are mitigated.",
        "success_metrics": ["100% audit trail compliance for approved responses", "-50% turnaround time on SME review handoffs", "Zero unreviewed draft submissions"],
        "acceptance_criteria": [
            "Drafter can dispatch individual or all questionnaire items to specific SME roles.",
            "Reviewers can leave feedback notes, request changes, or approve.",
            "Celebratory completion state only unlocks when all items achieve full sign-off."
        ],
        "technical_architecture": "Role-aware state management with local persistence, multi-role badge classification, and interactive modal drawer.",
        "rice_reach": 85, "rice_impact": 3, "rice_confidence": 95, "rice_effort": 2, "rice_score": 121.1,
        "upvotes": 59, "tags": ["Governance", "SME Review", "Legal Sign-off", "Audit Trail"]
    },
    {
        "id": "kb-doc-ingestion",
        "title": "Document Ingestion Pipeline & Retrieval Playground",
        "stage": "beta",
        "theme": "Smart Ingestion",
        "priority": "P1 - High",
        "target_persona": "Proposal Manager",
        "quarter": "Q1 2026",
        "summary": "Multi-file document ingestion (PDF, Markdown, TXT, JSON) with live semantic chunking and test playground.",
        "problem_statement": "Maintaining an up-to-date RFP knowledge base requires constant document uploads and testing retrieval accuracy against real customer questions.",
        "user_story": "As a Knowledge Manager, I want to drag-and-drop our latest SOC 2 and security policies and immediately test question retrieval in a live playground.",
        "success_metrics": ["< 3s ingestion processing time for 50-page PDFs", "Immediate searchability in the interactive playground", "Document chunk provenance tracking"],
        "acceptance_criteria": [
            "Users can upload multiple files with progress feedback.",
            "Playground provides side-by-side prompt testing and retrieved source inspection.",
            "Ingested documents are queryable across all tenant sessions."
        ],
        "technical_architecture": "Client-side document parser + FastAPI ingestion endpoints + embedding generator + vector store indexing.",
        "rice_reach": 80, "rice_impact": 3, "rice_confidence": 85, "rice_effort": 3, "rice_score": 68.0,
        "upvotes": 43, "tags": ["Ingestion", "PDF Parser", "Playground", "Chunking"]
    },
    {
        "id": "excel-sig-lite-parser",
        "title": "Multi-Format Excel & SIG Lite / CAIQ Parser",
        "stage": "development",
        "theme": "Smart Ingestion",
        "priority": "P0 - Critical",
        "target_persona": "Proposal Manager",
        "quarter": "Q2 2026",
        "summary": "Native parser for complex .xlsx spreadsheets, multi-tab workbooks, and standard questionnaires (SIG Lite, CAIQ v4).",
        "problem_statement": "Over 70% of enterprise security questionnaires arrive as 300-row Excel files with complex merged headers, dropdown options, and multi-sheet layouts.",
        "user_story": "As a Proposal Manager, I want to upload a vendor Excel questionnaire and have RFPEngine automatically extract all questions and sheet structures into an editable workspace.",
        "success_metrics": ["98% accuracy on tabular question/column detection", "Support for multi-sheet workbooks up to 500 questions", "1-click export back to original .xlsx format with formulas intact"],
        "acceptance_criteria": [
            "Accepts .xlsx and .csv files with auto-detection of Question and Answer columns.",
            "Preserves original row IDs and category groupings.",
            "Exports filled Excel file matching the buyer's exact column format."
        ],
        "technical_architecture": "WebAssembly-powered SheetJS parser + Python openpyxl backend validation service + schema mapper.",
        "rice_reach": 95, "rice_impact": 4, "rice_confidence": 85, "rice_effort": 4, "rice_score": 80.8,
        "upvotes": 91, "tags": ["Excel Parser", "SIG Lite", "CAIQ", "Spreadsheets"]
    },
    {
        "id": "feat-feedback-l1",
        "title": "Curated Golden Q&A Promotion & 1-Click KB Sync (Level 1 Feedback Loop)",
        "stage": "shipped",
        "theme": "Core AI & Retrieval",
        "priority": "P0 - Critical",
        "target_persona": "Security SME / Legal Counsel",
        "quarter": "Shipped",
        "summary": "1-click promotion of verified, SME-approved answers directly into the canonical knowledge base with cryptographic provenance.",
        "problem_statement": "SMEs spend 15+ hours each month repeatedly correcting the same standard compliance answers across different customer RFPs because edits stay trapped in individual workspaces.",
        "user_story": "As a Security SME or Legal Counsel, I want to promote my approved answer to the canonical knowledge base with one click, so that future AI drafts automatically reuse my vetted phrasing.",
        "success_metrics": ["0 manual copy-pasting required from completed proposals to knowledge base", "100% provenance tracking (who approved, when, for which client RFP)", "< 1.5s dual-index sync time into Elasticsearch and Pinecone"],
        "acceptance_criteria": [
            "Given a question with review_status == 'Approved' by Security SME, Legal Counsel, or Approver.",
            "When the user clicks [⭐ Promote to Knowledge Base] in the review drawer or question card.",
            "Then a new KBEntry is created with category 'Golden Q&A' and metadata linking back to the origin workspace.",
            "And an audit badge '⭐ Promoted to Knowledge Base' appears on the question card."
        ],
        "technical_architecture": "FastAPI endpoint + PostgreSQL KBEntry with origin_workspace_id + Dual-sync to Pinecone namespace and Elasticsearch.",
        "rice_reach": 90, "rice_impact": 4, "rice_confidence": 95, "rice_effort": 2, "rice_score": 171.0,
        "upvotes": 92, "tags": ["Feedback Loop", "Golden Q&A", "Knowledge Sync", "RICE P0"]
    },
    {
        "id": "feat-feedback-l2",
        "title": "Edit-Distance Telemetry & Stale Document Drift Detector (Level 2 Feedback Loop)",
        "stage": "discovery",
        "theme": "Enterprise Governance",
        "priority": "P1 - High",
        "target_persona": "Knowledge Manager / RevOps",
        "quarter": "Q4 2026",
        "summary": "Background telemetry pipeline calculating Levenshtein edit distance and semantic drift, flagging outdated policies.",
        "problem_statement": "Company policies and SLAs evolve, but knowledge managers have zero visibility into which uploaded PDFs contain obsolete clauses until an SME flags a discrepancy.",
        "user_story": "As a Knowledge Manager, I want telemetry tracking which source documents are frequently overwritten by SMEs, so that I can proactively update outdated company collateral.",
        "success_metrics": ["Automated weekly 'Knowledge Drift & Staleness' health report", "-40% average edit distance across repeat questionnaires over 90 days", "Early detection of deprecated policies before buyer submission"],
        "acceptance_criteria": [
            "Given a completed RFP response set with human edits.",
            "When responses are finalized, the system computes the edit distance (levenshtein_ratio).",
            "Then it logs passage attribution quality metrics in PostgreSQL.",
            "And if a source passage has >50% rewrite frequency across 5+ RFPs, it triggers a Stale Policy Alert in the Knowledge Hub."
        ],
        "technical_architecture": "PostgreSQL response_feedback_telemetry table + background calculation worker + Knowledge Hub staleness heatmap.",
        "rice_reach": 75, "rice_impact": 3, "rice_confidence": 80, "rice_effort": 3, "rice_score": 60.0,
        "upvotes": 68, "tags": ["Feedback Loop", "Drift Analytics", "Stale Doc Alert", "RevOps"]
    },
    {
        "id": "feat-feedback-l3",
        "title": "Dynamic Few-Shot In-Context Learning from Exemplars (Level 3 Feedback Loop)",
        "stage": "discovery",
        "theme": "Core AI & Retrieval",
        "priority": "P1 - High",
        "target_persona": "Proposal Drafter",
        "quarter": "H1 2027",
        "summary": "RAG prompt conditioning that retrieves top-2 historical winning responses to teach Gemini 2.5 Flash exact company pitch tone.",
        "problem_statement": "Standard RAG provides factual policy text, but LLMs often produce generic or verbose prose that doesn't match the company's executive pitch style.",
        "user_story": "As a Proposal Drafter, I want the AI to synthesize drafts that mimic the exact formatting and tone of our team's highest-rated past winning bids.",
        "success_metrics": ["+35% baseline acceptance rate without human rephrasing", "Consistent company tone and markdown formatting across all questionnaires", "Zero fine-tuning infrastructure overhead"],
        "acceptance_criteria": [
            "Given a new RFP question query.",
            "When search_knowledge_base executes.",
            "Then it retrieves both raw document chunks AND top-2 approved Golden Q&A historical pairs.",
            "And injects the approved pairs as dynamic few-shot exemplars inside the Gemini 2.5 Flash prompt context."
        ],
        "technical_architecture": "Dual-retriever HybridSearch pipeline + dynamic exemplar few-shot prompt injection in Gemini 2.5 Flash.",
        "rice_reach": 80, "rice_impact": 3, "rice_confidence": 70, "rice_effort": 4, "rice_score": 42.0,
        "upvotes": 81, "tags": ["Feedback Loop", "In-Context Learning", "Few-Shot RAG", "Gemini 2.5"]
    }
]


class PostgresService:
    @staticmethod
    async def seed_roadmap_if_empty(session: AsyncSession, tenant_id: str = "default") -> None:
        count_res = await session.execute(
            select(RoadmapInitiativeModel).where(RoadmapInitiativeModel.tenant_id == tenant_id).limit(1)
        )
        if count_res.scalars().first() is None:
            for s in DEFAULT_SEEDS:
                init_obj = RoadmapInitiativeModel(
                    id=s["id"],
                    tenant_id=tenant_id,
                    title=s["title"],
                    stage=s["stage"],
                    theme=s["theme"],
                    priority=s["priority"],
                    target_persona=s["target_persona"],
                    quarter=s["quarter"],
                    summary=s["summary"],
                    problem_statement=s["problem_statement"],
                    user_story=s["user_story"],
                    success_metrics=s["success_metrics"],
                    acceptance_criteria=s["acceptance_criteria"],
                    technical_architecture=s["technical_architecture"],
                    rice_reach=s["rice_reach"],
                    rice_impact=s["rice_impact"],
                    rice_confidence=s["rice_confidence"],
                    rice_effort=s["rice_effort"],
                    rice_score=s["rice_score"],
                    upvotes=s["upvotes"],
                    tags=s["tags"],
                )
                session.add(init_obj)
            await session.commit()

    @staticmethod
    async def list_roadmap_initiatives(
        session: AsyncSession,
        tenant_id: str = "default",
        stage: Optional[str] = None,
        theme: Optional[str] = None,
    ) -> List[RoadmapInitiativeModel]:
        await PostgresService.seed_roadmap_if_empty(session, tenant_id)
        stmt = select(RoadmapInitiativeModel).where(RoadmapInitiativeModel.tenant_id == tenant_id)
        if stage:
            stmt = stmt.where(RoadmapInitiativeModel.stage == stage)
        if theme:
            stmt = stmt.where(RoadmapInitiativeModel.theme == theme)
        stmt = stmt.order_by(RoadmapInitiativeModel.created_at.desc())
        res = await session.execute(stmt)
        return list(res.scalars().all())

    @staticmethod
    async def get_roadmap_initiative(session: AsyncSession, initiative_id: str) -> Optional[RoadmapInitiativeModel]:
        res = await session.execute(
            select(RoadmapInitiativeModel).where(RoadmapInitiativeModel.id == initiative_id)
        )
        return res.scalars().first()

    @staticmethod
    async def create_roadmap_initiative(
        session: AsyncSession,
        item: RoadmapInitiativeCreate,
    ) -> RoadmapInitiativeModel:
        item_id = item.id or f"custom-{uuid.uuid4().hex[:8]}"
        init_obj = RoadmapInitiativeModel(
            id=item_id,
            tenant_id=item.tenant_id,
            title=item.title,
            stage=item.stage,
            theme=item.theme,
            priority=item.priority,
            target_persona=item.target_persona,
            quarter=item.quarter,
            summary=item.summary,
            problem_statement=item.problem_statement,
            user_story=item.user_story,
            success_metrics=item.success_metrics,
            acceptance_criteria=item.acceptance_criteria,
            technical_architecture=item.technical_architecture or "To be determined during technical refinement spike with engineering leads.",
            rice_reach=item.rice.reach,
            rice_impact=item.rice.impact,
            rice_confidence=item.rice.confidence,
            rice_effort=item.rice.effort,
            rice_score=item.rice.score,
            upvotes=item.upvotes,
            tags=item.tags,
        )
        session.add(init_obj)
        await session.commit()
        await session.refresh(init_obj)
        return init_obj

    @staticmethod
    async def update_roadmap_initiative(
        session: AsyncSession,
        initiative_id: str,
        updates: RoadmapInitiativeUpdate,
    ) -> Optional[RoadmapInitiativeModel]:
        init_obj = await PostgresService.get_roadmap_initiative(session, initiative_id)
        if not init_obj:
            return None

        data = updates.model_dump(exclude_unset=True)
        if "rice" in data and data["rice"]:
            rice_data = data.pop("rice")
            init_obj.rice_reach = rice_data.get("reach", init_obj.rice_reach)
            init_obj.rice_impact = rice_data.get("impact", init_obj.rice_impact)
            init_obj.rice_confidence = rice_data.get("confidence", init_obj.rice_confidence)
            init_obj.rice_effort = rice_data.get("effort", init_obj.rice_effort)
            init_obj.rice_score = rice_data.get("score", init_obj.rice_score)

        for field, val in data.items():
            if hasattr(init_obj, field) and val is not None:
                setattr(init_obj, field, val)

        await session.commit()
        await session.refresh(init_obj)
        return init_obj

    @staticmethod
    async def upvote_roadmap_initiative(
        session: AsyncSession,
        initiative_id: str,
        delta: int = 1,
    ) -> Optional[RoadmapInitiativeModel]:
        init_obj = await PostgresService.get_roadmap_initiative(session, initiative_id)
        if not init_obj:
            return None
        init_obj.upvotes = max(0, init_obj.upvotes + delta)
        await session.commit()
        await session.refresh(init_obj)
        return init_obj

    @staticmethod
    async def reset_roadmap_initiatives(session: AsyncSession, tenant_id: str = "default") -> None:
        await session.execute(
            delete(RoadmapInitiativeModel).where(RoadmapInitiativeModel.tenant_id == tenant_id)
        )
        await session.commit()
        await PostgresService.seed_roadmap_if_empty(session, tenant_id)

    @staticmethod
    async def create_kb_entry(session: AsyncSession, entry: KBEntryCreate) -> KBEntry:
        doc_id = entry.id or f"kb-{uuid.uuid4().hex[:8]}"
        db_entry = KBEntry(
            id=doc_id,
            tenant_id=entry.tenant_id,
            question=entry.question,
            answer=entry.answer,
            category=entry.category,
            metadata_json=entry.metadata,
        )
        session.add(db_entry)
        await session.commit()
        await session.refresh(db_entry)
        return db_entry

    @staticmethod
    async def get_kb_entry(session: AsyncSession, entry_id: str) -> Optional[KBEntry]:
        result = await session.execute(select(KBEntry).where(KBEntry.id == entry_id))
        return result.scalars().first()

    @staticmethod
    async def get_kb_entries_by_ids(session: AsyncSession, entry_ids: List[str]) -> List[KBEntry]:
        if not entry_ids:
            return []
        result = await session.execute(select(KBEntry).where(KBEntry.id.in_(entry_ids)))
        return list(result.scalars().all())

    @staticmethod
    async def list_kb_entries(
        session: AsyncSession,
        tenant_id: str,
        limit: int = 100,
        offset: int = 0,
    ) -> List[KBEntry]:
        stmt = (
            select(KBEntry)
            .where(KBEntry.tenant_id == tenant_id)
            .order_by(KBEntry.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        result = await session.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def update_kb_entry(
        session: AsyncSession,
        entry_id: str,
        update_data: KBEntryUpdate,
    ) -> Optional[KBEntry]:
        entry = await PostgresService.get_kb_entry(session, entry_id)
        if not entry:
            return None
        if update_data.question is not None:
            entry.question = update_data.question
        if update_data.answer is not None:
            entry.answer = update_data.answer
        if update_data.category is not None:
            entry.category = update_data.category
        if update_data.metadata is not None:
            entry.metadata_json = update_data.metadata
        await session.commit()
        await session.refresh(entry)
        return entry

    @staticmethod
    async def delete_kb_entry(session: AsyncSession, entry_id: str) -> bool:
        entry = await PostgresService.get_kb_entry(session, entry_id)
        if not entry:
            return False
        await session.delete(entry)
        await session.commit()
        return True

    @staticmethod
    async def create_batch_kb_entries(
        session: AsyncSession,
        tenant_id: str,
        entries: List[KBEntryBase],
    ) -> List[KBEntry]:
        created: List[KBEntry] = []
        for item in entries:
            doc_id = f"kb-{uuid.uuid4().hex[:8]}"
            db_entry = KBEntry(
                id=doc_id,
                tenant_id=tenant_id,
                question=item.question,
                answer=item.answer,
                category=item.category,
                metadata_json=item.metadata,
            )
            session.add(db_entry)
            created.append(db_entry)
        await session.commit()
        for e in created:
            await session.refresh(e)
        return created

    # --- Workspaces and Reviews ---

    @staticmethod
    async def save_workspace(
        session: AsyncSession,
        workspace_data: WorkspaceCreate,
    ) -> ResponseWorkspace:
        result = await session.execute(
            select(ResponseWorkspace)
            .where(ResponseWorkspace.id == workspace_data.id)
            .options(selectinload(ResponseWorkspace.reviews))
        )
        workspace = result.scalars().first()

        if not workspace:
            workspace = ResponseWorkspace(
                id=workspace_data.id,
                tenant_id=workspace_data.tenant_id,
                title=workspace_data.title,
                source_mode=workspace_data.source_mode,
                source_url=workspace_data.source_url,
            )
            session.add(workspace)
            await session.flush()
        else:
            workspace.title = workspace_data.title
            workspace.source_mode = workspace_data.source_mode
            workspace.source_url = workspace_data.source_url
            # Remove previous reviews if replacing
            await session.execute(
                delete(QuestionReview).where(QuestionReview.workspace_id == workspace.id)
            )

        for q in workspace_data.questions:
            review = QuestionReview(
                workspace_id=workspace.id,
                question_index=q.question_index,
                question_text=q.question_text,
                suggested_answer=q.suggested_answer,
                final_answer=q.final_answer,
                review_status=q.review_status,
                assigned_role=q.assigned_role,
                confidence_score=q.confidence_score,
                sources_json=q.sources,
            )
            session.add(review)

        await session.commit()
        refreshed = await PostgresService.get_workspace(session, workspace.id)
        return refreshed or workspace

    @staticmethod
    async def get_workspace(
        session: AsyncSession,
        workspace_id: str,
    ) -> Optional[ResponseWorkspace]:
        result = await session.execute(
            select(ResponseWorkspace)
            .where(ResponseWorkspace.id == workspace_id)
            .options(selectinload(ResponseWorkspace.reviews))
        )
        return result.scalars().first()

    @staticmethod
    async def update_question_review(
        session: AsyncSession,
        workspace_id: str,
        question_index: int,
        final_answer: Optional[str] = None,
        review_status: Optional[str] = None,
        assigned_role: Optional[str] = None,
    ) -> Optional[QuestionReview]:
        result = await session.execute(
            select(QuestionReview).where(
                QuestionReview.workspace_id == workspace_id,
                QuestionReview.question_index == question_index,
            )
        )
        review = result.scalars().first()
        if not review:
            return None

        if final_answer is not None:
            review.final_answer = final_answer
        if review_status is not None:
            review.review_status = review_status
        if assigned_role is not None:
            review.assigned_role = assigned_role

        await session.commit()
        await session.refresh(review)
        return review

    @staticmethod
    async def promote_question_to_kb(
        session: AsyncSession,
        workspace_id: str,
        question_index: int,
        category: str = "Golden Q&A",
    ) -> Tuple[KBEntry, QuestionReview]:
        workspace_res = await session.execute(
            select(ResponseWorkspace).where(ResponseWorkspace.id == workspace_id)
        )
        workspace = workspace_res.scalars().first()
        if not workspace:
            raise ValueError(f"Workspace '{workspace_id}' not found.")

        review_res = await session.execute(
            select(QuestionReview).where(
                QuestionReview.workspace_id == workspace_id,
                QuestionReview.question_index == question_index,
            )
        )
        review = review_res.scalars().first()
        if not review:
            raise ValueError(f"Question index {question_index} not found in workspace '{workspace_id}'.")

        answer_text = review.final_answer or review.suggested_answer or ""
        if not answer_text.strip():
            raise ValueError("Cannot promote an empty answer to the Knowledge Base.")

        kb_id = review.promoted_kb_id or f"kb-gold-{uuid.uuid4().hex[:8]}"

        existing_kb = await session.execute(select(KBEntry).where(KBEntry.id == kb_id))
        kb_entry = existing_kb.scalars().first()

        metadata_dict = {
            "origin_workspace_id": workspace.id,
            "origin_question_index": question_index,
            "approved_by_role": review.assigned_role or "Proposal Drafter",
            "is_golden_qa": True,
            "promoted_at": datetime.now(timezone.utc).isoformat(),
        }

        if kb_entry:
            kb_entry.question = review.question_text
            kb_entry.answer = answer_text
            kb_entry.category = category
            kb_entry.metadata_json = metadata_dict
        else:
            kb_entry = KBEntry(
                id=kb_id,
                tenant_id=workspace.tenant_id,
                question=review.question_text,
                answer=answer_text,
                category=category,
                metadata_json=metadata_dict,
            )
            session.add(kb_entry)

        review.is_promoted_to_kb = True
        review.promoted_kb_id = kb_id
        if review.review_status != "Approved":
            review.review_status = "Approved"

        await session.commit()
        await session.refresh(kb_entry)
        await session.refresh(review)
        return kb_entry, review

