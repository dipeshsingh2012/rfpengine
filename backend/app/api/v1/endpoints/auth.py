from fastapi import APIRouter, Depends, HTTPException, status, Header
from typing import Any, Dict, Optional
from app.models.auth import UserCreate, Token, TokenData
from app.services.auth_service import AuthService

router = APIRouter()

# Mock database for demonstration purposes
# In a real app, this would be a DB session dependency
MOCK_USER_DB = {}

@router.post("/register", response_model=Token)
async def register(user_in: UserCreate, x_tenant_id: str = Header(..., alias="X-Tenant-ID")):
    """Registers a new user within a specific tenant."""
    if user_in.email in MOCK_USER_DB:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_pw = AuthService.get_password_hash(user_in.password)
    user_id = user_in.email # Simplified
    
    MOCK_USER_DB[user_in.email] = {
        "email": user_in.email,
        "hashed_password": hashed_pw,
        "tenant_id": x_tenant_id,
        "full_name": user_in.full_name
    }
    
    access_token = AuthService.create_access_token(
        data={"sub": user_in.email, "tenant_id": x_tenant_id}
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/login", response_model=Token)
async def login(user_in: UserCreate, x_tenant_id: str = Header(..., alias="X-Tenant-ID")):
    """Authenticates a user and returns a JWT."""
    user = MOCK_USER_DB.get(user_in.email)
    
    if not user or user["tenant_id"] != x_tenant_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not AuthService.verify_password(user_in.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = AuthService.create_access_token(
        data={"sub": user.get("email"), "tenant_id": user.get("tenant_id")}
    )
    return {"access_token": access_token, "token_type": "bearer"}
