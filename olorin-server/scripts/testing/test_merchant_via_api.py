#!/usr/bin/env python3
"""
Test Merchant Agent via Investigation API

Tests merchant agent and validation by creating an investigation through the API.
This avoids import dependency issues.
"""

import json
import time
from datetime import datetime
from pathlib import Path

import requests


def test_merchant_agent_via_api():
    """Test merchant agent through investigation API."""
    print("\n" + "=" * 80)
    print("TESTING MERCHANT AGENT VIA INVESTIGATION API")
    print("=" * 80)

    base_url = "http://localhost:8090"

    # Check if backend is running
    try:
        response = requests.get(f"{base_url}/health", timeout=5)
        if response.status_code != 200:
            print(f"❌ Backend not healthy (status: {response.status_code})")
            return False
        print("✅ Backend is running")
    except Exception as e:
        print(f"❌ Backend not reachable: {e}")
        print(
            "   Please start backend: cd olorin-server && poetry run uvicorn app.main:app --host 0.0.0.0 --port 8090"
        )
        return False

    # Create investigation
    investigation_id = f"test-merchant-api-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
    entity_id = "test_user_12345"
    entity_type = "user_id"

    print(f"\n📋 Creating Investigation:")
    print(f"   Investigation ID: {investigation_id}")
    print(f"   Entity Type: {entity_type}")
    print(f"   Entity ID: {entity_id}")

    investigation_data = {
        "investigation_id": investigation_id,
        "lifecycle_stage": "IN_PROGRESS",
        "status": "IN_PROGRESS",
        "settings": {
            "name": f"Test Merchant Agent Investigation - {investigation_id}",
            "entities": [{"entity_type": entity_type, "entity_value": entity_id}],
            "time_range": {
                "start_time": (datetime.now() - timedelta(days=30)).isoformat(),
                "end_time": datetime.now().isoformat(),
            },
            "investigation_type": "hybrid",
            "investigation_mode": "entity",
            "tools": [],
            "correlation_mode": "OR",
        },
    }

    try:
        # Create investigation
        print(f"\n🔍 Step 1: Creating investigation via API...")
        response = requests.post(
            f"{base_url}/api/v1/investigation-state/",
            json=investigation_data,
            timeout=30,
        )

        if response.status_code not in [200, 201]:
            print(f"❌ Failed to create investigation: {response.status_code}")
            print(f"   Response: {response.text}")
            return False

        print(f"   ✅ Investigation created: {investigation_id}")

        # Poll for completion
        print(f"\n🔍 Step 2: Waiting for investigation to complete...")
        max_wait = 300  # 5 minutes
        start_time = time.time()
        last_progress = 0

        while time.time() - start_time < max_wait:
            # Get investigation status
            status_response = requests.get(
                f"{base_url}/api/v1/investigation-state/{investigation_id}", timeout=10
            )

            if status_response.status_code == 200:
                investigation = status_response.json()
                status = investigation.get("status", "unknown")
                progress = investigation.get("progress_json", {}).get(
                    "progress_percentage", 0
                )

                if progress > last_progress:
                    print(f"   Progress: {progress:.1f}%")
                    last_progress = progress

                if status == "COMPLETED":
                    print(f"   ✅ Investigation completed!")
                    break
                elif status in ["ERROR", "CANCELLED"]:
                    print(f"   ⚠️ Investigation ended with status: {status}")
                    break

            time.sleep(5)

        # Check for merchant agent results
        print(f"\n🔍 Step 3: Checking for merchant agent results...")
        final_response = requests.get(
            f"{base_url}/api/v1/investigation-state/{investigation_id}", timeout=10
        )

        if final_response.status_code == 200:
            investigation = final_response.json()
            progress_json = investigation.get("progress_json", {})
            agent_statuses = progress_json.get("agent_statuses", [])

            merchant_agent_found = False
            for agent_status in agent_statuses:
                if agent_status.get("agent_name") == "merchant":
                    merchant_agent_found = True
                    print(f"   ✅ Merchant agent executed")
                    print(f"   Risk Score: {agent_status.get('risk_score', 'N/A')}")
                    print(f"   Status: {agent_status.get('status', 'N/A')}")
                    break

            if not merchant_agent_found:
                print(f"   ⚠️ Merchant agent not found in agent statuses")
                print(
                    f"   Available agents: {[a.get('agent_name') for a in agent_statuses]}"
                )

        # Check investigation folder for validation results
        print(f"\n🔍 Step 4: Checking for validation results...")
        logs_dir = Path("logs/investigations")
        if logs_dir.exists():
            # Find investigation folder
            investigation_folders = [
                f for f in logs_dir.iterdir() if investigation_id in f.name
            ]
            if investigation_folders:
                investigation_folder = investigation_folders[0]
                print(f"   ✅ Investigation folder found: {investigation_folder}")

                validation_file = (
                    investigation_folder / "merchant_validation_results.json"
                )
                if validation_file.exists():
                    print(f"   ✅ Validation results file found!")
                    with open(validation_file, "r") as f:
                        validation_data = json.load(f)
                    print(
                        f"   Validation Complete: {validation_data.get('validation_complete', False)}"
                    )
                    if validation_data.get("validation_complete"):
                        print(
                            f"   Predicted Risk: {validation_data.get('predicted_risk_score', 'N/A')}"
                        )
                        print(
                            f"   Actual Fraud Rate: {validation_data.get('actual_fraud_rate', 'N/A')}"
                        )
                        print(
                            f"   Prediction Correct: {validation_data.get('prediction_correct', 'N/A')}"
                        )
                else:
                    print(f"   ⚠️ Validation results file not found")

                # Check for HTML report
                report_file = (
                    investigation_folder / "comprehensive_investigation_report.html"
                )
                if report_file.exists():
                    print(f"\n   ✅ HTML report found: {report_file}")
                    with open(report_file, "r") as f:
                        report_content = f.read()
                    if "Merchant Agent Validation" in report_content:
                        print(f"   ✅ Merchant validation section found in report!")
                    else:
                        print(f"   ⚠️ Merchant validation section not found in report")
            else:
                print(f"   ⚠️ Investigation folder not found")
        else:
            print(f"   ⚠️ Logs directory not found: {logs_dir}")

        print(f"\n" + "=" * 80)
        print("TEST SUMMARY")
        print("=" * 80)
        print(f"✅ Investigation created via API")
        print(f"{'✅' if merchant_agent_found else '⚠️'} Merchant agent executed")
        validation_saved = "validation_file" in locals() and validation_file.exists()
        print(f"{'✅' if validation_saved else '⚠️'} Validation results saved")
        report_has_validation = (
            "report_file" in locals()
            and report_file.exists()
            and "Merchant Agent Validation" in report_content
        )
        print(f"{'✅' if report_has_validation else '⚠️'} Validation in HTML report")
        print("=" * 80)

        return True

    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback

        traceback.print_exc()
        return False


if __name__ == "__main__":
    from datetime import timedelta

    success = test_merchant_agent_via_api()
    if not success:
        sys.exit(1)
