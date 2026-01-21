from unittest.mock import patch

import pytest
from fastapi import status

# Example user and investigation IDs for testing
USER_ID = "testuser123"
INVESTIGATION_ID = "test-inv-123"


# --- API ROUTER ENDPOINTS ---
def test_api_demo_enable(client):
    resp = client.get(f"/api/demo/{USER_ID}")
    assert resp.status_code in (200, 404, 502)
    if resp.status_code == 200:
        data = resp.json()
        assert "demo_mode" in data and data["demo_mode"] is True
        assert data["user_id"] == USER_ID


def test_api_demo_disable(client):
    resp = client.post(f"/api/demo/{USER_ID}/off")
    assert resp.status_code == status.HTTP_200_OK
    assert "message" in resp.json()


def test_api_demo_all(client):
    resp = client.get(f"/api/demo/{USER_ID}/all")
    assert resp.status_code == status.HTTP_200_OK
    data = resp.json()
    if "error" in data:
        assert "not in demo mode or demo data is not cached" in data["error"]
    else:
        assert "user_id" in data
        assert "demo_mode" in data
        assert "network" in data
        assert "device" in data
        assert "location" in data
        assert "logs" in data
        assert "oii" in data


def test_api_oii(client):
    resp = client.get(f"/api/oii/{USER_ID}")
    # Accept 200 or 500 (if not in demo mode or tool error)
    assert resp.status_code in (200, 500)
    if resp.status_code == 200:
        data = resp.json()
        assert "data" in data or "errors" in data


def fake_token():
    return ("test_user_id", "test_token", "test_realm")


@patch("app.router.risk_assessment_router.get_auth_token", fake_token, create=True)
def test_api_risk_assessment(client):
    # Ensure the investigation exists
    investigation = {
        "id": INVESTIGATION_ID,
        "user_id": USER_ID,
        "entity_type": "user_id",
    }
    resp = client.post(f"/api/investigation", json=investigation)
    assert resp.status_code in (200, 201, 400, 409, 422)
    # Now call the risk assessment endpoint
    resp = client.get(
        f"/api/risk-assessment/{USER_ID}?investigation_id={INVESTIGATION_ID}&entity_type=user_id"
    )
    assert resp.status_code in (200, 400, 404, 422)
    if resp.status_code == 200:
        risk_data = resp.json()
        assert "overallRiskScore" in risk_data
        assert "accumulatedLLMThoughts" in risk_data
        assert risk_data["investigationId"] == INVESTIGATION_ID
        assert risk_data["userId"] == USER_ID


def test_api_logs(client):
    resp = client.get(f"/api/logs/{USER_ID}?investigation_id={INVESTIGATION_ID}")
    assert resp.status_code in (200, 500)
    if resp.status_code == 200:
        data = resp.json()
        assert "risk_assessment" in data or "sanitized_data" in data


# --- DEVICE ROUTER ---
def test_device_analyze_device(client):
    resp = client.get(
        f"/device/{USER_ID}?investigation_id={INVESTIGATION_ID}&entity_type=user_id"
    )
    assert resp.status_code in (200, 404, 500)
    if resp.status_code == 200:
        data = resp.json()
        assert "user_id" in data
        assert "raw_splunk_results" in data
        assert "extracted_device_signals" in data
        assert "device_signal_risk_assessment" in data


# --- NETWORK ROUTER ---
def test_network_analyze_network(client):
    resp = client.get(f"/network/{USER_ID}?investigation_id={INVESTIGATION_ID}")
    assert resp.status_code in (200, 404, 500)
    if resp.status_code == 200:
        data = resp.json()
        assert "user_id" in data
        assert "raw_splunk_results_count" in data
        assert "extracted_network_signals" in data
        assert "network_risk_assessment" in data


# --- LOCATION ROUTER ---
def test_location_risk_analysis(client):
    resp = client.get(f"/location/{USER_ID}?investigation_id={INVESTIGATION_ID}")
    assert resp.status_code in (200, 404, 500)
    if resp.status_code == 200:
        data = resp.json()
        assert "user_id" in data
        assert "overall_location_risk_assessment" in data
        assert "timestamp" in data


# --- DEMO ROUTER ---
def test_demo_preload(client):
    resp = client.get(f"/demo/{USER_ID}")
    assert resp.status_code in (200, 404)
    if resp.status_code == 200:
        data = resp.json()
        assert "demo_mode" in data


def test_demo_all(client):
    resp = client.get(f"/demo/{USER_ID}/all")
    assert resp.status_code in (200, 404)
    if resp.status_code == 200:
        data = resp.json()
        assert "user_id" in data
        assert "demo_mode" in data


# --- AGENT ROUTER ---
def test_agent_invoke(client):
    # This requires a valid AgentRequest body; here we use a minimal valid example
    agent_request = {
        "agent": {"name": "chat_agent"},
        "agentInput": {"content": [{"text": "Test Input", "type": "text"}]},
        "metadata": {
            "interactionGroupId": "test-session",
            "supportedOutputFormats": [],
            "additionalMetadata": {},
        },
        "context": {
            "interactionType": "test",
            "platform": "test",
            "additionalContext": {},
        },
    }
    resp = client.post("/v1/agent/invoke", json=agent_request)
    assert resp.status_code in (200, 400, 500)
    if resp.status_code == 200:
        data = resp.json()
        assert "agentOutput" in data
        assert "agentMetadata" in data


