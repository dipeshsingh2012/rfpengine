from __future__ import annotations

import asyncio
import json
import logging
import sys
from typing import Any, Dict, Optional
from app.mcp.tools import MCPTools

logger = logging.getLogger("rfpengine.mcp.server")


class MCPServer:
    """
    Model Context Protocol (MCP) JSON-RPC 2.0 Server.
    Provides standard tools/list and tools/call over stdio and SSE transports.
    """
    def __init__(self):
        self.tools = MCPTools()

    @staticmethod
    def _serialize_result(val: Any) -> Any:
        if isinstance(val, list):
            return [MCPServer._serialize_result(item) for item in val]
        if isinstance(val, dict):
            return {k: MCPServer._serialize_result(v) for k, v in val.items()}
        if hasattr(val, "model_dump"):
            return val.model_dump()
        if hasattr(val, "dict"):
            return val.dict()
        return val

    async def handle_request(self, request: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Processes a single JSON-RPC 2.0 request or notification.
        """
        method = request.get("method")
        params = request.get("params") or {}
        request_id = request.get("id")

        # JSON-RPC 2.0: Notifications do not have an 'id' and MUST NOT receive a response.
        if request_id is None or (method and (method.startswith("notifications/") or method == "initialized")):
            logger.debug("Received notification '%s', suppressing response.", method)
            return None

        try:
            if method == "initialize":
                return {
                    "jsonrpc": "2.0",
                    "id": request_id,
                    "result": {
                        "protocolVersion": "2024-11-05",
                        "serverInfo": {"name": "rfpengine-mcp", "version": "0.2.0"},
                        "capabilities": {"tools": {}}
                    }
                }

            elif method == "ping":
                return {"jsonrpc": "2.0", "id": request_id, "result": {}}

            elif method == "tools/list":
                return {
                    "jsonrpc": "2.0", 
                    "id": request_id, 
                    "result": {
                        "tools": [
                            {
                                "name": "search_knowledge_base",
                                "description": "Hybrid vector and keyword search across RFPEngine compliance whitepapers and proposals.",
                                "inputSchema": {
                                    "type": "object",
                                    "properties": {
                                        "query": {"type": "string", "description": "The search query or RFP question."},
                                        "limit": {"type": "integer", "default": 5, "description": "Maximum number of results to return."}
                                    },
                                    "required": ["query"]
                                }
                            },
                            {
                                "name": "manage_roadmap",
                                "description": "Query product backlog, inspect Gherkin criteria, or transition KanBan stages.",
                                "inputSchema": {
                                    "type": "object",
                                    "properties": {
                                        "action": {"type": "string", "enum": ["list", "get", "create", "update"], "description": "Action to perform on the roadmap."},
                                        "item_id": {"type": "string", "description": "Initiative ID (required for 'get' and 'update')."},
                                        "payload": {"type": "object", "description": "Initiative payload for create or update."}
                                    },
                                    "required": ["action"]
                                }
                            },
                            {
                                "name": "get_cloud_diagnostics",
                                "description": "Check real-time health, connection pool status, and database latencies.",
                                "inputSchema": {
                                    "type": "object",
                                    "properties": {
                                        "service_name": {"type": "string", "default": "all", "description": "Target service to inspect."}
                                    }
                                }
                            },
                            {
                                "name": "trigger_pm_initiative",
                                "description": "Triggers the autonomous PM Agent and SDLC fleet via repository dispatch to spec, implement, and open a PR with ZERO GitHub Issue noise.",
                                "inputSchema": {
                                    "type": "object",
                                    "properties": {
                                        "title": {"type": "string", "description": "Feature initiative title."},
                                        "prompt": {"type": "string", "description": "Detailed requirements, problem statement, or user story."},
                                        "category": {"type": "string", "default": "core", "description": "Product theme or category."}
                                    },
                                    "required": ["title", "prompt"]
                                }
                            },
                            {
                                "name": "approve_and_start_development",
                                "description": "Human Sign-Off Gate: Approves a PM specification, transitions it to 'development', and launches dev-agent to cut branch and open PR.",
                                "inputSchema": {
                                    "type": "object",
                                    "properties": {
                                        "item_id": {"type": "string", "description": "Initiative ID to approve."},
                                        "feedback": {"type": "string", "description": "Optional engineer or PM feedback for dev-agent."}
                                    },
                                    "required": ["item_id"]
                                }
                            }
                        ]
                    }
                }

            elif method == "tools/call":
                name = params.get("name")
                args = params.get("arguments") or {}
                result = await self._call_tool(name, args)
                serialized = self._serialize_result(result)
                if isinstance(serialized, dict):
                    if "content" not in serialized:
                        serialized["content"] = [{"type": "text", "text": json.dumps(serialized, indent=2)}]
                    if "isError" not in serialized:
                        serialized["isError"] = False
                    result_payload = serialized
                elif isinstance(serialized, list):
                    result_payload = {
                        "content": [{"type": "text", "text": json.dumps(serialized, indent=2)}],
                        "isError": False,
                        "items": serialized,
                        "total": len(serialized)
                    }
                else:
                    result_payload = {
                        "content": [{"type": "text", "text": str(serialized)}],
                        "isError": False
                    }
                return {"jsonrpc": "2.0", "id": request_id, "result": result_payload}

            else:
                return {
                    "jsonrpc": "2.0", 
                    "id": request_id, 
                    "error": {"code": -32601, "message": f"Method '{method}' not found"}
                }

        except Exception as e:
            return {
                "jsonrpc": "2.0", 
                "id": request_id, 
                "error": {"code": -32000, "message": str(e)}
            }

    async def _call_tool(self, name: str, args: Optional[Dict[str, Any]]) -> Any:
        args = args or {}
        if name == "search_knowledge_base":
            return await self.tools.search_knowledge_base(
                query=args.get("query", ""), 
                limit=args.get("limit", 5)
            )
        elif name == "manage_roadmap":
            return await self.tools.manage_roadmap(
                action=args.get("action", "list"),
                item_id=args.get("item_id"),
                payload=args.get("payload")
            )
        elif name == "trigger_pm_initiative":
            return await self.tools.trigger_pm_initiative(
                title=args.get("title", "New Feature"),
                prompt=args.get("prompt", ""),
                category=args.get("category", "core")
            )
        elif name == "approve_and_start_development":
            return await self.tools.approve_and_start_development(
                item_id=args.get("item_id", ""),
                feedback=args.get("feedback")
            )
        elif name == "get_cloud_diagnostics":
            return await self.tools.get_cloud_diagnostics(
                service_name=args.get("service_name", "all")
            )
        else:
            raise ValueError(f"Unknown tool: {name}")


async def run_stdio_server():
    """
    Runs the MCP server over standard input / output (stdio) for IDEs (Antigravity, Cursor, Claude Code).
    """
    server = MCPServer()
    loop = asyncio.get_running_loop()
    reader = asyncio.StreamReader()
    protocol = asyncio.StreamReaderProtocol(reader)
    await loop.connect_read_pipe(lambda: protocol, sys.stdin)

    while True:
        line = await reader.readline()
        if not line:
            break
        text_line = line.decode("utf-8").strip()
        if not text_line:
            continue
        try:
            req = json.loads(text_line)
            res = await server.handle_request(req)
            if res is not None:
                sys.stdout.write(json.dumps(res) + "\n")
                sys.stdout.flush()
        except Exception as exc:
            err_res = {"jsonrpc": "2.0", "id": None, "error": {"code": -32700, "message": f"Parse error: {exc}"}}
            sys.stdout.write(json.dumps(err_res) + "\n")
            sys.stdout.flush()


if __name__ == "__main__":
    asyncio.run(run_stdio_server())
