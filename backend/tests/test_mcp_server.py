import pytest
import asyncio
from app.mcp.server import MCPServer
from app.services.mcp_server import MCPServer as LegacyMCPServer

@pytest.mark.asyncio
async def test_legacy_mcp_streaming():
    server = LegacyMCPServer(server_id="test-server")
    events = []
    async for event in server.stream_mcp_events():
        events.append(event)
    
    assert len(events) == 3
    assert events[0]["server"] == "test-server"

@pytest.mark.asyncio
async def test_mcp_tools_list():
    server = MCPServer()
    req = {"jsonrpc": "2.0", "id": 1, "method": "tools/list", "params": {}}
    res = await server.handle_request(req)
    assert res["jsonrpc"] == "2.0"
    assert res["id"] == 1
    tool_names = [t["name"] for t in res["result"]["tools"]]
    assert "search_knowledge_base" in tool_names
    assert "manage_roadmap" in tool_names
    assert "get_cloud_diagnostics" in tool_names

@pytest.mark.asyncio
async def test_mcp_tools_call_roadmap():
    server = MCPServer()
    req = {
        "jsonrpc": "2.0",
        "id": 2,
        "method": "tools/call",
        "params": {"name": "manage_roadmap", "arguments": {"action": "list"}}
    }
    res = await server.handle_request(req)
    assert res["jsonrpc"] == "2.0"
    assert res["id"] == 2
    assert "items" in res["result"]
    assert res["result"]["total"] >= 1

@pytest.mark.asyncio
async def test_mcp_tools_call_diagnostics():
    server = MCPServer()
    req = {
        "jsonrpc": "2.0",
        "id": 3,
        "method": "tools/call",
        "params": {"name": "get_cloud_diagnostics", "arguments": {"service_name": "PostgreSQL"}}
    }
    res = await server.handle_request(req)
    assert res["jsonrpc"] == "2.0"
    assert res["id"] == 3
    assert res["result"]["service"] == "PostgreSQL"
    assert "latency_ms" in res["result"]

@pytest.mark.asyncio
async def test_mcp_trigger_pm_initiative():
    server = MCPServer()
    req = {
        "jsonrpc": "2.0",
        "id": 5,
        "method": "tools/call",
        "params": {
            "name": "trigger_pm_initiative",
            "arguments": {
                "title": "Automated Webhook Dispatch on Approval",
                "prompt": "Dispatches webhook to external systems when RFP is signed off.",
                "category": "integrations"
            }
        }
    }
    res = await server.handle_request(req)
    assert res["jsonrpc"] == "2.0"
    assert res["id"] == 5
    assert "initiative_id" in res["result"]
    assert res["result"]["stage"] == "discovery"

@pytest.mark.asyncio
async def test_mcp_unknown_method():
    server = MCPServer()
    req = {"jsonrpc": "2.0", "id": 4, "method": "unknown/method", "params": {}}
    res = await server.handle_request(req)
    assert "error" in res
    assert res["error"]["code"] == -32601
