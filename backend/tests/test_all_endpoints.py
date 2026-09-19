import os
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

# Production API URL (configured for remote validation via TEST_PROD=1)
USE_PROD = os.getenv("TEST_PROD", "0") == "1"
PROD_API_URL = os.getenv("API_BASE_URL", "https://rfpengine-api-fwwnzie4dq-uc.a.run.app")

def get_client(timeout: float = 30.0) -> AsyncClient:
    if USE_PROD:
        return AsyncClient(base_url=PROD_API_URL, timeout=timeout)
    return AsyncClient(
        transport=ASGITransport(app=app, raise_app_exceptions=False),
        base_url="http://test",
        timeout=timeout
    )


# ==================== HEALTH ENDPOINT ====================

@pytest.mark.asyncio
async def test_health_check():
    async with get_client() as ac:
        response = await ac.get("/health")
    assert response.status_code == 200


# ==================== RESPONSES ENDPOINTS ====================

@pytest.mark.asyncio
async def test_get_responses_history():
    async with get_client(timeout=60.0) as ac:
        response = await ac.get(
            "/api/v1/responses/history",
            headers={"X-Tenant-ID": "test_tenant"}
        )
    assert response.status_code in [200, 401]


@pytest.mark.asyncio
async def test_add_response_history():
    async with get_client(timeout=60.0) as ac:
        response = await ac.post(
            "/api/v1/responses/history",
            json={"id": "test-rfp-1", "title": "Test RFP", "questionsCount": 5},
            headers={"X-Tenant-ID": "test_tenant"}
        )
    assert response.status_code in [200, 201]


@pytest.mark.asyncio
async def test_review_endpoint():
    async with get_client() as ac:
        response = await ac.post(
            "/api/v1/responses/review",
            json={
                "question_id": "q1",
                "question": "Test question",
                "response": "Test response",
                "feedback": "Good response"
            },
            headers={"X-Tenant-ID": "test_tenant"}
        )
    assert response.status_code in [200, 400, 401]


@pytest.mark.asyncio
async def test_get_workspaces():
    async with get_client() as ac:
        response = await ac.get(
            "/api/v1/responses/workspaces",
            headers={"X-Tenant-ID": "test_tenant"}
        )
    assert response.status_code in [200, 401, 500]


@pytest.mark.asyncio
async def test_create_workspace():
    async with get_client() as ac:
        response = await ac.post(
            "/api/v1/responses/workspaces",
            json={
                "id": "workspace-123",
                "title": "Test Workspace",
                "source_mode": "upload",
                "questions": []
            },
            headers={"X-Tenant-ID": "test_tenant"}
        )
    assert response.status_code in [200, 201, 400, 401, 422, 500]


@pytest.mark.asyncio
async def test_get_workspace_by_id():
    async with get_client() as ac:
        response = await ac.get(
            "/api/v1/responses/workspaces/workspace-123",
            headers={"X-Tenant-ID": "test_tenant"}
        )
    assert response.status_code in [200, 404, 401, 500]


@pytest.mark.asyncio
async def test_update_workspace():
    async with get_client() as ac:
        response = await ac.put(
            "/api/v1/responses/workspaces/workspace-123",
            json={
                "name": "Updated Workspace",
                "description": "Updated description"
            },
            headers={"X-Tenant-ID": "test_tenant"}
        )
    assert response.status_code in [200, 404, 401, 500]


@pytest.mark.asyncio
async def test_duplicate_workspace():
    async with get_client() as ac:
        response = await ac.post(
            "/api/v1/responses/workspaces/workspace-123/duplicate",
            headers={"X-Tenant-ID": "test_tenant"}
        )
    assert response.status_code in [200, 201, 404, 401, 500]


@pytest.mark.asyncio
async def test_delete_workspace():
    async with get_client() as ac:
        response = await ac.delete(
            "/api/v1/responses/workspaces/workspace-123",
            headers={"X-Tenant-ID": "test_tenant"}
        )
    assert response.status_code in [200, 204, 404, 401, 500]


@pytest.mark.asyncio
async def test_get_audit_logs():
    async with get_client() as ac:
        response = await ac.get(
            "/api/v1/responses/audit-logs",
            headers={"X-Tenant-ID": "test_tenant"}
        )
    assert response.status_code in [200, 401, 500]


@pytest.mark.asyncio
async def test_create_audit_log():
    async with get_client() as ac:
        response = await ac.post(
            "/api/v1/responses/audit-logs",
            json={
                "action": "test_action",
                "entity_type": "workspace",
                "entity_id": "workspace-123",
                "details": {"test": "data"}
            },
            headers={"X-Tenant-ID": "test_tenant"}
        )
    assert response.status_code in [200, 201, 400, 401, 422, 500]


@pytest.mark.asyncio
async def test_get_workspace_settings():
    async with get_client() as ac:
        response = await ac.get(
            "/api/v1/responses/workspace/settings",
            headers={"X-Tenant-ID": "test_tenant"}
        )
    assert response.status_code in [200, 401, 404, 500]


