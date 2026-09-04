from fastapi import APIRouter
from app.api.v1.endpoints import fleet, csv_endpoints, export

api_router = APIRouter()

api_router.include_router(fleet.router, prefix="/fleet", tags=["fleet"])
api_router.include_router(csv_endpoints.router, prefix="/csv", tags=["csv"])
api_router.include_router(export.router, tags=["export"])
