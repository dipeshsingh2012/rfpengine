from fastapi import APIRouter
from app.api.v1.endpoints import export
from app.api.knowledge_base import router as kb_router

api_router = APIRouter()

api_router.include_router(export.router, tags=["export"])
api_router.include_router(kb_router)
