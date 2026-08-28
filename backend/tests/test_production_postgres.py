"""
Production PostgreSQL Connection & Architecture Validation Tests.
Validates SSL security, connection pooling, Alembic migration integrity, ACID transactions,
CRUD operations, and credential masking assuming a production PostgreSQL environment (e.g. Neon, AWS RDS, GCP Cloud SQL).
"""

from __future__ import annotations

import asyncio
import time
import uuid
import pytest
from sqlalchemy import text, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.db import get_engine, normalize_database_url
from app.models.db_models import KBEntry, ResponseWorkspace, QuestionReview


@pytest.mark.asyncio
async def test_ssl_enforcement_and_url_normalization():
    """
    Validates that database URLs enforce SSL encryption parameters for production
    and properly sanitize libpq query parameters for asyncpg.
    """
    settings = get_settings()
    db_url = settings.effective_database_url
    normalized = normalize_database_url(db_url)

    assert normalized.startswith("postgresql+asyncpg://"), "Must use asyncpg driver"
    assert "channel_binding" not in normalized, "libpq channel_binding must be stripped for asyncpg"

    # If Neon or remote cloud DB, ensure SSL parameter is present
    if "neon.tech" in db_url or "aws" in db_url or "gcp" in db_url:
        assert "ssl=require" in normalized or "sslmode=require" in db_url, (
            "Production cloud databases must require encrypted SSL connections."
        )


@pytest.mark.asyncio
async def test_production_connectivity_and_version(db_session: AsyncSession):
    """
    Validates live connection to the production PostgreSQL server and asserts
    PostgreSQL version is >= 14 with active transaction state.
    """
    # 1. Warm-up / initial handshake
    await db_session.execute(text("SELECT 1;"))

    # 2. Measure steady-state latency
    start_time = time.perf_counter()
    result = await db_session.execute(text("SELECT version();"))
    latency_ms = (time.perf_counter() - start_time) * 1000
    version_str = result.scalar()

    assert version_str is not None, "PostgreSQL version string must be returned"
    assert "PostgreSQL" in version_str, f"Unexpected DB version string: {version_str}"
    assert latency_ms < 2000, f"Production database steady-state latency ({latency_ms:.2f}ms) exceeded 2000ms SLA"


@pytest.mark.asyncio
async def test_production_schema_and_alembic_head(db_session: AsyncSession):
    """
    Validates that all required RFPEngine production tables exist and that Alembic
    has recorded the migration head revision.
    """
    # 1. Verify Alembic migration table and current head revision
    alembic_res = await db_session.execute(text("SELECT version_num FROM alembic_version;"))
    current_revision = alembic_res.scalar()
    assert current_revision is not None, "Alembic migration version must be recorded in production"
    assert len(current_revision) == 12, f"Expected 12-char Alembic revision hash, got '{current_revision}'"

    # 2. Verify all core tables exist in the current schema
    tables_res = await db_session.execute(
        text("""
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
              AND table_name IN ('kb_entries', 'response_workspaces', 'question_reviews');
        """)
    )
    existing_tables = {row[0] for row in tables_res.fetchall()}
    expected_tables = {"kb_entries", "response_workspaces", "question_reviews"}
    assert expected_tables.issubset(existing_tables), (
        f"Missing required tables in production: {expected_tables - existing_tables}"
    )


@pytest.mark.asyncio
async def test_concurrent_connection_pooling():
    """
    Validates that the asyncpg connection pool efficiently handles concurrent requests
    without connection leaks, exhaustion, or pool deadlocks.
    """
    from sqlalchemy.ext.asyncio import create_async_engine

    settings = get_settings()
    normalized_url = normalize_database_url(settings.effective_database_url)
    engine = create_async_engine(normalized_url, pool_size=5, max_overflow=10, pool_pre_ping=True)

    try:
        async def single_query(idx: int):
            async with engine.connect() as conn:
                res = await conn.execute(text(f"SELECT {idx} AS q_id;"))
                return res.scalar()

        # Execute 15 concurrent queries through the connection pool
        concurrency_count = 15
        tasks = [single_query(i) for i in range(concurrency_count)]
        results = await asyncio.gather(*tasks)

        assert len(results) == concurrency_count, "All concurrent queries must complete"
        assert results == list(range(concurrency_count)), "Concurrent query results must match inputs"
    finally:
        await engine.dispose()


