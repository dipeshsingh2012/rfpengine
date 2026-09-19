from fastapi import APIRouter
from app.api.v1.endpoints import (
    feedback,
    search,
    responses,
    tuning,
    export,
    email,
    mcp,
    roadmap,
    parser,
)
from app.api.knowledge_base import router as kb_router

api_router = APIRouter()

# Mount the routers
api_router.include_router(feedback.router, tags=["feedback"])
api_router.include_router(search.router, tags=["search"])
api_router.include_router(responses.router, prefix="/responses", tags=["responses"])
api_router.include_router(tuning.router)
api_router.include_router(kb_router)
api_router.include_router(export.router, prefix="/export", tags=["export"])
api_router.include_router(email.router)
api_router.include_router(mcp.router)
api_router.include_router(roadmap.router, prefix="/roadmap", tags=["roadmap"])
api_router.include_router(parser.router, prefix="/parser", tags=["parser"])
