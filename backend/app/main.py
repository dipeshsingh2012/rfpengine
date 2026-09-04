from fastapi import FastAPI
from app.api.v1.endpoints import csv_endpoints

app = FastAPI(title="Agentic Fleet Backend")

# Include routers
app.include_router(csv_endpoints.router, prefix="/api/v1/csv", tags=["CSV"])

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