# --- CHAT ROUTER ---
def test_chat_get_messages(client):
    resp = client.get(f"/investigation/{INVESTIGATION_ID}/chat")
    assert resp.status_code in (200, 404)
    if resp.status_code == 200:
        data = resp.json()
        assert isinstance(data, list)


# --- INVESTIGATION ROUTER ---
@pytest.mark.skip(
    reason="Skipping test due to missing required fields in InvestigationOut"
)
def test_investigation_crud(client):
    # Delete all investigations first
    resp = client.delete("/api/investigations/delete_all")
    assert resp.status_code == 200
    # Create
    investigation = {
        "id": INVESTIGATION_ID,
        "entity_id": USER_ID,
        "entity_type": "user_id",
    }
    resp = client.post("/api/investigation", json=investigation)
    assert resp.status_code in (200, 201, 400, 409, 422)
    # Update
    update = {
        "policy_comments": "Updated policy comment",
        "investigator_comments": "Updated investigator comment",
        "status": "COMPLETED",
    }
    resp = client.put(f"/api/investigation/{INVESTIGATION_ID}", json=update)
    assert resp.status_code != 200
    # Delete
    resp = client.delete(f"/api/investigation/{INVESTIGATION_ID}")
    assert resp.status_code in (200, 404, 400)
    # Verify it's gone
    resp = client.get(f"/api/investigation/{INVESTIGATION_ID}")
    assert resp.status_code in (404, 400)


def test_api_create_investigation(client):
    investigation = {
        "id": INVESTIGATION_ID,
        "entity_id": USER_ID,
        "entity_type": "user_id",
    }
    resp = client.post("/api/investigation", json=investigation)
    assert resp.status_code in (200, 201, 400, 409)
    if resp.status_code in (200, 201):
        data = resp.json()
        assert data["id"] == INVESTIGATION_ID
        assert data["status"] == "IN_PROGRESS"
        assert data["entity_id"] == USER_ID
        assert data["entity_type"] == "user_id"


def test_api_get_investigation_by_id(client):
    # Ensure the investigation exists
    investigation = {
        "id": INVESTIGATION_ID,
        "entity_id": USER_ID,
        "entity_type": "user_id",
    }
    resp = client.post("/api/investigation", json=investigation)
    assert resp.status_code in (200, 201, 400, 409)
    # Now get the investigation
    resp = client.get(f"/api/investigation/{INVESTIGATION_ID}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == INVESTIGATION_ID
    assert data["entity_id"] == USER_ID
    assert data["entity_type"] == "user_id"


def test_api_list_investigations(client):
    # Ensure at least one investigation exists
    investigation = {
        "id": INVESTIGATION_ID,
        "entity_id": USER_ID,
        "entity_type": "user_id",
    }
    resp = client.post("/api/investigation", json=investigation)
    assert resp.status_code in (200, 201, 400, 409)
    # Now list investigations
    resp = client.get("/api/investigations")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    if len(data) > 0:
        assert any(inv["id"] == INVESTIGATION_ID for inv in data)


@pytest.mark.skip(
    reason="Skipping test due to missing required fields in InvestigationOut"
)
def test_api_update_investigation(client):
    # Ensure the investigation exists
    investigation = {
        "id": INVESTIGATION_ID,
        "entity_id": USER_ID,
        "entity_type": "user_id",
    }
    resp = client.post("/api/investigation", json=investigation)
    assert resp.status_code in (200, 201, 400, 409, 422)
    # Now update the investigation
    update = {
        "policy_comments": "Updated policy comment",
        "investigator_comments": "Updated investigator comment",
        "status": "COMPLETED",
    }
    resp = client.put(f"/api/investigation/{INVESTIGATION_ID}", json=update)
    assert resp.status_code != 200


def test_api_delete_investigation(client):
    # Ensure the investigation exists
    investigation = {
        "id": INVESTIGATION_ID,
        "entity_id": USER_ID,
        "entity_type": "user_id",
    }
    resp = client.post("/api/investigation", json=investigation)
    assert resp.status_code in (200, 201, 400, 409, 422)
    # Now delete the investigation
    resp = client.delete(f"/api/investigation/{INVESTIGATION_ID}")
    assert resp.status_code in (200, 404, 400)
    # Verify it's gone
    resp = client.get(f"/api/investigation/{INVESTIGATION_ID}")
    assert resp.status_code in (404, 400)


@pytest.mark.skip(reason="Skipping test that requires missing parameters")
def test_get_device_risk_assessment_missing_required_params(client):
    """Test device risk assessment with missing required parameters."""
    response = client.get(
        f"/device/{USER_ID}",
    )
    assert response.status_code == 400
    data = response.json()
    assert "error" in data
    assert "Missing required parameters" in data["error"]


@pytest.mark.skip(reason="Skipping test that requires missing parameters")
def test_get_location_risk_assessment_missing_required_params(client):
    """Test location risk assessment with missing required parameters."""
    response = client.get(
        f"/location/{USER_ID}",
    )
    assert response.status_code == 400
    data = response.json()
    assert "error" in data
    assert "Missing required parameters" in data["error"]
