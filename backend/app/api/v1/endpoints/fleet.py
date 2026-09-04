from fastapi import APIRouter, Header, HTTPException, status
from app.schemas.fleet import FleetHandoffVerifyRequest, FleetHandoffVerifyResponse
from app.services.fleet_service import FleetHandoffService

router = APIRouter()
fleet_service = FleetHandoffService()

@router.post(
    "/handoff/verify", 
    response_model=FleetHandoffVerifyResponse,
    status_code=status.HTTP_200_OK
)
async def verify_fleet_handoff(
    request: FleetHandoffVerifyRequest,
    tenant_id: str = Header(alias="X-Tenant-ID"),
):
    try:
        result = fleet_service.verify_handoff(request, tenant_id)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Handoff verification failed: {str(e)}"
        )
