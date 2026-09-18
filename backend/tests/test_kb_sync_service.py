import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.models.schemas import KBSourceCreate, KBSourceUpdate
from app.services.kb_sync_service import CleanHTMLToMarkdownParser, KBSyncService, kb_sync_service


def test_clean_html_parser():
    raw_html = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Enterprise Security Whitepaper</title>
        <style>body { color: red; }</style>
        <script>console.log("tracking");</script>
    </head>
    <body>
        <nav><a href="/home">Home</a><a href="/login">Login</a></nav>
        <header>Header Banner</header>
        <main>
            <h1>SOC 2 Type II Certification</h1>
            <p>Acme Corporation maintains rigorous SOC 2 Type II controls across all infrastructure.</p>
            <h2>Data Encryption</h2>
            <p>All customer data is encrypted at rest using AES-256 and in transit using TLS 1.3.</p>
        </main>
        <footer>Copyright 2026 Acme Corp. All rights reserved.</footer>
    </body>
    </html>
    """
    parser = CleanHTMLToMarkdownParser()
    parser.feed(raw_html)
    title, clean_text = parser.get_clean_text()

    assert title == "Enterprise Security Whitepaper"
    assert "tracking" not in clean_text
    assert "Header Banner" not in clean_text
    assert "Copyright 2026" not in clean_text
    assert "# SOC 2 Type II Certification" in clean_text
    assert "AES-256" in clean_text
    assert "TLS 1.3" in clean_text


def test_chunk_text_boundaries():
    service = KBSyncService()
    sample_text = (
        "Paragraph one about security controls and operational compliance.\n\n"
        "Paragraph two detailing access management and multi-factor authentication policies.\n\n"
        "Paragraph three explaining incident response protocols and 24-hour customer notification SLAs."
    )
    chunks = service._chunk_text(sample_text, chunk_size=120, overlap=20)
    assert len(chunks) >= 2
    for chunk in chunks:
        assert len(chunk) > 0


@pytest.mark.asyncio
async def test_kb_source_crud_flow():
    test_service = KBSyncService()
    tenant_id = "test-sync-tenant"

    # 1. Create source
    create_payload = KBSourceCreate(
        name="Security Trust Portal",
        source_type="web_crawler",
        config={"urls": ["https://trust.example.com/security"]},
        schedule_frequency="daily",
        tenant_id=tenant_id,
    )
    created = await test_service.create_source(tenant_id, create_payload)
    assert created.id.startswith("src-")
    assert created.name == "Security Trust Portal"
    assert created.status == "idle"

    # 2. List sources
    sources = await test_service.list_sources(tenant_id)
    assert len(sources) == 1
    assert sources[0].id == created.id

    # 3. Get source
    fetched = await test_service.get_source(tenant_id, created.id)
    assert fetched is not None
    assert fetched.name == "Security Trust Portal"

    # 4. Update source
    updated = await test_service.update_source(
        tenant_id, created.id, KBSourceUpdate(name="Updated Trust Portal", schedule_frequency="hourly")
    )
    assert updated.name == "Updated Trust Portal"
    assert updated.schedule_frequency == "hourly"

    # 5. Delete source
    deleted = await test_service.delete_source(tenant_id, created.id, prune_chunks=False)
    assert deleted is True
    assert await test_service.get_source(tenant_id, created.id) is None


@pytest.mark.asyncio
async def test_web_crawler_connector_execution():
    test_service = KBSyncService()
    source_id = "src-test-crawler"
    tenant_id = "test-tenant"

    mock_html = """
    <html>
    <head><title>Cloud SLA & Disaster Recovery</title></head>
    <body>
        <h1>Disaster Recovery Guidelines</h1>
        <p>Our Recovery Time Objective (RTO) is 4 hours and Recovery Point Objective (RPO) is 15 minutes.</p>
    </body>
    </html>
    """

    with patch("httpx.AsyncClient.get") as mock_get:
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.text = mock_html
        mock_get.return_value = mock_resp

        entries, docs_scanned = await test_service._crawl_web_source(
            config={"url": "https://example.com/sla", "category": "SLA & Operations"},
            tenant_id=tenant_id,
            source_id=source_id,
        )

        assert docs_scanned == 1
        assert len(entries) >= 1
        first_entry = entries[0]
        assert "Cloud SLA & Disaster Recovery" in first_entry.title
        assert "Recovery Time Objective" in first_entry.content
        assert first_entry.category == "SLA & Operations"
        assert first_entry.metadata["source_id"] == source_id
        assert first_entry.metadata["source_type"] == "web_crawler"


@pytest.mark.asyncio
async def test_delta_sync_calculation():
    test_service = KBSyncService()
    from app.models.schemas import KBEntryCreate

    entries = [
        KBEntryCreate(
            id="entry-1",
            tenant_id="tenant-a",
            title="Policy A",
            content="Content A",
            category="Security",
            metadata={"source_id": "src-delta"},
        ),
        KBEntryCreate(
            id="entry-2",
            tenant_id="tenant-a",
            title="Policy B",
            content="Content B",
            category="Security",
            metadata={"source_id": "src-delta"},
        ),
    ]

    # Run delta sync without DB connection (memory only)
    created, updated, pruned = await test_service._apply_delta_sync(
        tenant_id="tenant-a",
        source_id="src-delta",
        entries=entries,
    )
    assert created == 2
    assert updated == 0
    assert pruned == 0


@pytest.mark.asyncio
async def test_knowledge_base_sources_api_endpoints():
    from app.core.db import get_db_session

    async def mock_get_db():
        yield None

    app.dependency_overrides[get_db_session] = mock_get_db
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            # 1. Create source via API
            create_res = await ac.post(
                "/api/v1/knowledge-base/sources",
                json={
                    "name": "API Test Trust Center",
                    "source_type": "web_crawler",
                    "config": {"urls": ["https://trust.acme.corp"]},
                    "schedule_frequency": "daily",
                    "tenant_id": "acme-test-tenant",
                },
            )
            assert create_res.status_code == 201
            data = create_res.json()
            source_id = data["id"]
            assert data["name"] == "API Test Trust Center"

            # 2. List sources via API
            list_res = await ac.get(
                "/api/v1/knowledge-base/sources",
                params={"tenant_id": "acme-test-tenant"},
            )
            assert list_res.status_code == 200
            sources_list = list_res.json()
            assert any(s["id"] == source_id for s in sources_list)

            # 3. Get source
            get_res = await ac.get(
                f"/api/v1/knowledge-base/sources/{source_id}",
                params={"tenant_id": "acme-test-tenant"},
            )
            assert get_res.status_code == 200
            assert get_res.json()["id"] == source_id

            # 4. Update source
            put_res = await ac.put(
                f"/api/v1/knowledge-base/sources/{source_id}",
                params={"tenant_id": "acme-test-tenant"},
                json={"schedule_frequency": "weekly"},
            )
            assert put_res.status_code == 200
            assert put_res.json()["schedule_frequency"] == "weekly"

            # 5. Webhook trigger
            webhook_res = await ac.post(
                f"/api/v1/knowledge-base/sources/{source_id}/webhook",
                params={"tenant_id": "acme-test-tenant"},
            )
            assert webhook_res.status_code == 200
            assert webhook_res.json()["status"] == "triggered"

            # 6. Delete source
            del_res = await ac.delete(
                f"/api/v1/knowledge-base/sources/{source_id}",
                params={"tenant_id": "acme-test-tenant", "prune_chunks": False},
            )
            assert del_res.status_code == 204
    finally:
        app.dependency_overrides.clear()


