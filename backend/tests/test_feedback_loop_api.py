import pytest
from fastapi.testclient import TestClient
from fastapi import FastAPI
from app.api.v1.endpoints.feedback_loop import router

app = FastAPI()
app.include_router(router)
client = TestClient(app)

def test_submit_feedback_success():
    response = client.post("/feedback", json={"user_id": "u1", "feedback": "Great!"})
    assert response.status_code == 200
    assert response.json()["status"] == "success"

def test_submit_feedback_empty():
    response = client.post("/feedback", json={"user_id": "u1", "feedback": ""})
    assert response.status_code == 400