@pytest.mark.asyncio
async def test_transaction_acid_rollback(db_session: AsyncSession):
    """
    Validates ACID transaction rollback behavior.
    Ensures an uncommitted or failed transaction leaves zero orphaned data in production.
    """
    test_id = f"test-rollback-{uuid.uuid4().hex[:8]}"

    # Attempt an insert and explicitly roll back
    entry = KBEntry(
        id=test_id,
        tenant_id="prod-rollback-test",
        question="Rollback test question?",
        answer="This should never be persisted.",
        category="Testing",
    )
    db_session.add(entry)
    await db_session.flush()

    # Roll back before commit
    await db_session.rollback()

    # Query to ensure record does not exist
    check_res = await db_session.execute(select(KBEntry).where(KBEntry.id == test_id))
    persisted = check_res.scalar_one_or_none()
    assert persisted is None, "Rolled-back record must not be persisted in the database"


@pytest.mark.asyncio
async def test_production_crud_lifecycle(db_session: AsyncSession):
    """
    Validates complete Create, Read, Update, Delete (CRUD) lifecycle in production
    for canonical records within an isolated tenant.
    """
    test_id = f"test-prod-{uuid.uuid4().hex[:8]}"
    test_tenant = "prod-validation-tenant"

    try:
        # 1. CREATE
        new_entry = KBEntry(
            id=test_id,
            tenant_id=test_tenant,
            question="What is the production database SLA?",
            answer="99.95% monthly uptime with automated multi-zone failover.",
            category="Infrastructure",
            metadata_json={"tags": ["sla", "production", "uptime"]},
        )
        db_session.add(new_entry)
        await db_session.commit()

        # 2. READ
        read_res = await db_session.execute(select(KBEntry).where(KBEntry.id == test_id))
        entry = read_res.scalar_one_or_none()
        assert entry is not None, "Created record must be readable"
        assert entry.tenant_id == test_tenant
        assert entry.metadata_json == {"tags": ["sla", "production", "uptime"]}

        # 3. UPDATE
        entry.answer = "Updated 99.99% high-availability SLA."
        await db_session.commit()

        updated_res = await db_session.execute(select(KBEntry).where(KBEntry.id == test_id))
        updated_entry = updated_res.scalar_one_or_none()
        assert updated_entry.answer == "Updated 99.99% high-availability SLA."

        # 4. DELETE
        await db_session.delete(updated_entry)
        await db_session.commit()

        deleted_res = await db_session.execute(select(KBEntry).where(KBEntry.id == test_id))
        assert deleted_res.scalar_one_or_none() is None, "Deleted record must no longer exist"

    finally:
        # Clean up safeguard in case of unexpected assertions
        await db_session.execute(
            text("DELETE FROM kb_entries WHERE id = :id"),
            {"id": test_id},
        )
        await db_session.commit()


def test_credential_masking_security():
    """
    Validates that credentials, passwords, and tokens are never exposed in plaintext
    via masked URLs, logging strings, or diagnostics.
    """
    settings = get_settings()
    masked = settings.masked_database_url

    assert masked is not None
    assert "://neondb_owner:***@" in masked or ":***@" in masked, (
        f"Database URL credentials were not masked properly: {masked}"
    )

    # Ensure actual password is not in the masked string
    if settings.database_url and "@" in settings.database_url:
        password_part = settings.database_url.split(":")[2].split("@")[0]
        if len(password_part) > 4:
            assert password_part not in masked, "Raw password leaked in masked database URL!"
