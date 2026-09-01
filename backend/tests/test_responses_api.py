import pytest
from fastapi.testclient import TestClient
from fastapi import FastAPI
from app.api.v1.endpoints.responses import router

app = FastAPI()
app.include_router(router)
client = TestClient(app)

def test_status_endpoint():
    response = client.get("/status")
    assert response.status_code == 200
    assert response.json()["status"] == "operational"
