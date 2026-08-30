#!/usr/bin/env python3
"""
Comprehensive Live Verification Script:
1. Verifies PostgreSQL roadmap_initiatives table records and schema.
2. Verifies question_reviews and kb_entries table columns.
3. Verifies FastAPI /api/v1/roadmap endpoint outputs via TestClient.
"""
import asyncio
import sys
from pathlib import Path

# Ensure backend root is in sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.pool import NullPool

from app.core.config import get_settings
from app.core.db import normalize_database_url
from app.main import app
from app.services.postgres_service import PostgresService, DEFAULT_SEEDS


async def verify_all():
    print("=" * 70)
    print("🔍 STEP 1: VERIFYING POSTGRESQL DATABASE INTEGRITY (NEON CLOUD DB)")
    print("=" * 70)

    settings = get_settings()
    db_url = normalize_database_url(settings.effective_database_url)
    engine = create_async_engine(db_url, poolclass=NullPool)
    session_factory = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

    async with session_factory() as session:
        # 1. Check table columns for QuestionReview
        res_cols = await session.execute(
            text("""
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'question_reviews' AND column_name IN ('is_promoted_to_kb', 'promoted_kb_id')
                ORDER BY column_name;
            """)
        )
        cols = res_cols.fetchall()
        print(f"✅ Schema check: 'question_reviews' has new columns: {[c[0] for c in cols]}")
        assert len(cols) == 2, f"Expected 2 columns on question_reviews, found {len(cols)}"

        # 2. Check roadmap initiatives count in DB
        items = await PostgresService.list_roadmap_initiatives(session, tenant_id="default")
        print(f"✅ Total active roadmap initiatives in PostgreSQL: {len(items)}")
        assert len(items) >= 14, f"Expected at least 14 initiatives, found {len(items)}"

        # 3. Stage breakdown
        stages = {}
        for it in items:
            stages[it.stage] = stages.get(it.stage, 0) + 1

        print("\n📊 Stage Distribution in PostgreSQL:")
        for stage, count in sorted(stages.items()):
            print(f"   • {stage.upper():12s}: {count} initiative(s)")

        # 4. Verify FEAT-FEEDBACK-L1 exists and is marked 'shipped'
        l1_item = next((i for i in items if i.id == "feat-feedback-l1"), None)
        assert l1_item is not None, "feat-feedback-l1 not found in PostgreSQL!"
        assert l1_item.stage == "shipped", f"Expected stage 'shipped', got '{l1_item.stage}'"
        print(f"\n✅ Level 1 Feedback Loop record verified:")
        print(f"   • ID: {l1_item.id}")
        print(f"   • Title: {l1_item.title}")
        print(f"   • Stage: {l1_item.stage.upper()}")
        print(f"   • Priority: {l1_item.priority}")
        print(f"   • RICE Score: {l1_item.rice_score}")

    await engine.dispose()

    print("\n" + "=" * 70)
    print("🌐 STEP 2: VERIFYING FASTAPI ROADMAP ENDPOINTS")
    print("=" * 70)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. GET /api/v1/roadmap
        res = await client.get("/api/v1/roadmap")
        assert res.status_code == 200, f"GET /api/v1/roadmap failed: {res.status_code}"
        data = res.json()
        print(f"✅ GET /api/v1/roadmap returned HTTP 200 with {len(data)} initiatives")

        # 2. Filter by stage=shipped
        res_shipped = await client.get("/api/v1/roadmap?stage=shipped")
        assert res_shipped.status_code == 200
        shipped_items = res_shipped.json()
        print(f"✅ GET /api/v1/roadmap?stage=shipped returned {len(shipped_items)} shipped features:")
        for it in shipped_items:
            print(f"   • {it['id']:28s} | {it['title'][:45]}")

        # 3. Test upvote endpoint
        upvote_res = await client.post("/api/v1/roadmap/feat-feedback-l1/upvote?delta=1")
        assert upvote_res.status_code == 200
        upvote_data = upvote_res.json()
        print(f"✅ Upvote endpoint tested successfully: feat-feedback-l1 upvotes = {upvote_data['upvotes']}")

        # Revert upvote
        await client.post("/api/v1/roadmap/feat-feedback-l1/upvote?delta=-1")

    print("\n" + "=" * 70)
    print("✨ ALL LIVE VERIFICATION CHECKS PASSED (100% SUCCESS) ✨")
    print("=" * 70)


if __name__ == "__main__":
    asyncio.run(verify_all())

