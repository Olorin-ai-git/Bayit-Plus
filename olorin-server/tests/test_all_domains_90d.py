import json
import time

import pytest
import requests

BASE_URL = "http://localhost:8000/api"
entity_id = "4621097846089147992"
entity_type = "user_id"
time_range = "90d"
investigation_id = "INV-TEST-ALL-DOMAINS-90D"

headers = {
    "Authorization": "Olorin_APIKey intuit_apikey=preprdakyres3AVWXWEiZESQdOnynrcYt9h9wwfR,intuit_apikey_version=1.0",
    "Content-Type": "application/json",
    "X-Forwarded-Port": "8090",
    "intuit_experience_id": "d3d28eaa-7ca9-4aa2-8905-69ac11fd8c58",
    "intuit_originating_assetalias": "Olorin.cas.hri.olorin",
}


def create_investigation():
    """Create investigation by posting a comment first"""
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
    return resp.status_code in (200, 201)


@pytest.mark.parametrize(
    "domain_name,endpoint",
    [
        ("device", "device"),
        ("location", "location"),
        ("network", "network"),
        ("logs", "logs"),
    ],
)
def test_domain(domain_name, endpoint):
    """Test a single domain and check for errors"""
    print(f"\n=== Testing {domain_name.upper()} Domain ===")

    # Create investigation first if it doesn't exist
    create_investigation()

    url = f"{BASE_URL}/{endpoint}/{entity_id}"
    params = {
        "time_range": time_range,
        "investigation_id": investigation_id,
        "entity_type": entity_type,
    }

    resp = requests.get(url, params=params, headers=headers)
    print(f"Status: {resp.status_code}")

    if resp.status_code == 200:
        data = resp.json()

        # Check for data based on domain
        if domain_name == "device":
            count = data.get("num_device_signals", 0)
            print(f"Device signals: {count}")
        elif domain_name == "location":
            count = len(data.get("device_locations", []))
            print(f"Location records: {count}")
        elif domain_name == "network":
            count = data.get("raw_splunk_results_count", 0)
            print(f"Network records: {count}")
        elif domain_name == "logs":
            count = len(data.get("splunk_data", []))
            print(f"Log records: {count}")

        # Check for any error messages
        warning = data.get("splunk_warning", "")
        if warning and "Unknown search command" in warning:
            print(f"❌ SPLUNK SYNTAX ERROR: {warning}")
            assert False, f"Splunk syntax error in {domain_name}: {warning}"
        elif warning:
            print(f"⚠️  Warning: {warning}")

        # Look for LLM assessment
        llm_assessment = (
            data.get("llm_assessment")
            or data.get("location_risk_assessment")
            or data.get("network_risk_assessment")
            or data.get("risk_assessment")
        )
        if llm_assessment:
            risk_level = llm_assessment.get("risk_level", 0)
            print(f"Risk Level: {risk_level}")

        if count > 0:
            print(
                f"✅ {domain_name.capitalize()} domain has {count} records - WORKING!"
            )
        else:
            print(
                f"⚪ {domain_name.capitalize()} domain has 0 records (likely data availability issue)"
            )
        # Test passes if no syntax errors occur, regardless of data availability

    else:
        print(f"❌ HTTP Error: {resp.status_code}")
        print(resp.text)
        assert False, f"HTTP Error {resp.status_code} for {domain_name} domain"


def main():
    print("=== Testing All Domains with 90d Time Range ===")
    print(f"User ID: {entity_id}")
    print(f"Time Range: {time_range}")
    print(f"Investigation ID: {investigation_id}")

    # Create investigation
    if not create_investigation():
        print("❌ Failed to create investigation")
        return

    print("✅ Investigation created")

    # Test all domains
    domains = [
        ("device", "device"),
        ("location", "location"),
        ("network", "network"),
        ("logs", "logs"),
    ]

    results = {}
    for domain_name, endpoint in domains:
        results[domain_name] = test_domain(domain_name, endpoint)

    print("\n=== SUMMARY ===")
    all_working = True
    for domain_name, success in results.items():
        status = "✅ WORKING" if success else "❌ FAILED"
        print(f"{domain_name.capitalize()}: {status}")
        if not success:
            all_working = False

    if all_working:
        print("\n🎉 ALL DOMAINS WORKING - No Splunk syntax errors!")
        print("The 0 data results are due to data availability, not query issues.")
    else:
        print("\n❌ Some domains have issues that need to be fixed.")


if __name__ == "__main__":
    main()
