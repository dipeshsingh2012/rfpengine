from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.api import api_router

app = FastAPI(title="Autonomous Agentic Fleet API")

# Allow all origins, methods, and headers for seamless frontend, extension, and local access
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r".*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Canonical API route prefix is /api/v1
app.include_router(api_router, prefix="/api/v1")

# Also maintain /v1 alias for backward compatibility
app.include_router(api_router, prefix="/v1")

@app.get("/health")
@app.get("/api/health")
async def health_check():
    return {"status": "healthy"}
