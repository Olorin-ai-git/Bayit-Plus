import json
import time

import requests

BASE_URL = "http://localhost:8090/api"
entity_id = "4621097846089147992"  # User ID provided by user
entity_type = "user_id"
time_range = "90d"
investigation_id = "INV-TEST-DEVICE-90D"

headers = {
    "Authorization": "Olorin_APIKey olorin_apikey=preprdakyres3AVWXWEiZESQdOnynrcYt9h9wwfR,olorin_apikey_version=1.0",
    "Content-Type": "application/json",
    "X-Forwarded-Port": "8090",
    "olorin_experience_id": "d3d28eaa-7ca9-4aa2-8905-69ac11fd8c58",
    "olorin_originating_assetalias": "Olorin.cas.hri.olorin",
>>>>>>> restructure-projects:olorin-server/tests/test_single_domain.py
}


def create_investigation():
    """Create investigation by posting a comment first - same as full test script"""
    print("Creating investigation...")
    create_payload = {
        "id": investigation_id,
        "entity_id": entity_id,
        "entity_type": entity_type,
    }
    resp = requests.post(
        f"{BASE_URL}/investigation",
        json=create_payload,
        headers=headers,
    )
    print(f"Investigation creation status: {resp.status_code}")
    if resp.status_code in (200, 201):
        print("✅ Investigation created successfully")
        return True
    else:
        print(f"❌ Failed to create investigation: {resp.text}")
        return False


def test_device_domain():
    print(f"Testing Device Domain for user {entity_id} with time range {time_range}...")

    # Create investigation first
    create_investigation()

    url = f"{BASE_URL}/device/{entity_id}"
    params = {
        "time_range": time_range,
        "investigation_id": investigation_id,
        "entity_type": entity_type,
    }

    resp = requests.get(url, params=params, headers=headers)
    print(f"Response Status: {resp.status_code}")

    if resp.status_code == 200:
        data = resp.json()
        num_signals = data.get("num_device_signals", 0)
        print(f"Number of signals: {num_signals}")

        if num_signals > 0:
            print("✅ Device domain has data!")
            print(f"First few signals:")
            for i, signal in enumerate(data.get("retrieved_signals", [])[:3]):
                print(f"  Signal {i+1}: {signal}")

            llm = data.get("llm_assessment", {})
            print(f"LLM Risk Level: {llm.get('risk_level', 'N/A')}")
            print(f"LLM Summary: {llm.get('summary', 'N/A')}")
        else:
            print("❌ Device domain has no data")
            warning = data.get("splunk_warning", "No warning")
            print(f"Warning: {warning}")
        # Test passes as long as there's no HTTP error
    else:
        print(f"❌ HTTP Error: {resp.status_code}")
        print(f"Response: {resp.text}")
        assert False, f"HTTP Error {resp.status_code} in device domain test"


if __name__ == "__main__":
    print("=== Replicating Full Test Script Flow ===")
    print(f"User ID: {entity_id}")
    print(f"Time Range: {time_range}")
    print(f"Investigation ID: {investigation_id}")
    print()

    # Step 1: Create investigation (same as full test script)
    if create_investigation():
        print()
        # Step 2: Test device domain
        success = test_device_domain()

        if success:
            print("✅ SUCCESS: Device domain returned data with 90d time range!")
        else:
            print("❌ FAILED: Device domain still returns no data")
            print("This indicates the issue is not related to investigation creation")
    else:
        print("Cannot proceed without investigation creation")
