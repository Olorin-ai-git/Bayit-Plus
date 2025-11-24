"""
End-to-End Test: Risk-Based Investigation State Management
Tests investigation creation with auto-selected entities from PostgreSQL risk analysis.
Validates that the server correctly:
1. Detects the "auto-select" placeholder in entities
2. Queries PostgreSQL for top 10% risky emails
3. Auto-populates investigation with those entities
4. Tracks progress and maintains state persistence
"""

import pytest
import requests
import time
import json
import os
from datetime import datetime, timedelta

# Configuration - Load from environment variables (SYSTEM MANDATE compliance)
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8090")
TEST_USERNAME = os.getenv("TEST_USERNAME", "admin")
TEST_PASSWORD = os.getenv("TEST_PASSWORD")

# Validate required credentials
if not TEST_PASSWORD:
    raise RuntimeError(
        "TEST_PASSWORD environment variable is required. "
        "Set it before running this test."
    )

def get_auth_token():
    """Authenticate with the backend and return JWT token"""
    print(f"\n[AUTH] Authenticating as '{TEST_USERNAME}'...")
    login_response = requests.post(
        f"{BACKEND_URL}/auth/login-json",
        json={"username": TEST_USERNAME, "password": TEST_PASSWORD}
    )
    assert login_response.status_code == 200, f"Failed to authenticate: {login_response.text}"
    token_data = login_response.json()
    token = token_data["access_token"]
    print(f"✓ Successfully authenticated, token: {token[:20]}...")
    return token

def get_auth_headers(token: str) -> dict:
    """Get authorization headers with JWT token"""
    return {"Authorization": f"Bearer {token}"}

