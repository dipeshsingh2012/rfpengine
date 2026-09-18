from fastapi import FastAPI
from app.api.v1.api import api_router
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Autonomous Agentic Fleet API")

# Allow all origins, methods, and headers for seamless frontend, extension, and local access
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r".*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure the api_router is mounted at both /api/v1 and /v1 for full client compatibility
app.include_router(api_router, prefix="/api/v1")
app.include_router(api_router, prefix="/v1")

@app.get("/health")
@app.get("/api/health")
async def health_check():
    return {"status": "healthy"}
