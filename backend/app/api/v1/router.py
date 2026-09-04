from fastapi import APIRouter
from app.api.v1.endpoints import fleet

api_router = APIRouter()

# Register the fleet handoff router
api_router.include_router(fleet.router, prefix="/fleet", tags=["fleet"])

# ... other existing routers ...
