from fastapi import APIRouter
from app.api.v1.endpoints import feedback, search, responses

api_router = APIRouter()

# Mount the routers
api_router.include_router(feedback.router, tags=["feedback"])
api_router.include_router(search.router, tags=["search"])
# Ensure the prefix matches the test expectation: /api/v1/responses/...
api_router.include_router(responses.router, prefix="/responses", tags=["responses"])
