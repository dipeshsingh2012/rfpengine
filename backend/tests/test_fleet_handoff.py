import pytest
from app.services.fleet_service import FleetService

@pytest.mark.asyncio
async def test_perform_handoff_success():
    service = FleetService()
    result = await service.perform_handoff("fleet_123", "agent_456")
    assert result["status"] == "success"
    assert result["new_owner"] == "agent_456"

@pytest.mark.asyncio
async def test_perform_handoff_failure():
    service = FleetService()
    with pytest.raises(ValueError):
        await service.perform_handoff("", "agent_456")
