from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from typing import Dict, Any
from app.services.auth_service import AuthService

router = APIRouter()

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str

# Mock user database for demonstration
MOCK_USER_DB = {
    "admin@example.com": {
        "email": "admin@example.com",
        "hashed_password": AuthService.get_password_hash("password123")
    }
}

@router.post("/login", response_model=LoginResponse)
async def login(login_data: LoginRequest):
    user = MOCK_USER_DB.get(login_data.email)
    
    if not user or not AuthService.verify_password(login_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = AuthService.create_access_token(data={"sub": user["email"]})
    return {"access_token": access_token, "token_type": "bearer"}
