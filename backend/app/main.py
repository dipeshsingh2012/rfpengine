from fastapi import FastAPI
from app.api.v1.endpoints import csv_endpoints

app = FastAPI(title="Agentic Fleet API")

app.include_router(csv_endpoints.router, prefix="/api/v1")

@app.get("/health")
async def health():
    return {"status": "ok"}
