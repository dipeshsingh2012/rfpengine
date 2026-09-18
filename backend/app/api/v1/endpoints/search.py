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
    configured_model = None
    configured_tone = None
    try:
        settings = await PostgresService.get_workspace_settings(db, payload.tenant_id)
        if settings:
            if settings.active_tuned_model_id:
                active_tuned_model = settings.active_tuned_model_id
            if settings.default_model:
                configured_model = settings.default_model
            if settings.response_tone:
                configured_tone = settings.response_tone
            if settings.company_name:
                company_name = settings.company_name
    except Exception as e:
        logger.warning("Could not check settings for tenant: %s", e)

    model_to_use = payload.model or active_tuned_model or configured_model
    tone_to_use = payload.tone or configured_tone

    hybrid_search_service = getattr(request.app.state, "hybrid_search", None)
    if hybrid_search_service:
        return await hybrid_search_service.search(
            payload,
            model_override=model_to_use,
            company_name=company_name,
            tone=tone_to_use,
        )

    # Fallback if hybrid search service not in app state
    return SearchResponse(
        suggested_answer=f"Compliant response synthesized for: {payload.question}",
        confidence_score=0.85,
        sources=[],
        exemplars_used=[],
        tone_applied=tone_to_use or "Authoritative, Direct, and Concise",
    )
