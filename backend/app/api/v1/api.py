from fastapi import APIRouter
from app.api.v1.endpoints import feedback, search, responses
from app.api.knowledge_base import router as kb_router

api_router = APIRouter()

# Mount the routers
api_router.include_router(feedback.router, tags=["feedback"])
api_router.include_router(search.router, tags=["search"])
api_router.include_router(responses.router, prefix="/responses", tags=["responses"])
api_router.include_router(kb_router)
