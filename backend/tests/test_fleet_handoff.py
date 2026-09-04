import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.schemas.fleet import FleetHandoffVerifyRequest, StageRecord, FleetStage, StageExecutionStatus

client = TestClient(app)

TENANT_ID = "tenant_123"
HEADERS = {"X-Tenant-ID": TENANT_ID}

def test_verify_handoff_full_success():
    payload = {
        "issue_id": 15,
        "session_id": "sess_abc123",
        "stages": [
            {"stage": "spec", "status": "completed", "agent_id": "agent_1", "remediation_attempts": 0},
            {"stage": "design", "status": "completed", "agent_id": "agent_2", "remediation_attempts": 0},
            {"stage": "development", "status": "completed", "agent_id": "agent_3", "remediation_attempts": 0},
            {"stage": "security_audit", "status": "completed", "agent_id": "agent_4", "remediation_attempts": 0},
            {"stage": "qa_verification", "status": "completed", "agent_id": "agent_5", "remediation_attempts": 0},
            {"stage": "final_approval_gate", "status": "pending", "agent_id": "agent_6", "remediation_attempts": 0}
        ],
        "notes": "All stages passed successfully."
    }
    response = client.post("/api/v1/fleet/handoff/verify", json=payload, headers=HEADERS)
    assert response.status_code == 200
    data = response.json()
    assert data["is_valid"] is True
    assert data["ready_for_human_approval"] is True
    assert data["current_stage"] == "final_approval_gate"

def test_verify_handoff_invalid_sequence_jump():
    payload = {
        "issue_id": 15,
        "session_id": "sess_jump",
        "stages": [
            {"stage": "spec", "status": "completed", "agent_id": "agent_1"},
            {"stage": "development", "status": "completed", "agent_id": "agent_3"}
        ]
    }
    response = client.post("/api/v1/fleet/handoff/verify", json=payload, headers=HEADERS)
    assert response.status_code == 200
    assert response.json()["is_valid"] is False
    assert response.json()["ready_for_human_approval"] is False

def test_verify_handoff_remediation_flow():
    payload = {
        "issue_id": 15,
        "session_id": "sess_remedy",
        "stages": [
            {"stage": "spec", "status": "completed", "agent_id": "agent_1"},
            {"stage": "design", "status": "remediated", "agent_id": "agent_2", "remediation_attempts": 1},
            {"stage": "development", "status": "pending", "agent_id": "agent_3"}
        ]
    }
    response = client.post("/api/v1/fleet/handoff/verify", json=payload, headers=HEADERS)
    assert response.status_code == 200
    data = response.json()
    assert data["is_valid"] is True
    assert data["ready_for_human_approval"] is True
    assert data["remediation_count"] == 1

def test_verify_handoff_terminal_failure():
    payload = {
        "issue_id": 15,
        "session_id": "sess_fail",
        "stages": [
            {"stage": "spec", "status": "completed", "agent_id": "agent_1"},
            {"stage": "design", "status": "failed", "agent_id": "agent_2"}
        ]
    }
    response = client.post("/api/v1/fleet/handoff/verify", json=payload, headers=HEADERS)
    assert response.status_code == 200
    data = response.json()
    assert data["ready_for_human_approval"] is False

def test_verify_handoff_missing_tenant_header():
    payload = {"issue_id": 1, "session_id": "s", "stages": [{"stage": "spec", "status": "completed", "agent_id": "a"}]}
    response = client.post("/api/v1/fleet/handoff/verify", json=payload)
    assert response.status_code == 422

def test_verify_handoff_sanitization():
    payload = {
        "issue_id": 15,
        "session_id": "sess_safe",
        "stages": [{"stage": "spec", "status": "completed", "agent_id": "agent_1"}],
        "notes": "=SUM(A1:A10)"
    }
    response = client.post("/api/v1/fleet/handoff/verify", json=payload, headers=HEADERS)
    assert response.status_code == 200
    audit_summary = response.json()["audit_summary"]
    assert "'=SUM(A1:A10)" in audit_summary
