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
            return {}

    @staticmethod
    async def get_or_create_user(db: Session, google_info: Dict[str, Any]) -> db_models.User:
        """Finds or creates a user based on Google identity, ensuring tenant assignment."""
        email = google_info.get("email")
        google_id = google_info.get("sub")
        full_name = google_info.get("name")
        
        # Remediation: Derive tenant_id from email domain to maintain multi-tenant isolation
        # In a production environment, this would be mapped via a formal Tenant registry.
        domain = email.split('@')[-1] if email else "default"
        derived_tenant_id = f"tenant_{domain}"

        user = db.query(db_models.User).filter(db_models.User.email == email).first()
        
        if not user:
            user = db_models.User(
                email=email,
                full_name=full_name,
                google_id=google_id,
                tenant_id=derived_tenant_id  # CRITICAL: Assigning tenant context
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        else:
            # Ensure existing users are updated with tenant context if it was missing
            if not user.tenant_id:
                user.tenant_id = derived_tenant_id
                db.commit()
                db.refresh(user)
            
            # Sync Google ID if missing
            if not user.google_id:
                user.google_id = google_id
                db.commit()
                db.refresh(user)
                
        return user
