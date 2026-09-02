import pytest
from fastapi.testclient import TestClient
from fastapi import FastAPI
from app.api.v1.endpoints.auth import router

app = FastAPI()
app.include_router(router)

client = TestClient(app)

def test_verify_endpoint_success():
    response = client.get("/auth/verify", headers={"Authorization": "Bearer valid_token"})
    assert response.status_code == 200
    assert response.json()["status"] == "success"

def test_verify_endpoint_unauthorized():
    response = client.get("/auth/verify", headers={"Authorization": "Bearer invalid_token"})
    assert response.status_code == 401
