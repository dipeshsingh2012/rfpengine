from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from google_auth_oauthlib.flow import Flow
from backend.app.core.config import settings
from backend.app.core.security import create_access_token
from backend.app.services.auth_service import AuthService
from backend.app.models import db_models
from backend.app.dependencies import get_db # Assuming standard dependency injection

router = APIRouter()

# In-memory flow storage for demo purposes. 
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
    
    flow_store[state] = True 
    return RedirectResponse(authorization_url)

@router.get("/callback/google")
async def callback_google(code: str, state: str, db: Session = Depends(get_db)): 
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
    id_token = credentials.id_token
    
    # Verify ID Token
    google_info = await AuthService.verify_google_id_token(id_token)
    if not google_info:
        raise HTTPException(status_code=401, detail="Invalid Google token")

    # Get or Create User (Now includes tenant_id logic)
    user = await AuthService.get_or_create_user(db, google_info)

    # Create local JWT including tenant context in payload
    access_token = create_access_token(data={
        "sub": user.email, 
        "email": user.email,
        "tenant_id": user.tenant_id  # CRITICAL: Include tenant in JWT for downstream isolation
    })
    
    return RedirectResponse(url=f"http://localhost:3000/auth-success#access_token={access_token}")
