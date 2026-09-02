import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from app.api.v1.endpoints.auth import router

# Setup a minimal FastAPI app for testing the router
app = FastAPI()
app.include_router(router, prefix="/auth")

client = TestClient(app)

def test_login_success():
    payload = {
        "email": "admin@example.com",
        "password": "password123"
    }
    response = client.post("/auth/login", json=payload)
    
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"

def test_login_failure_wrong_password():
    payload = {
        "email": "admin@example.com",
        "password": "wrong_password"
    }
    response = client.post("/auth/login", json=payload)
    
    assert response.status_code == 401
    assert response.json()["detail"] == "Incorrect email or password"

def test_login_failure_nonexistent_user():
    payload = {
        "email": "nonexistent@example.com",
        "password": "password123"
    }
    response = client.post("/auth/login", json=payload)
    
    assert response.status_code == 401

def test_login_invalid_email_format():
    payload = {
        "email": "not-an-email",
        "password": "password123"
    }
    response = client.post("/auth/login", json=payload)
    
    # Pydantic validation error returns 422 Unprocessable Entity
    assert response.status_code == 422
