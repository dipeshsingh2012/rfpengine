from __future__ import annotations

import time
from fastapi import APIRouter, Depends, Request
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.db import get_db_session
from app.models.schemas import HealthResponse, HealthServiceStatus

router = APIRouter(tags=["Health"])


@router.get("/health", response_model=HealthResponse)
async def health_check(
    request: Request,
    db: AsyncSession = Depends(get_db_session),
) -> HealthResponse:
    settings = get_settings()
    services = {}

    # 1. PostgreSQL check
    pg_start = time.perf_counter()
    try:
        await db.execute(text("SELECT 1"))
        pg_latency = (time.perf_counter() - pg_start) * 1000
        services["postgresql"] = HealthServiceStatus(
            status="ok",
            latency_ms=round(pg_latency, 2),
            details="Connected to PostgreSQL database",
        )
    except Exception as exc:
        services["postgresql"] = HealthServiceStatus(
            status="error",
            details=f"PostgreSQL connection failed: {type(exc).__name__}",
        )

    # 2. Elasticsearch check
    es_service = getattr(request.app.state, "elasticsearch", None)
    if es_service:
        es_start = time.perf_counter()
        es_status = await es_service.health_check()
        es_latency = (time.perf_counter() - es_start) * 1000
        services["elasticsearch"] = HealthServiceStatus(
            status=es_status.get("status", "unknown"),
            latency_ms=round(es_latency, 2) if es_status.get("status") == "ok" else None,
            details=str(es_status.get("details") or f"ES Version: {es_status.get('version')}"),
        )
    else:
        services["elasticsearch"] = HealthServiceStatus(
            status="uninitialized",
            details="Elasticsearch service is not initialized",
        )

    # 3. Pinecone check
    pinecone_service = getattr(request.app.state, "pinecone", None)
    if pinecone_service:
        pc_start = time.perf_counter()
        pc_status = await pinecone_service.health_check()
        pc_latency = (time.perf_counter() - pc_start) * 1000
        services["pinecone"] = HealthServiceStatus(
            status=pc_status.get("status", "unknown"),
            latency_ms=round(pc_latency, 2) if pc_status.get("status") == "ok" else None,
            details=str(pc_status.get("details") or f"Target index: {pc_status.get('target_index')}"),
        )
    else:
        services["pinecone"] = HealthServiceStatus(
            status="unconfigured",
            details="Pinecone service is not configured",
        )

    # 4. GCP Secret Manager check
    gcp_secret_service = getattr(request.app.state, "gcp_secrets", None)
    if gcp_secret_service and gcp_secret_service.is_configured():
        gcp_start = time.perf_counter()
        gcp_status = await gcp_secret_service.health_check()
        gcp_latency = (time.perf_counter() - gcp_start) * 1000
        services["gcp_secret_manager"] = HealthServiceStatus(
            status=gcp_status.get("status", "unknown"),
            latency_ms=round(gcp_latency, 2) if gcp_status.get("status") == "ok" else None,
            details=str(gcp_status.get("details")),
        )
    elif settings.gcp_secret_manager_enabled:
        services["gcp_secret_manager"] = HealthServiceStatus(
            status="unconfigured",
            details="GCP_PROJECT_ID is not set in environment",
        )
    else:
        services["gcp_secret_manager"] = HealthServiceStatus(
            status="disabled",
            details="GCP_SECRET_MANAGER_ENABLED is false (using environment variables)",
        )

    # 5. OpenAI check
    if settings.openai_api_key:
        services["openai"] = HealthServiceStatus(
            status="configured",
            details=f"Embedding model: {settings.openai_embedding_model}, Chat model: {settings.openai_chat_model}",
        )
    else:
        services["openai"] = HealthServiceStatus(
            status="unconfigured",
            details="OPENAI_API_KEY is not set (demo mode enabled)",
        )

    overall_status = "ok"
    if any(s.status == "error" for s in services.values()):
        overall_status = "degraded"

    return HealthResponse(
        status=overall_status,
        version=settings.app_version,
        services=services,
    )
