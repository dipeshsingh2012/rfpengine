from __future__ import annotations

from fastapi import APIRouter, Request

from app.models.schemas import SearchRequest, SearchResponse

router = APIRouter(prefix="/api/v1", tags=["Search"])


@router.post("/search", response_model=SearchResponse)
async def search_knowledge_base(
    request: Request,
    payload: SearchRequest,
) -> SearchResponse:
    hybrid_search_service = request.app.state.hybrid_search
    return await hybrid_search_service.search(payload)