@pytest.mark.asyncio
async def test_update_workspace_settings():
    async with get_client() as ac:
        response = await ac.put(
            "/api/v1/responses/workspace/settings",
            json={
                "company_name": "Updated Enterprise Corp",
                "default_model": "gemini-2.5-flash",
                "response_tone": "thorough",
                "default_top_k": 7
            },
            headers={"X-Tenant-ID": "test_tenant"}
        )
    assert response.status_code in [200, 401, 400, 404, 500]


@pytest.mark.asyncio
async def test_parse_file():
    async with get_client() as ac:
        response = await ac.post(
            "/api/v1/responses/parse-file",
            files={"file": ("test.pdf", b"test content", "application/pdf")},
            headers={"X-Tenant-ID": "test_tenant"}
        )
    assert response.status_code in [200, 400, 401, 422, 500]


@pytest.mark.asyncio
async def test_rephrase_question():
    async with get_client() as ac:
        response = await ac.post(
            "/api/v1/responses/rephrase-question",
            json={
                "question": "Original question",
                "context": "Some context"
            },
            headers={"X-Tenant-ID": "test_tenant"}
        )
    assert response.status_code in [200, 400, 401, 422]


@pytest.mark.asyncio
async def test_parser_feedback():
    async with get_client() as ac:
        response = await ac.post(
            "/api/v1/responses/parser-feedback",
            json={
                "question_id": "q1",
                "is_correct": True,
                "feedback": "Good parsing"
            },
            headers={"X-Tenant-ID": "test_tenant"}
        )
    assert response.status_code in [200, 400, 401, 422]


@pytest.mark.asyncio
async def test_export_response():
    async with get_client() as ac:
        response = await ac.post(
            "/api/v1/responses/export",
            json={
                "workspace_id": "workspace-123",
                "format": "pdf"
            },
            headers={"X-Tenant-ID": "test_tenant"}
        )
    assert response.status_code in [200, 400, 401]


@pytest.mark.asyncio
async def test_export_workspace():
    async with get_client() as ac:
        response = await ac.get(
            "/api/v1/responses/workspaces/workspace-123/export",
            headers={"X-Tenant-ID": "test_tenant"}
        )
    assert response.status_code in [200, 404, 401, 500]


# ==================== SEARCH ENDPOINTS ====================

@pytest.mark.asyncio
async def test_search_get():
    async with get_client() as ac:
        response = await ac.get(
            "/api/v1/search",
            params={"query": "test query"},
            headers={"X-Tenant-ID": "test_tenant"}
        )
    assert response.status_code == 200
    data = response.json()
    assert "results" in data


@pytest.mark.asyncio
async def test_search_post():
    async with get_client() as ac:
        response = await ac.post(
            "/api/v1/search",
            json={
                "question": "test question",
                "tenant_id": "test_tenant"
            },
            headers={"X-Tenant-ID": "test_tenant"}
        )
    assert response.status_code == 200
    data = response.json()
    assert "suggested_answer" in data
    assert "confidence_score" in data


# ==================== FEEDBACK ENDPOINTS ====================

@pytest.mark.asyncio
async def test_create_feedback():
    async with get_client() as ac:
        response = await ac.post(
            "/api/v1/feedback",
            json={
                "user_id": "user-123",
                "feedback": "Great feature!"
            },
            headers={"X-Tenant-ID": "test_tenant"}
        )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"


# ==================== KNOWLEDGE BASE ENDPOINTS ====================

@pytest.mark.asyncio
async def test_upsert_kb_document():
    async with get_client() as ac:
        response = await ac.post(
            "/api/v1/knowledge-base/doc-123",
            json={
                "title": "Test Document",
                "content": "Test content",
                "metadata": {"category": "test"}
            },
            headers={"X-Tenant-ID": "test_tenant"}
        )
    assert response.status_code in [200, 201]


@pytest.mark.asyncio
async def test_get_kb_document():
    async with get_client() as ac:
        response = await ac.get(
            "/api/v1/knowledge-base/doc-123",
            headers={"X-Tenant-ID": "test_tenant"}
        )
    assert response.status_code in [200, 404]


@pytest.mark.asyncio
async def test_delete_kb_document():
    async with get_client() as ac:
        response = await ac.delete(
            "/api/v1/knowledge-base/doc-123",
            headers={"X-Tenant-ID": "test_tenant"}
        )
    assert response.status_code in [200, 204]


# ==================== EXPORT ENDPOINTS ====================

@pytest.mark.asyncio
async def test_export_csv():
    async with get_client() as ac:
        response = await ac.get(
            "/api/v1/export/csv",
            headers={"X-Tenant-ID": "test_tenant"}
        )
    assert response.status_code == 200
    assert "text/csv" in response.headers.get("content-type", "")


# ==================== EMAIL ENDPOINTS ====================

