import pytest
from typing import Any, Dict
from app.services.mcp_service import mcp_service

@pytest.mark.asyncio
async def test_mcp_tools_call_roadmap():
    """Tests the roadmap calling capability."""
    roadmap_id = "roadmap_001"
    context = {"user_role": "admin"}
    
    result = await mcp_service.call_roadmap(roadmap_id, context)
    
    assert result["roadmap_id"] == roadmap_id
    assert "milestones" in result
    assert isinstance(result["milestones"], list)

@pytest.mark.asyncio
async def test_mcp_trigger_pm_initiative():
    """Tests triggering a new PM initiative."""
    name = "AI Integration"
    priority = "high"
    
    result = await mcp_service.trigger_pm_initiative(name, priority)
    
    assert result["name"] == name
    assert result["priority"] == priority
    assert result["status"] == "triggered"
    assert "initiative_id" in result

@pytest.mark.asyncio
async def test_mcp_approve_and_start_development():
    """Tests the transition to development state."""
    task_id = "task_99"
    approver = "user_dev_01"
    
    result = await mcp_service.approve_and_start_development(task_id, approver)
    
    assert result["task_id"] == task_id
    assert result["status"] == "in_development"
    assert result["started_by"] == approver
    assert result["branch_name"].startswith("feat/task-")
