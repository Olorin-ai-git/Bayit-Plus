#!/usr/bin/env python3
"""
Run Merchant Agent Test via API

Creates an investigation via API and verifies merchant agent and validation.
"""

import requests
import json
import time
import sys
from datetime import datetime, timedelta
from pathlib import Path

def main():
    """Run merchant agent test via API."""
    print("\n" + "="*80)
    print("MERCHANT AGENT E2E TEST VIA API")
    print("="*80)
    
    base_url = "http://localhost:8090"
    
    # Check backend
    try:
        response = requests.get(f"{base_url}/health", timeout=5)
        if response.status_code != 200:
            print(f"❌ Backend not healthy")
            return False
        print("✅ Backend is running")
    except Exception as e:
        print(f"❌ Backend not reachable: {e}")
        return False
    
    # Create investigation
    investigation_id = f"merchant-test-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
    entity_id = "test_user_merchant_001"
    entity_type = "user_id"
    
    print(f"\n📋 Creating Investigation:")
    print(f"   ID: {investigation_id}")
    print(f"   Entity: {entity_type}={entity_id}")
    
    investigation_data = {
        "investigation_id": investigation_id,
        "lifecycle_stage": "IN_PROGRESS",
        "status": "IN_PROGRESS",
        "settings": {
            "name": f"Merchant Agent Test - {investigation_id}",
            "entities": [{"entity_type": entity_type, "entity_value": entity_id}],
            "time_range": {
                "start_time": (datetime.now() - timedelta(days=30)).isoformat(),
                "end_time": datetime.now().isoformat()
            },
            "investigation_type": "hybrid",
            "investigation_mode": "entity",
            "tools": [],
            "correlation_mode": "OR"
        }
    }
    
    try:
        # Create investigation
        print(f"\n🔍 Step 1: Creating investigation...")
        response = requests.post(
            f"{base_url}/api/v1/investigation-state/",
            json=investigation_data,
            timeout=30
        )
        
        if response.status_code not in [200, 201]:
            print(f"❌ Failed: {response.status_code}")
            print(f"   {response.text}")
            return False
        
        print(f"   ✅ Investigation created")
        
        # Poll for completion
        print(f"\n🔍 Step 2: Waiting for investigation to complete...")
        print(f"   (This may take 2-5 minutes)")
        
        max_wait = 300
        start_time = time.time()
        last_progress = 0
        
        while time.time() - start_time < max_wait:
            status_response = requests.get(
                f"{base_url}/api/v1/investigation-state/{investigation_id}",
                timeout=10
            )
            
            if status_response.status_code == 200:
                inv = status_response.json()
                status = inv.get("status", "unknown")
                progress_json = inv.get("progress_json", {})
                progress = progress_json.get("progress_percentage", 0)
                
                # Check for merchant agent
                agent_statuses = progress_json.get("agent_statuses", [])
                merchant_agent = next((a for a in agent_statuses if a.get("agent_name") == "merchant"), None)
                
                if progress > last_progress:
                    print(f"   Progress: {progress:.1f}%")
                    if merchant_agent:
                        print(f"   ✅ Merchant agent: {merchant_agent.get('status', 'unknown')}")
                    last_progress = progress
                
                if status == "COMPLETED":
                    print(f"\n   ✅ Investigation completed!")
                    break
                elif status in ["ERROR", "CANCELLED"]:
                    print(f"\n   ⚠️ Status: {status}")
                    break
            
            time.sleep(5)
        
        # Final check
        print(f"\n🔍 Step 3: Checking results...")
        final_response = requests.get(
            f"{base_url}/api/v1/investigation-state/{investigation_id}",
            timeout=10
        )
        
        if final_response.status_code == 200:
            investigation = final_response.json()
            progress_json = investigation.get("progress_json", {})
            agent_statuses = progress_json.get("agent_statuses", [])
            
            # Check merchant agent
            merchant_agent = next((a for a in agent_statuses if a.get("agent_name") == "merchant"), None)
            if merchant_agent:
                print(f"\n   ✅ MERCHANT AGENT EXECUTED:")
                print(f"      Status: {merchant_agent.get('status', 'N/A')}")
                print(f"      Risk Score: {merchant_agent.get('risk_score', 'N/A')}")
            else:
                print(f"\n   ⚠️ Merchant agent not found in agent statuses")
                print(f"      Available agents: {[a.get('agent_name') for a in agent_statuses]}")
        
        # Check investigation folder
        print(f"\n🔍 Step 4: Checking investigation folder...")
        logs_dir = Path("logs/investigations")
        if logs_dir.exists():
            investigation_folders = [f for f in logs_dir.iterdir() if investigation_id in f.name]
            if investigation_folders:
                folder = investigation_folders[0]
                print(f"   ✅ Folder: {folder}")
                
                # Check validation file
                validation_file = folder / "merchant_validation_results.json"
                if validation_file.exists():
                    print(f"   ✅ VALIDATION RESULTS FOUND!")
                    with open(validation_file, 'r') as f:
                        validation = json.load(f)
                    print(f"      Validation Complete: {validation.get('validation_complete', False)}")
                    if validation.get('validation_complete'):
                        print(f"      Predicted Risk: {validation.get('predicted_risk_score', 'N/A')}")
                        print(f"      Actual Fraud Rate: {validation.get('actual_fraud_rate', 'N/A')}")
                        print(f"      Prediction Correct: {validation.get('prediction_correct', 'N/A')}")
                        print(f"      Validation Quality: {validation.get('validation_quality', 'N/A')}")
                else:
                    print(f"   ⚠️ Validation file not found")
                
                # Check HTML report
                report_file = folder / "comprehensive_investigation_report.html"
                if report_file.exists():
                    print(f"\n   ✅ HTML REPORT FOUND!")
                    with open(report_file, 'r') as f:
                        content = f.read()
                    if "Merchant Agent Validation" in content:
                        print(f"      ✅ Merchant validation section in report!")
                    else:
                        print(f"      ⚠️ Merchant validation section not found")
                    print(f"      Report size: {report_file.stat().st_size:,} bytes")
                    print(f"      Report path: {report_file}")
        
        print(f"\n" + "="*80)
        print("TEST COMPLETE")
        print("="*80)
        return True
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)

