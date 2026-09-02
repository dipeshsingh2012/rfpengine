import re
from typing import Any, Dict, List

class DocumentParser:
    """Service for parsing unstructured text into structured data."""

    def parse_text(self, content: str) -> Dict[str, Any]:
        """
        Parses raw text to extract potential metadata like email addresses and dates.
        """
        if not content:
            return {"emails": [], "dates": [], "word_count": 0}

        # Simple regex for email extraction
        email_pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
        emails = list(set(re.findall(email_pattern, content)))

        # Simple regex for YYYY-MM-DD dates
        date_pattern = r'\d{4}-\d{2}-\d{2}'
        dates = list(set(re.findall(date_pattern, content)))

        return {
            "emails": emails,
            "dates": dates,
            "word_count": len(content.split())
        }
