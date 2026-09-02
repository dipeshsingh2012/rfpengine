from typing import Any, AsyncGenerator, Dict, Iterator, List, Optional
from fastapi import FastAPI
from app.api.v1.endpoints.auth import router as auth_router

app = FastAPI(title="Autonomous Agentic Fleet API")

app.include_router(auth_router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(auth_router, prefix="/auth", tags=["auth"])


@app.get("/healthz")
def health_check() -> Dict[str, str]:
    return {"status": "ok"}
