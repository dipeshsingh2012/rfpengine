from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from google_auth_oauthlib.flow import Flow
from backend.app.core.config import settings
from backend.app.core.security import create_access_token
from backend.app.services.auth_service import AuthService
from backend.app.models import db_models
from backend.app.models import schemas
import httpx

router = APIRouter()

# In-memory flow storage for demo purposes. 
# In production, use a secure session/cache.
flow_store = {}

@router.get("/login/google")
async def login_google():
    """Initiates the Google OAuth2 flow."""
    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [settings.GOOGLE_REDIRECT_URI],
            }
        },
        scopes=["https://www.googleapis.com/auth/userinfo.email", "https://www.googleapis.com/auth/userinfo.profile"]
    )
    flow.redirect_uri = settings.GOOGLE_REDIRECT_URI
    authorization_url, state = flow.authorization_url(access_type='offline')
    
    # Store state to verify in callback
    flow_store[state] = True 
    
    return RedirectResponse(authorization_url)

@router.get("/callback/google")
async def callback_google(code: str, state: str, db: Session = Depends(lambda: None)): 
    # Note: In a real app, 'db' would be injected via a proper dependency
    # For this implementation, we assume the DB session is provided by the app context
    from backend.app.dependencies import get_db # Hypothetical dependency
    db = get_db()

    if state not in flow_store:
        raise HTTPException(status_code=400, detail="Invalid state")
    del flow_store[state]

    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [settings.GOOGLE_REDIRECT_URI],
            }
        },
        scopes=["https://www.googleapis.com/auth/userinfo.email", "https://www.googleapis.com/auth/userinfo.profile"]
    )
    flow.redirect_uri = settings.GOOGLE_REDIRECT_URI

    # Exchange code for tokens
    flow.fetch_token(code=code)
    credentials = flow.credentials

    # Get ID Token
    id_token = credentials.id_token
    
    # Verify ID Token
    google_info = await AuthService.verify_google_id_token(id_token)
    if not google_info:
        raise HTTPException(status_code=401, detail="Invalid Google token")

    # Get or Create User
    user = await AuthService.get_or_create_user(db, google_info)

    # Create local JWT
    access_token = create_access_token(data={"sub": user.email, "email": user.email})
    
    # Redirect to frontend with token in fragment (standard for SPAs)
    # In production, consider a secure HttpOnly cookie
    return RedirectResponse(url=f"http://localhost:3000/auth-success#access_token={access_token}")
