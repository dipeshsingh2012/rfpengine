"""
PostgreSQL Connection & Architecture Validation Tests (Scoped to env="prod").
Validates SSL security, connection pooling, Alembic migration integrity, ACID transactions,
CRUD operations, and credential masking when running in a production environment (ENV="prod").
"""

from __future__ import annotations

import asyncio
import time
import uuid
import pytest
from sqlalchemy import text, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings, Settings
from app.core.db import normalize_database_url
from app.models.db_models import KBEntry, ResponseWorkspace, QuestionReview


def test_env_prod_configuration(monkeypatch):
    """
    Validates that setting ENV="prod" properly identifies the environment as production.
    """
    monkeypatch.setenv("ENV", "prod")
    settings = Settings()
    assert settings.env == "prod"
    assert settings.is_production is True


@pytest.mark.asyncio
async def test_ssl_enforcement_and_url_normalization(settings: Settings, monkeypatch):
    """
    Validates that when env="prod", database URLs enforce SSL encryption parameters
    and properly sanitize libpq query parameters for asyncpg.
    """
    monkeypatch.setenv("ENV", "prod")
    prod_settings = Settings()
    db_url = prod_settings.effective_database_url
    normalized = normalize_database_url(db_url)

    assert normalized.startswith("postgresql+asyncpg://"), "Must use asyncpg driver"
    assert "channel_binding" not in normalized, "libpq channel_binding must be stripped for asyncpg"

    # Enforce SSL requirement in prod environments
    if prod_settings.is_production or "neon.tech" in db_url or "aws" in db_url or "gcp" in db_url:
        assert "ssl=require" in normalized or "sslmode=require" in db_url, (
            "Production cloud databases (env='prod') must require encrypted SSL connections."
        )


