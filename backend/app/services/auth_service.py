from typing import Dict, Any
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from sqlalchemy.orm import Session
from backend.app.models import db_models
from backend.app.core.config import settings

class AuthService:
    @staticmethod
    async def verify_google_id_token(token: str) -> Dict[str, Any]:
        """Verifies the Google ID token and returns the payload."""
        try:
            idinfo = id_token.verify_oauth2_token(
                token, 
                google_requests.Request(), 
                settings.GOOGLE_CLIENT_ID
            )
            return idinfo
        except ValueError:
            # Invalid token
            return {}

    @staticmethod
    async def get_or_create_user(db: Session, google_info: Dict[str, Any]) -> db_models.User:
        """Finds or creates a user based on Google identity."""
        email = google_info.get("email")
        google_id = google_info.get("sub")
        full_name = google_info.get("name")

        user = db.query(db_models.User).filter(db_models.User.email == email).first()
        
        if not user:
            user = db_models.User(
                email=email,
                full_name=full_name,
                google_id=google_id
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        else:
            # Update google_id if it was missing
            if not user.google_id:
                user.google_id = google_id
                db.commit()
                db.refresh(user)
                
        return user
