#!/usr/bin/env python3
"""
Sync all canonical roadmap initiatives directly into PostgreSQL.
Makes PostgreSQL the authoritative single source of truth.
"""
import asyncio
import sys
from pathlib import Path

# Ensure backend root is in sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.pool import NullPool

from app.core.config import get_settings
from app.core.db import Base, normalize_database_url
from app.services.postgres_service import PostgresService, DEFAULT_SEEDS


async def main():
    settings = get_settings()
    db_url = normalize_database_url(settings.effective_database_url)
    print(f"Connecting to PostgreSQL database: {db_url.split('@')[-1]}...")

    engine = create_async_engine(db_url, poolclass=NullPool)
    session_factory = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with session_factory() as session:
        print(f"Syncing {len(DEFAULT_SEEDS)} canonical roadmap initiatives to PostgreSQL...")
        synced_count = await PostgresService.sync_roadmap_seeds(session, tenant_id="default")
        print(f"Successfully synced {synced_count} roadmap initiatives to PostgreSQL!")

        # Verify count
        all_items = await PostgresService.list_roadmap_initiatives(session, tenant_id="default")
        print(f"\nVerification: {len(all_items)} initiatives currently active in PostgreSQL:")
        for item in sorted(all_items, key=lambda x: (x.stage, -x.rice_score)):
            print(f"  [{item.stage.upper():11s}] ({item.priority}) {item.id:32s} - {item.title[:45]}")

    await engine.dispose()
    print("\nRoadmap synchronization completed successfully.")


if __name__ == "__main__":
    asyncio.run(main())
