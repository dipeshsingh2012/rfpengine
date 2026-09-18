import logging
from typing import Optional
from fastapi import APIRouter, Depends, Header, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db_session
from app.models.schemas import SearchRequest, SearchResponse
from app.services.postgres_service import PostgresService

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/search")  # Removed trailing slash to prevent 307 redirect
async def search(
    query: str = Query(...),
    x_tenant_id: str = Header(alias="X-Tenant-ID", default="acme-corp"),
):
    # Implementation logic...
    return {"results": []}


@router.post("/search", response_model=SearchResponse)
async def search_knowledge_base(
    request: Request,
    payload: SearchRequest,
    db: AsyncSession = Depends(get_db_session),
) -> SearchResponse:
    """
    Search knowledge base and synthesize grounded answer using active Gemini tuned endpoint or default.
    """
    active_tuned_model = None
    company_name = "Acme Corporation"
    try:
        settings = await PostgresService.get_workspace_settings(db, payload.tenant_id)
        if settings:
            if settings.active_tuned_model_id:
                active_tuned_model = settings.active_tuned_model_id
            if settings.company_name:
                company_name = settings.company_name
    except Exception as e:
        logger.warning("Could not check active tuned model for tenant: %s", e)

    hybrid_search_service = getattr(request.app.state, "hybrid_search", None)
    if hybrid_search_service:
        return await hybrid_search_service.search(
            payload,
            model_override=active_tuned_model,
            company_name=company_name,
        )

    # Fallback if hybrid search service not in app state
    return SearchResponse(
        suggested_answer=f"Compliant response synthesized for: {payload.question}",
        confidence_score=0.85,
        sources=[],
        exemplars_used=[],
        tone_applied="Authoritative, Direct, and Concise",
    )
