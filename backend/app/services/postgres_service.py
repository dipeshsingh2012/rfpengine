from __future__ import annotations

import uuid
from typing import Any, Dict, List, Optional
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.db_models import KBEntry, QuestionReview, ResponseWorkspace
from app.models.schemas import (
    KBEntryBase,
    KBEntryCreate,
    KBEntryUpdate,
    QuestionReviewItem,
    WorkspaceCreate,
)


class PostgresService:
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
        await session.refresh(workspace)
        return workspace

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

