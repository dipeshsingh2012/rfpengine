import uvicorn
from fastapi import FastAPI
from app.core.config import settings

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

@app.get("/health")
async def health_check():
    """Health check endpoint for Cloud Run liveness/readiness probes."""
    return {"status": "healthy", "environment": settings.ENVIRONMENT}

@app.get("/")
async def root():
    return {"message": "Welcome to the Backend API"}

if __name__ == "__main__":
    # This block allows running the app directly via `python app/main.py`
    # It respects the PORT and HOST settings required by Cloud Run.
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.ENVIRONMENT == "development",
    )
