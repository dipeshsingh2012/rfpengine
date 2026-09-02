import asyncio
from typing import Any, Dict, Optional

class EmailService:
    """Service for handling asynchronous email dispatch."""

    async def send_email_async(
        self, 
        recipient: str, 
        subject: str, 
        body: str, 
        metadata: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        Simulates sending an email asynchronously.
        """
        if not recipient or "@" not in recipient:
            return False
        
        # Simulate network latency
        await asyncio.sleep(0.01)
        
        # In a real implementation, this would call an SMTP server or SendGrid/SES
        return True