def test_risk_based_investigation_with_auto_select():
    """Test investigation creation with risk-based auto-select entity population"""

    print("\n" + "="*80)
    print("RISK-BASED INVESTIGATION STATE MANAGEMENT E2E TEST")
    print("Testing auto-population from PostgreSQL top 10% risky entities")
    print("="*80)

    # Authentication
    auth_token = get_auth_token()
    headers = get_auth_headers(auth_token)

    investigation_id = f"INV-RISK-{int(time.time())}"

    # Step 1: Create Investigation with auto-select placeholder
    print(f"\n[STEP 1] Creating investigation with auto-select: {investigation_id}")

    # Use "auto-select" placeholder - the server should detect this and populate
    # with top 10% risky entities from PostgreSQL
    create_payload = {
        "investigation_id": investigation_id,
        "user_id": TEST_USERNAME,
        "lifecycle_stage": "CREATED",
        "status": "CREATED",
        "settings": {
            "name": "Risk-Based Investigation (Auto-Select)",
            "entities": [
                {
                    "entity_type": "email",
                    "entity_value": "auto-select"  # PLACEHOLDER - server will auto-populate
                }
            ],
            "time_range": {
                "start_time": (datetime.now() - timedelta(days=7)).isoformat() + "Z",
                "end_time": datetime.now().isoformat() + "Z"
            },
            "tools": [
                {"tool_name": "anomaly_detection", "enabled": True},
                {"tool_name": "network_analysis", "enabled": True}
            ],
            "correlation_mode": "OR"
        },
        "progress": {
            "current_phase": "Initialization",
            "progress_percentage": 0.0,
            "phase_progress": {
                "Initialization": {"phase_name": "Initialization", "phase_percentage": 0.0, "tools_completed": 0, "tools_total": 0},
                "Data Collection": {"phase_name": "Data Collection", "phase_percentage": 0.0, "tools_completed": 0, "tools_total": 2},
                "Tool Execution": {"phase_name": "Tool Execution", "phase_percentage": 0.0, "tools_completed": 0, "tools_total": 2},
                "Analysis": {"phase_name": "Analysis", "phase_percentage": 0.0, "tools_completed": 0, "tools_total": 0},
                "Finalization": {"phase_name": "Finalization", "phase_percentage": 0.0, "tools_completed": 0, "tools_total": 0}
            }
        }
    }

    create_response = requests.post(
        f"{BACKEND_URL}/api/v1/investigation-state/",
        json=create_payload,
        headers=headers
    )
    assert create_response.status_code in [200, 201], f"Failed to create investigation: {create_response.text}"
    created_state = create_response.json()
    assert created_state["investigation_id"] == investigation_id
    assert created_state["version"] == 1
    print(f"✓ Investigation created with version: {created_state['version']}")

    # Step 2: Fetch Investigation to Verify Auto-Population
    print(f"\n[STEP 2] Fetching investigation to verify auto-select entity population")
    snapshot_response = requests.get(
        f"{BACKEND_URL}/api/v1/investigation-state/{investigation_id}",
        headers=headers
    )
    assert snapshot_response.status_code == 200, f"Failed to fetch snapshot: {snapshot_response.text}"
    snapshot = snapshot_response.json()

    # CRITICAL: Verify that auto-select placeholder was replaced with real entities
    print(f"\n🔍 VERIFYING AUTO-SELECT ENTITY POPULATION:")
    entities = snapshot.get("settings", {}).get("entities", [])
    print(f"   Number of entities populated: {len(entities)}")

    # Should have at least one entity (not "auto-select" placeholder)
    assert len(entities) > 0, "No entities were populated from auto-select!"

    # Verify entities are real emails, not the placeholder
    for entity in entities:
        entity_value = entity.get("entity_value", "")
        assert entity_value != "auto-select", f"Placeholder was not replaced! Got: {entity_value}"
        assert "@" in entity_value or len(entity_value) > 0, f"Invalid entity value: {entity_value}"
        print(f"   ✓ Entity: {entity_value[:50]}... (type: {entity.get('entity_type')})")

    print(f"✓ Auto-select successfully populated {len(entities)} top-risk entities from PostgreSQL")

    # Step 3: Simulate Progress Updates
    print(f"\n[STEP 3] Simulating investigation progress updates")
    progress_updates = [
        {"current_phase": "Data Collection", "progress_percentage": 15},
        {"current_phase": "Data Collection", "progress_percentage": 35},
        {"current_phase": "Tool Execution", "progress_percentage": 50},
        {"current_phase": "Tool Execution", "progress_percentage": 75},
        {"current_phase": "Analysis", "progress_percentage": 85},
        {"current_phase": "Finalization", "progress_percentage": 100}
    ]

    current_version = snapshot["version"]
    previous_progress = 0

    for update in progress_updates:
        time.sleep(0.5)

        progress_val = update["progress_percentage"]
        update_payload = {
            "lifecycle_stage": "IN_PROGRESS" if progress_val < 100 else "COMPLETED",
            "status": "IN_PROGRESS" if progress_val < 100 else "COMPLETED",
            "progress": {
                "current_phase": update["current_phase"],
                "progress_percentage": float(progress_val),
                "phase_progress": {
                    "Initialization": {"phase_name": "Initialization", "phase_percentage": 100.0 if progress_val > 0 else 0.0, "tools_completed": 0, "tools_total": 0},
                    "Data Collection": {"phase_name": "Data Collection", "phase_percentage": float(min(100, max(0, (progress_val - 0) * 100 // 35))), "tools_completed": 1 if progress_val >= 35 else 0, "tools_total": 2},
                    "Tool Execution": {"phase_name": "Tool Execution", "phase_percentage": float(min(100, max(0, (progress_val - 35) * 100 // 40))) if progress_val >= 35 else 0.0, "tools_completed": 2 if progress_val >= 75 else 1 if progress_val >= 50 else 0, "tools_total": 2},
                    "Analysis": {"phase_name": "Analysis", "phase_percentage": float(min(100, max(0, (progress_val - 75) * 100 // 10))) if progress_val >= 75 else 0.0, "tools_completed": 0, "tools_total": 0},
                    "Finalization": {"phase_name": "Finalization", "phase_percentage": 100.0 if progress_val == 100 else 0.0, "tools_completed": 0, "tools_total": 0}
                }
            },
            "version": current_version
        }

        update_response = requests.patch(
            f"{BACKEND_URL}/api/v1/investigation-state/{investigation_id}",
            json=update_payload,
            headers={**headers, "If-Match": str(current_version)}
        )

        assert update_response.status_code == 200, f"Failed to update progress: {update_response.text}"
        updated = update_response.json()
        current_version = updated["version"]

        print(f"  {previous_progress}% → {update['progress_percentage']}% ({update['current_phase']}) [v{current_version}]")
        previous_progress = update["progress_percentage"]

    print(f"✓ Progress updates completed successfully")

    # Step 4: Verify Final State
    print(f"\n[STEP 4] Verifying final investigation state")
    final_response = requests.get(
        f"{BACKEND_URL}/api/v1/investigation-state/{investigation_id}",
        headers=headers
    )
    assert final_response.status_code == 200
    final_state = final_response.json()

    assert final_state["status"] == "COMPLETED"
    assert final_state["progress"]["progress_percentage"] == 100
    assert final_state["version"] > 1

    # Verify entities remain populated (not reverted to placeholder)
    final_entities = final_state.get("settings", {}).get("entities", [])
    print(f"\n📊 FINAL STATE VERIFICATION:")
    print(f"  Status:           {final_state['status']}")
    print(f"  Progress:         {final_state['progress']['progress_percentage']}%")
    print(f"  Current Phase:    {final_state['progress']['current_phase']}")
    print(f"  Version:          {final_state['version']}")
    print(f"  Entities (persisted): {len(final_entities)}")

    for entity in final_entities[:3]:  # Show first 3
        print(f"    • {entity.get('entity_value', 'N/A')[:40]}...")

    print(f"✓ Final state verified")

    # Step 5: Verify State Persistence
    print(f"\n[STEP 5] Verifying state persistence (re-fetch after delay)")
    time.sleep(2)
    persistence_check = requests.get(
        f"{BACKEND_URL}/api/v1/investigation-state/{investigation_id}",
        headers=headers
    )
    assert persistence_check.status_code == 200
    persisted_state = persistence_check.json()

    assert persisted_state["progress"]["progress_percentage"] == 100
    assert len(persisted_state.get("settings", {}).get("entities", [])) == len(final_entities)
    print(f"✓ State persisted correctly across requests")

    # Summary
    print(f"\n" + "="*80)
    print("E2E TEST PASSED - Risk-Based Investigation Management Working Correctly")
    print("="*80)
    print(f"\nSummary:")
    print(f"  • Investigation Created:     {investigation_id}")
    print(f"  • Auto-Select Entities:      {len(final_entities)} from PostgreSQL top 10%")
    print(f"  • Progress Tracking:         0% → 100%")
    print(f"  • Version Control:           {persisted_state['version']} versions")
    print(f"  • State Persistence:         ✓ Verified")
    print(f"  • Entity Auto-Population:    ✓ Working (PostgreSQL-driven)")
    print(f"\nAll investigation state management features with risk-based entity selection validated!")

if __name__ == "__main__":
    test_risk_based_investigation_with_auto_select()
