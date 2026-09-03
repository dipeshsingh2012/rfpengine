from fastapi import FastAPI
from app.api.v1.endpoints.export import router as export_router

app = FastAPI(title="Secure Export API")

app.include_router(export_router, prefix="/api/v1")

@app.get("/health")
async def health_check():
    return {"status": "ok"}
