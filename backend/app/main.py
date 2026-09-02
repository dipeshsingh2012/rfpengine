from fastapi import FastAPI
from backend.app.api.v1.endpoints import auth
from backend.app.models import db_models

app = FastAPI(title="Autonomous Agentic Fleet API")

# Include routers
app.include_router(auth.router, prefix="/auth", tags=["auth"])

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.get("/")
async def root():
    return {"message": "Welcome to the Agentic Fleet API"}
