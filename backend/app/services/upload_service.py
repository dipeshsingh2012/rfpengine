import io
from typing import Any, Dict, List

class UploadService:
    """Service to handle CSV file processing and validation."""
    
    async def process_csv_content(self, content: bytes) -> List[Dict[str, Any]]:
        """Parses raw bytes into a list of dictionaries."""
        import csv
        decoded_content = content.decode("utf-8")
        stream = io.StringIO(decoded_content)
        reader = csv.DictReader(stream)
        return [row for row in reader]

    async def validate_upload(self, filename: str) -> bool:
        """Validates if the filename is acceptable."""
        return filename.endswith(".csv")
