import asyncio
from typing import AsyncGenerator, List, Dict, Any

class MCPServer:
    def __init__(self, server_id: str):
        self.server_id = server_id

    async def stream_mcp_events(self) -> AsyncGenerator[Dict[str, Any], None]:
        """Streams MCP events for IDE/Gemini integration."""
        for i in range(3):
            await asyncio.sleep(0.01)
            yield {"event_id": i, "payload": f"mcp_data_{i}", "server": self.server_id}
