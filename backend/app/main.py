from fastapi import FastAPI
from app.api.v1.endpoints import auth

app = FastAPI(title="Auth API")

app.include_router(auth.router, prefix="/auth", tags=["auth"])

@app.get("/health")
async def health_check():
    return {"status": "ok"}
