import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

def get_client() -> AsyncClient:
    return AsyncClient(
        transport=ASGITransport(app=app, raise_app_exceptions=False),
        base_url="http://test",
    )

@pytest.mark.asyncio
async def test_admin_list_and_update_members():
    async with get_client() as ac:
        resp = await ac.get("/api/v1/admin/members", headers={"X-Tenant-ID": "test-corp"})
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["members"]) >= 4

        mem_id = data["members"][0]["id"]
        update_resp = await ac.put(
            f"/api/v1/admin/members/{mem_id}/role",
            json={"role": "Security SME"},
            headers={"X-Tenant-ID": "test-corp"},
        )
        assert update_resp.status_code == 200
        assert update_resp.json()["member"]["role"] == "Security SME"

@pytest.mark.asyncio
async def test_admin_roles_lifecycle():
    async with get_client() as ac:
        # List initial roles
        list_resp = await ac.get("/api/v1/admin/roles", headers={"X-Tenant-ID": "test-corp"})
        assert list_resp.status_code == 200
        assert list_resp.json()["total"] >= 4

        # Create custom role
        new_role = {
            "name": "Finance SME",
            "icon": "💰",
            "description": "Reviews financial terms and pricing tables",
            "workflow_type": "sequential",
            "step_order": 3,
            "routing_tag": "#Pricing",
            "permissions": {"edit_drafts": True, "advance_stage": True},
        }
        create_resp = await ac.post(
            "/api/v1/admin/roles",
            json=new_role,
            headers={"X-Tenant-ID": "test-corp"},
        )
        assert create_resp.status_code == 201
        created = create_resp.json()["role"]
        assert created["name"] == "Finance SME"
        assert created["is_builtin"] is False

        # Update custom role
        update_resp = await ac.put(
            "/api/v1/admin/roles/Finance SME",
            json={"description": "Updated financial scope"},
            headers={"X-Tenant-ID": "test-corp"},
        )
        assert update_resp.status_code == 200
        assert update_resp.json()["role"]["description"] == "Updated financial scope"

        # Attempt to delete built-in role (should fail)
        fail_delete = await ac.delete(
            "/api/v1/admin/roles/Security SME",
            headers={"X-Tenant-ID": "test-corp"},
        )
        assert fail_delete.status_code == 400

        # Delete custom role
        del_resp = await ac.delete(
            "/api/v1/admin/roles/Finance SME",
            headers={"X-Tenant-ID": "test-corp"},
        )
        assert del_resp.status_code == 200

@pytest.mark.asyncio
async def test_admin_governance_workflow_modes():
    async with get_client() as ac:
        get_resp = await ac.get("/api/v1/admin/governance", headers={"X-Tenant-ID": "test-corp"})
        assert get_resp.status_code == 200
        assert get_resp.json()["workflow_mode"] in ["waterfall", "parallel", "hybrid"]

        update_resp = await ac.put(
            "/api/v1/admin/governance",
            json={
                "workflow_mode": "parallel",
                "finance_sme_email": "cfo@acme-corp.com",
                "auto_promote_golden_qa": False,
                "continuous_learning_enabled": True,
                "allowed_domains": "acme-corp.com",
                "session_timeout_minutes": 60,
            },
            headers={"X-Tenant-ID": "test-corp"},
        )
        assert update_resp.status_code == 200
        assert update_resp.json()["governance"]["workflow_mode"] == "parallel"
        assert update_resp.json()["governance"]["finance_sme_email"] == "cfo@acme-corp.com"
