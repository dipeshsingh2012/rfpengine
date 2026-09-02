from typing import Any, Dict, List

class SearchService:
    """Service for performing searches across indexed documents."""

    def __init__(self):
        # Mock index
        self._mock_index = [
            {"id": "1", "text": "The quick brown fox"},
            {"id": "2", "text": "Jumped over the lazy dog"},
            {"id": "3", "text": "Python programming is fun"},
        ]

    def search(self, query: str, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Performs a simple keyword search.
        """
        if not query:
            return []

        results = [
            doc for doc in self._mock_index 
            if query.lower() in doc["text"].lower()
        ]
        return results[:limit]
