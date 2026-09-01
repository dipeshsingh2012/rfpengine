from typing import Dict
from fastapi import APIRouter, Header, HTTPException, Request
from fastapi.responses import StreamingResponse
import asyncio
import json
from app.mcp.server import MCPServer

router = APIRouter(prefix="/mcp", tags=["MCP"])
mcp_server = MCPServer()

# In-memory connection registry for SSE (In production, use Redis/PubSub)
connections: Dict[str, asyncio.Queue] = {}

@router.get("/sse")
async def sse_endpoint(x_tenant_id: str = Header(..., alias="X-Tenant-ID")):
    """
    Establishes an SSE connection for the MCP client.
    """
    tenant_id = x_tenant_id
    queue = asyncio.Queue()
    connections[tenant_id] = queue

    async def event_generator():
        try:
            # Send initial endpoint for client to post messages to
            yield f"event: endpoint\ndata: /mcp/messages?tenant_id={tenant_id}\n\n"
            
            while True:
                data = await queue.get()
                yield f"event: message\ndata: {data}\n\n"
        except asyncio.CancelledError:
            pass
        finally:
            if tenant_id in connections:
                del connections[tenant_id]

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@router.post("/messages")
async def mcp_messages(
    request: Request, 
    x_tenant_id: str = Header(..., alias="X-Tenant-ID")
):
    """
    Receives JSON-RPC messages from the client via HTTP POST.
    Supports both direct HTTP response and asynchronous SSE delivery.
    """
    body = await request.json()
    response = await mcp_server.handle_request(body)
    
    # Push to SSE queue if active stream exists and response is produced
    if response is not None and x_tenant_id in connections:
        try:
            await connections[x_tenant_id].put(json.dumps(response))
        except Exception:
            pass
            
    return response or {"status": "accepted"}
