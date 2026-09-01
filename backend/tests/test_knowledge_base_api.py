import pytest
from fastapi.testclient import TestClient
from fastapi import FastAPI
from app.api.v1.endpoints.knowledge_base import router

app = FastAPI()
app.include_router(router)
client = TestClient(app)

def test_kb_query():
    response = client.get("/query?q=test_query")
    assert response.status_code == 200
    assert isinstance(response.json(), list)
    assert "result" in response.json()[0]
