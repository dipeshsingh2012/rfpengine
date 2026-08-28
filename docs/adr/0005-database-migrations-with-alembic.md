# ADR 0005: Database Migrations with Alembic

* **Status**: Accepted
* **Date**: 2026-08-28
* **Deciders**: Engineering Team

## Context

As RFPEngine evolves, the PostgreSQL relational schema (`kb_entries`, `response_workspaces`, `question_reviews`, and future tables such as users, organizations, custom tagging, and audit logs) will undergo iterative modifications.

Relying on automatic `create_all()` runtime table creation has key limitations:
1. `create_all()` does not modify existing tables (e.g. adding columns, changing nullability, adding foreign keys or indexes).
2. Production deployments require traceable, version-controlled, and repeatable schema migration scripts with rollback capability.
3. In cloud and managed environments (e.g., Neon, Supabase, RDS), migrations should run as isolated tasks before application startup.
4. When sharing a database with other services, migrations must be scoped so they only manage RFPEngine tables.

## Decision

We adopt **Alembic** for managing asynchronous database migrations:
1. **Async Engine Integration**: Configured `alembic/env.py` to use SQLAlchemy async engine (`asyncpg`) and dynamically read normalized connection URLs from application settings (`get_settings().effective_database_url`).
2. **Schema Isolation Filter**: Configured `include_object` in `env.py` to strictly isolate RFPEngine tables (`kb_entries`, `response_workspaces`, `question_reviews`) so Alembic never interferes with unrelated tables in shared database instances.
3. **Versioned Revisions**: Stored in `backend/alembic/versions/` with autogenerate capabilities against `Base.metadata`.
4. **Commands**:
   - Apply pending migrations: `npm run db:migrate` or `alembic upgrade head`
   - Generate a new migration: `npm run db:revision -m "description"` or `alembic revision --autogenerate -m "..."`

## Consequences

### Positive
- Predictable, version-controlled schema evolution across development, staging, and production environments.
- Safe execution in multi-tenant or shared cloud database instances (e.g., Neon).
- Supports forward migrations and downgrades.

### Negative / Trade-offs
- Developers must generate and commit migration revisions whenever modifying SQLAlchemy models in `db_models.py`.
