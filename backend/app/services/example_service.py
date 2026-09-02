import logging
from typing import Any, AsyncGenerator, Dict, List, Optional
from app.core.config import get_settings

logger = logging.getLogger(__name__)

class ExampleService:
    def __init__(self):
        self.settings = get_settings()
        self.project_id = self.settings.GCP_PROJECT_ID

    async def stream_data(self, items: List[Dict[str, Any]]) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Example of a memory-efficient async generator.
        Demonstrates correct typing imports.
        """
        for item in items:
            logger.info(f"Processing item in project: {self.project_id}")
            yield item
