from fastapi import APIRouter, Depends, Header, HTTPException, status
from app.schemas.fleet import FleetHandoffVerifyRequest, FleetHandoffVerifyResponse
from app.services.fleet_service import FleetHandoffService
# Assuming get_tenant_id is implemented in deps.py as per design
from app.api.deps import get_tenant_id 

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
    # In a real app, we'd use a dependency to validate the tenant_id exists
    # current_tenant: Tenant = Depends(get_tenant_id) 
):
    """
    Verifies the autonomous SDLC pipeline state and determines if the 
    fleet is ready to hand off to a human for final approval.
    """
    try:
        result = fleet_service.verify_handoff(request, tenant_id)
        return result
    except Exception as e:
        # Log error here in production
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Handoff verification failed: {str(e)}"
        )
