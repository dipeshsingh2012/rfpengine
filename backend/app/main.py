from fastapi import FastAPI
from app.api.v1.api import api_router

app = FastAPI(title="Autonomous Agentic Fleet API")

# Ensure the api_router is mounted at the correct base path
app.include_router(api_router, prefix="/api/v1")

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
