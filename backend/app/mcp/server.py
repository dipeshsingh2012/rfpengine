from typing import Any, Dict, Optional
from app.mcp.tools import MCPTools

class MCPServer:
    """
    Orchestrates MCP JSON-RPC requests and routes them to the appropriate tools.
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

    async def handle_request(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """
        Processes a single JSON-RPC request.
        """
        method = request.get("method")
        params = request.get("params", {})
        request_id = request.get("id")

        try:
            if method == "tools/call":
                result = await self._call_tool(params.get("name"), params.get("arguments"))
                return {"jsonrpc": "2.0", "id": request_id, "result": self._serialize_result(result)}
            
            elif method == "tools/list":
                return {
                    "jsonrpc": "2.0", 
                    "id": request_id, 
                    "result": {
                        "tools": [
                            {"name": "search_knowledge_base", "description": "Hybrid search over KB"},
                            {"name": "manage_roadmap", "description": "Roadmap board management"},
                            {"name": "get_cloud_diagnostics", "description": "Cloud health checks"}
                        ]
                    }
                }
            
            else:
                return {
                    "jsonrpc": "2.0", 
                    "id": request_id, 
                    "error": {"code": -32601, "message": "Method not found"}
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
                action=args.get("action", ""),
                item_id=args.get("item_id"),
                payload=args.get("payload")
            )
        elif name == "get_cloud_diagnostics":
            return await self.tools.get_cloud_diagnostics(
                service_name=args.get("service_name", "default")
            )
        else:
            raise ValueError(f"Unknown tool: {name}")