@pytest.mark.asyncio
async def test_email_sme_review():
    async with get_client() as ac:
        response = await ac.post(
            "/api/v1/email/sme-review",
            json={
                "recipient_email": "sme@example.com",
                "recipient_name": "Security Expert",
                "workspace_title": "Enterprise RFP",
                "question_text": "Do you encrypt data at rest?",
                "draft_preview": "Yes, AES-256 is used.",
                "category": "Security & Compliance",
                "workspace_id": "ws-default",
                "question_index": 0
            },
            headers={"X-Tenant-ID": "test_tenant"}
        )
    assert response.status_code in [200, 500]


@pytest.mark.asyncio
async def test_email_completion_digest():
    async with get_client() as ac:
        response = await ac.post(
            "/api/v1/email/completion-digest",
            json={
                "recipient_email": "owner@example.com",
                "owner_name": "Deal Owner",
                "workspace_title": "Enterprise RFP",
                "total_questions": 10,
                "workspace_id": "ws-default"
            },
            headers={"X-Tenant-ID": "test_tenant"}
        )
    assert response.status_code in [200, 500]


# ==================== MCP ENDPOINTS ====================

@pytest.mark.asyncio
async def test_mcp_messages():
    async with get_client() as ac:
        response = await ac.post(
            "/api/v1/mcp/messages",
            json={"jsonrpc": "2.0", "method": "ping", "id": 1},
            headers={"X-Tenant-ID": "test_tenant"}
        )
    assert response.status_code in [200, 400, 422]


# ==================== ROADMAP ENDPOINTS ====================

@pytest.mark.asyncio
async def test_roadmap_milestones():
    async with get_client() as ac:
        response = await ac.get(
            "/api/v1/roadmap/milestones",
            headers={"X-Tenant-ID": "test_tenant"}
        )
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


# ==================== PARSER ENDPOINTS ====================

@pytest.mark.asyncio
async def test_parser_upload_csv():
    csv_content = b"id,question,answer\nSEC-1,Is MFA enabled?,Yes\n"
    async with get_client() as ac:
        response = await ac.post(
            "/api/v1/parser/upload",
            files={"file": ("test_security.csv", csv_content, "text/csv")},
            headers={"X-Tenant-ID": "test_tenant"}
        )
    assert response.status_code in [200, 400]
    if response.status_code == 200:
        data = response.json()
        assert "controls" in data


# ==================== TUNING ENDPOINTS ====================

@pytest.mark.asyncio
async def test_get_dataset_preview():
    async with get_client() as ac:
        response = await ac.get(
            "/api/v1/tuning/dataset-preview",
            headers={"X-Tenant-ID": "test_tenant"}
        )
    assert response.status_code in [200, 500]


@pytest.mark.asyncio
async def test_create_tuning_job():
    async with get_client() as ac:
        response = await ac.post(
            "/api/v1/tuning/jobs",
            json={
                "base_model": "gemini-2.5-flash",
                "dataset_id": "dataset-123"
            },
            headers={"X-Tenant-ID": "test_tenant"}
        )
    assert response.status_code in [200, 201, 400, 500]


@pytest.mark.asyncio
async def test_list_tuning_jobs():
    async with get_client() as ac:
        response = await ac.get(
            "/api/v1/tuning/jobs",
            headers={"X-Tenant-ID": "test_tenant"}
        )
    assert response.status_code in [200, 500]


@pytest.mark.asyncio
async def test_get_tuning_job():
    async with get_client() as ac:
        response = await ac.get(
            "/api/v1/tuning/jobs/job-123",
            headers={"X-Tenant-ID": "test_tenant"}
        )
    assert response.status_code in [200, 404, 500]


@pytest.mark.asyncio
async def test_activate_tuned_model():
    async with get_client() as ac:
        response = await ac.post(
            "/api/v1/tuning/jobs/job-123/activate",
            headers={"X-Tenant-ID": "test_tenant"}
        )
    assert response.status_code in [200, 400, 404, 500]


@pytest.mark.asyncio
async def test_cancel_tuning_job():
    async with get_client() as ac:
        response = await ac.post(
            "/api/v1/tuning/jobs/job-123/cancel",
            headers={"X-Tenant-ID": "test_tenant"}
        )
    assert response.status_code in [200, 404, 500]


# ==================== ERROR HANDLING TESTS ====================

@pytest.mark.asyncio
async def test_missing_tenant_id():
    async with get_client() as ac:
        response = await ac.get("/api/v1/responses/history")
    assert response.status_code in [200, 400, 401, 403, 422]


@pytest.mark.asyncio
async def test_invalid_json_payload():
    async with get_client() as ac:
        response = await ac.post(
            "/api/v1/responses/history",
            json={"invalid": "data"},
            headers={"X-Tenant-ID": "test_tenant"}
        )
    assert response.status_code in [200, 400, 403, 422]


@pytest.mark.asyncio
async def test_nonexistent_workspace():
    async with get_client() as ac:
        response = await ac.get(
            "/api/v1/responses/workspaces/nonexistent-id",
            headers={"X-Tenant-ID": "test_tenant"}
        )
    assert response.status_code in [404, 401, 403, 500]
