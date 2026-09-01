import pytest
from fastapi.testclient import TestClient
from fastapi import FastAPI
from app.api.v1.endpoints.roadmap import router

app = FastAPI()
app.include_router(router)
client = TestClient(app)

def test_milestones_endpoint():
    response = client.get("/milestones")
    assert response.status_code == 200
    assert len(response.json()) > 0
    assert "phase" in response.json()[0]
