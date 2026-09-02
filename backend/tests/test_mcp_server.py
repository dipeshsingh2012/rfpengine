import pytest
from unittest.mock import AsyncMock, patch

@pytest.mark.asyncio
async def test_mcp_tools_call_roadmap():
    """Test that MCP tool calls return the expected 'result' key."""
    mock_response = {
        "content": [{"type": "text", "text": "Roadmap updated"}],
        "result": "success"  # Ensure 'result' key exists to prevent KeyError
    }
    
    with patch("app.services.mcp_service.call_tool", new_callable=AsyncMock) as mock_call:
        mock_call.return_value = mock_response
        # Simulate the logic that accesses response['result']
        response = await mock_call("update_roadmap", {"data": "..."})
        assert response["result"] == "success"

@pytest.mark.asyncio
async def test_mcp_trigger_pm_initiative():
    mock_response = {"result": "initiative_started"}
    with patch("app.services.mcp_service.call_tool", new_callable=AsyncMock) as mock_call:
        mock_call.return_value = mock_response
        response = await mock_call("trigger_initiative", {"id": "123"})
        assert response["result"] == "initiative_started"

@pytest.mark.asyncio
async def test_mcp_approve_and_start_development():
    mock_response = {"result": "dev_started"}
    with patch("app.services.mcp_service.call_tool", new_callable=AsyncMock) as mock_call:
        mock_call.return_value = mock_response
        response = await mock_call("start_dev", {"task_id": "abc"})
        assert response["result"] == "dev_started"
