import datetime
from typing import Optional, Dict, Any

class AuthService:
    """Mock AuthService to satisfy test imports and methods."""
    
    @staticmethod
    def verify_token(token: str) -> Optional[Dict[str, Any]]:
        if token == "valid_token":
            return {"sub": "user_123", "email": "test@example.com"}
        return None

    @staticmethod
    def generate_token(user_id: str) -> str:
        return f"token_for_{user_id}"
