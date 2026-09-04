from fastapi import FastAPI
from app.api.v1.router import api_router

app = FastAPI(title="Agentic Fleet Backend")

app.include_router(api_router, prefix="/api/v1")

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.get("/")
async def root():
    return {"message": "Welcome to the Backend API"}
