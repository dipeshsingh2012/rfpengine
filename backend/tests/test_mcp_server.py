import pytest
import asyncio
from app.services.mcp_server import MCPServer

@pytest.mark.asyncio
async def test_mcp_streaming():
    server = MCPServer(server_id="test-server")
    events = []
    async for event in server.stream_mcp_events():
        events.append(event)
    
    assert len(events) == 3
    assert events[0]["server"] == "test-server"
