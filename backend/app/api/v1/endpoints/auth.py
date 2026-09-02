from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from typing import Dict, Any
from app.services.auth_service import AuthService

router = APIRouter()

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str

@router.post("/login", response_model=TokenResponse)
async def login(login_data: LoginRequest):
    # Mock user validation logic
    # In a real app, you would fetch the user from the DB here
    mock_hashed_password = AuthService.get_password_hash("password123")
    mock_email = "test@example.com"

    if login_data.email != mock_email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )

    if not AuthService.verify_password(login_data.password, mock_hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )

    access_token = AuthService.create_access_token(data={"sub": mock_email, "email": mock_email})
    return {"access_token": access_token, "token_type": "bearer"}
