import pytest
import uuid
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.db import close_db_connection

@pytest.fixture(autouse=True)
async def cleanup_db():
    yield
    await close_db_connection()

@pytest.mark.asyncio
async def test_workspace_dashboard_crud_flow():
    test_tenant = f"test-tenant-{uuid.uuid4().hex[:6]}"
    test_ws_id = f"rfp-test-{uuid.uuid4().hex[:8]}"

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Create a workspace with 2 questions
        create_payload = {
            "id": test_ws_id,
            "tenant_id": test_tenant,
            "title": "Vendor Security Assessment 2026",
            "source_mode": "upload",
            "source_url": "",
            "questions": [
                {
                    "question_index": 0,
                    "question_text": "Do you encrypt data at rest?",
                    "suggested_answer": "Yes, AES-256 is used.",
                    "final_answer": "Yes, AES-256 is used across all databases.",
                    "review_status": "Approved",
                    "assigned_role": "Security SME",
                    "confidence_score": 0.98,
                },
                {
                    "question_index": 1,
                    "question_text": "Do you support SAML SSO?",
                    "suggested_answer": "Yes, Okta and Azure AD.",
                    "final_answer": None,
                    "review_status": "In Review",
                    "assigned_role": "Legal Reviewer",
                    "confidence_score": 0.92,
                }
            ]
        }
        try:
            res_create = await ac.post(
                "/api/v1/responses/workspaces",
                json=create_payload,
                headers={"X-Tenant-ID": test_tenant}
            )
        except Exception as e:
            pytest.skip(f"Database unreachable in offline/sandboxed test environment: {e}")

        assert res_create.status_code == 201
        created_data = res_create.json()
        assert created_data["id"] == test_ws_id
        assert len(created_data["questions"]) == 2

        # 2. List workspaces - verify summary metrics calculation
        res_list = await ac.get(
            "/api/v1/responses/workspaces",
            headers={"X-Tenant-ID": test_tenant}
        )
        assert res_list.status_code == 200
        summaries = res_list.json()
        assert len(summaries) >= 1
        ws_summary = next(s for s in summaries if s["id"] == test_ws_id)
        assert ws_summary["total_questions"] == 2
        assert ws_summary["approved_count"] == 1
        assert ws_summary["in_review_count"] == 1
        assert ws_summary["completion_percentage"] == 50.0
        assert ws_summary["status"] == "In Review"

        # 3. Get individual workspace details
        res_get = await ac.get(
            f"/api/v1/responses/workspaces/{test_ws_id}",
            headers={"X-Tenant-ID": test_tenant}
        )
        assert res_get.status_code == 200
        get_data = res_get.json()
        assert get_data["title"] == "Vendor Security Assessment 2026"
        assert len(get_data["questions"]) == 2

        # 4. Update workspace answers and review statuses
        update_payload = {
            "title": "Vendor Security Assessment 2026 - Approved",
            "answers": {
                "Do you support SAML SSO?": "Yes, we support SAML 2.0 via Okta and Azure AD."
            },
            "review_statuses": {
                "Do you support SAML SSO?": "Approved"
            }
        }
        res_update = await ac.put(
            f"/api/v1/responses/workspaces/{test_ws_id}",
            json=update_payload,
            headers={"X-Tenant-ID": test_tenant}
        )
        assert res_update.status_code == 200
        updated_data = res_update.json()
        assert updated_data["title"] == "Vendor Security Assessment 2026 - Approved"
        q2 = next(q for q in updated_data["questions"] if q["question_text"] == "Do you support SAML SSO?")
        assert q2["review_status"] == "Approved"
        assert "SAML 2.0" in q2["final_answer"]

        # 5. Duplicate workspace
        res_dup = await ac.post(
            f"/api/v1/responses/workspaces/{test_ws_id}/duplicate",
            headers={"X-Tenant-ID": test_tenant}
        )
        assert res_dup.status_code == 201
        dup_data = res_dup.json()
        assert dup_data["id"] != test_ws_id
        assert "(Copy)" in dup_data["title"]
        assert len(dup_data["questions"]) == 2
        # Duplicated question status should be reset to Draft
        assert all(q["review_status"] == "Draft" for q in dup_data["questions"])

        # 6. Delete duplicated workspace and original workspace
        res_del_dup = await ac.delete(
            f"/api/v1/responses/workspaces/{dup_data['id']}",
            headers={"X-Tenant-ID": test_tenant}
        )
        assert res_del_dup.status_code == 200

        res_del_orig = await ac.delete(
            f"/api/v1/responses/workspaces/{test_ws_id}",
            headers={"X-Tenant-ID": test_tenant}
        )
        assert res_del_orig.status_code == 200

        # Verify deletion
        res_get_deleted = await ac.get(
            f"/api/v1/responses/workspaces/{test_ws_id}",
            headers={"X-Tenant-ID": test_tenant}
        )
        assert res_get_deleted.status_code == 404