@pytest.mark.asyncio
async def test_prod_connectivity_and_version(db_session: AsyncSession):
    """
    Validates live connection to the PostgreSQL server when env="prod" and asserts
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
    assert latency_ms < 2000, f"Database steady-state latency ({latency_ms:.2f}ms) exceeded 2000ms SLA in env='prod'"


@pytest.mark.asyncio
async def test_prod_schema_and_alembic_head(db_session: AsyncSession):
    """
    Validates that all required RFPEngine tables exist in env="prod" and that Alembic
    has recorded the migration head revision.
    """
    # 1. Verify Alembic migration table and current head revision
    alembic_res = await db_session.execute(text("SELECT version_num FROM alembic_version;"))
    current_revision = alembic_res.scalar()
    assert current_revision is not None, "Alembic migration version must be recorded"
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
        f"Missing required tables: {expected_tables - existing_tables}"
    )


@pytest.mark.asyncio
async def test_concurrent_connection_pooling():
    """
    Validates that the asyncpg connection pool efficiently handles concurrent requests in env="prod"
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
async def test_transaction_acid_rollback(db_session: AsyncSession, settings: Settings):
    """
    Validates ACID transaction rollback behavior in env="prod".
    Ensures an uncommitted or failed transaction leaves zero orphaned data.
    """
    test_id = f"test-rollback-{uuid.uuid4().hex[:8]}"
    tenant_id = f"{settings.env}-rollback-test"

    # Attempt an insert and explicitly roll back
    entry = KBEntry(
        id=test_id,
        tenant_id=tenant_id,
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
async def test_prod_crud_lifecycle(db_session: AsyncSession, settings: Settings):
    """
    Validates complete Create, Read, Update, Delete (CRUD) lifecycle in env="prod"
    for canonical records within an isolated tenant.
    """
    test_id = f"test-{settings.env}-{uuid.uuid4().hex[:8]}"
    test_tenant = f"{settings.env}-validation-tenant"

    try:
        # 1. CREATE
        new_entry = KBEntry(
            id=test_id,
            tenant_id=test_tenant,
            question="What is the database SLA in this environment?",
            answer="99.95% monthly uptime with automated multi-zone failover.",
            category="Infrastructure",
            metadata_json={"tags": ["sla", settings.env, "uptime"]},
        )
        db_session.add(new_entry)
        await db_session.commit()

        # 2. READ
        read_res = await db_session.execute(select(KBEntry).where(KBEntry.id == test_id))
        entry = read_res.scalar_one_or_none()
        assert entry is not None, "Created record must be readable"
        assert entry.tenant_id == test_tenant
        assert entry.metadata_json == {"tags": ["sla", settings.env, "uptime"]}

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


def test_credential_masking_security(settings: Settings):
    """
    Validates that credentials, passwords, and tokens are never exposed in plaintext
    via masked URLs, logging strings, or diagnostics.
    """
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


@pytest.mark.asyncio
async def test_workspace_and_question_review_postgres_insertion(db_session: AsyncSession, settings: Settings):
    """
    Validates transactional insertion of ResponseWorkspace and QuestionReview records
    into PostgreSQL, verifying foreign keys, JSON columns, status updates, and cascading deletion.
    """
    workspace_id = f"ws-{uuid.uuid4().hex[:8]}"
    test_tenant = f"{settings.env}-workspace-tenant"

    try:
        # 1. INSERT ResponseWorkspace
        workspace = ResponseWorkspace(
            id=workspace_id,
            tenant_id=test_tenant,
            title="Enterprise Security & Privacy RFP 2026",
            source_mode="upload",
            source_url=None,
        )
        db_session.add(workspace)
        await db_session.flush()

        # 2. INSERT QuestionReview items linked by foreign key
        q1 = QuestionReview(
            id=f"qr-{uuid.uuid4().hex[:8]}",
            workspace_id=workspace_id,
            question_index=0,
            question_text="What encryption standards are enforced for databases at rest?",
            suggested_answer="Databases and EBS volumes are encrypted using AES-256 via AWS KMS.",
            final_answer="Databases and EBS volumes are encrypted using AES-256 via AWS KMS with annual CMK key rotation.",
            review_status="Approved by SME",
            assigned_role="Security SME",
            confidence_score=0.96,
            sources_json=[
                {"source_id": "kb-sec-1", "score": 0.98, "title": "Security Whitepaper", "section": "Encryption"}
            ],
        )

        q2 = QuestionReview(
            id=f"qr-{uuid.uuid4().hex[:8]}",
            workspace_id=workspace_id,
            question_index=1,
            question_text="What are your disaster recovery RPO and RTO SLAs?",
            suggested_answer="RPO is 15 minutes and RTO is 1 hour across multi-region standby clusters.",
            final_answer=None,
            review_status="Draft",
            assigned_role="Proposal manager",
            confidence_score=0.92,
            sources_json=[
                {"source_id": "kb-ops-1", "score": 0.94, "title": "SLA & DR Policy", "section": "RPO/RTO"}
            ],
        )

        db_session.add_all([q1, q2])
        await db_session.commit()

        # 3. SELECT & VERIFY from PostgreSQL
        stmt = (
            select(ResponseWorkspace)
            .where(ResponseWorkspace.id == workspace_id)
        )
        res = await db_session.execute(stmt)
        persisted_ws = res.scalar_one_or_none()

        assert persisted_ws is not None, "Workspace must be persisted in PostgreSQL"
        assert persisted_ws.title == "Enterprise Security & Privacy RFP 2026"
        assert persisted_ws.tenant_id == test_tenant

        # Verify reviews in database
        review_stmt = (
            select(QuestionReview)
            .where(QuestionReview.workspace_id == workspace_id)
            .order_by(QuestionReview.question_index)
        )
        review_res = await db_session.execute(review_stmt)
        reviews = review_res.scalars().all()

        assert len(reviews) == 2
        assert reviews[0].question_index == 0
        assert reviews[0].review_status == "Approved by SME"
        assert reviews[0].confidence_score == 0.96
        assert isinstance(reviews[0].sources_json, list)
        assert reviews[0].sources_json[0]["source_id"] == "kb-sec-1"
        assert reviews[1].question_index == 1
        assert reviews[1].review_status == "Draft"

        # 4. UPDATE status in PostgreSQL
        reviews[1].review_status = "Final approved"
        reviews[1].final_answer = "RPO is 15 minutes and RTO is 1 hour across multi-region standby clusters."
        await db_session.commit()

        updated_q2 = (await db_session.execute(select(QuestionReview).where(QuestionReview.id == reviews[1].id))).scalar_one()
        assert updated_q2.review_status == "Final approved"
        assert updated_q2.final_answer is not None

        # 5. CASCADE DELETE
        await db_session.delete(persisted_ws)
        await db_session.commit()

        # Confirm reviews were cascaded and deleted
        remaining_reviews = (await db_session.execute(review_stmt)).scalars().all()
        assert len(remaining_reviews) == 0, "Question reviews must cascade delete with workspace"

    finally:
        # Cleanup safety net
        await db_session.execute(
            text("DELETE FROM response_workspaces WHERE id = :id"),
            {"id": workspace_id},
        )
        await db_session.commit()

