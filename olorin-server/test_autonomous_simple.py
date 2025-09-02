#!/usr/bin/env python3
"""
Simple test script for autonomous investigation using the correct endpoints.

Usage:
    python test_autonomous_simple.py --csv-file /path/to/transactions.csv
    python test_autonomous_simple.py --csv-file /path/to/transactions.csv --csv-limit 20
    python test_autonomous_simple.py --csv-file /path/to/transactions.csv --entity-id "custom_entity_id"
    python test_autonomous_simple.py  # Run with default test data
"""

import asyncio
import json
import os
import time
import argparse
import csv
from datetime import datetime
import requests
import websockets
from html_report_generator import AutonomousInvestigationHTMLReporter

# Configuration
SERVER_PORT = os.environ.get("SERVER_PORT", "8090")
BASE_URL = f"http://localhost:{SERVER_PORT}"
WS_URL = f"ws://localhost:{SERVER_PORT}/ws"

# Default test data
test_user_id = "4621097846089147992"
test_entity_type = "user_id"

def load_transactions_from_csv(csv_file_path, limit=10):
    """Load transaction data from CSV file."""
    print(f"\n📊 Loading transactions from {csv_file_path}...")
    transactions = []
    
    try:
        with open(csv_file_path, 'r', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            for i, row in enumerate(reader):
                if i >= limit:
                    break
                
                # Extract relevant fields for investigation
                transaction = {
                    "tx_id": row.get("TX_ID_KEY", ""),
                    "unique_user_id": row.get("UNIQUE_USER_ID", ""),
                    "email": row.get("EMAIL", ""),
                    "first_name": row.get("FIRST_NAME", ""),
                    "app_id": row.get("APP_ID", ""),
                    "tx_datetime": row.get("TX_DATETIME", ""),
                    "authorization_stage": row.get("AUTHORIZATION_STAGE", ""),
                    "event_type": row.get("EVENT_TYPE", ""),
                    "original_tx_id": row.get("ORIGINAL_TX_ID", ""),
                    "client_request_id": row.get("CLIENT_REQUEST_ID", "")
                }
                transactions.append(transaction)
        
        print(f"✅ Loaded {len(transactions)} transactions from CSV")
        if transactions:
            print(f"   Sample transaction ID: {transactions[0]['tx_id']}")
            print(f"   Sample user ID: {transactions[0]['unique_user_id']}")
        
        return transactions
        
    except FileNotFoundError:
        print(f"❌ CSV file not found: {csv_file_path}")
        return []
    except Exception as e:
        print(f"❌ Error loading CSV: {e}")
        return []

# Headers for authentication
headers = {
    "Authorization": "Olorin_APIKey olorin_apikey=preprdakyres3AVWXWEiZESQdOnynrcYt9h9wwfR,olorin_apikey_version=1.0",
    "Content-Type": "application/json",
    "X-Forwarded-Port": "8090",
    "olorin_experience_id": "d3d28eaa-7ca9-4aa2-8905-69ac11fd8c58",
    "olorin_originating_assetalias": "Olorin.cas.hri.olorin",
}

def print_separator(title=""):
    """Print a formatted separator."""
    if title:
        print(f"\n{'='*60}")
        print(f"  {title}")
        print(f"{'='*60}")
    else:
        print(f"{'='*60}")

def check_health():
    """Check if the server is healthy."""
    print("\n🏥 Checking server health...")
    try:
        resp = requests.get(f"{BASE_URL}/health")
        if resp.status_code == 200:
            print(f"✅ Server is healthy: {resp.json()}")
            return True
        else:
            print(f"❌ Server health check failed: {resp.status_code}")
            return False
    except Exception as e:
        print(f"❌ Failed to connect to server: {e}")
        return False

def check_autonomous_health():
    """Check autonomous investigation health."""
    print("\n🤖 Checking autonomous investigation health...")
    try:
        resp = requests.get(f"{BASE_URL}/autonomous/health", headers=headers)
        if resp.status_code == 200:
            print(f"✅ Autonomous investigation is healthy: {resp.json()}")
            return True
        else:
            print(f"❌ Autonomous health check failed: {resp.status_code}")
            print(f"Response: {resp.text}")
            return False
    except Exception as e:
        print(f"❌ Failed to check autonomous health: {e}")
        return False

def get_scenarios():
    """Get available test scenarios."""
    print("\n📋 Getting available scenarios...")
    try:
        resp = requests.get(f"{BASE_URL}/autonomous/scenarios", headers=headers)
        if resp.status_code == 200:
            scenarios = resp.json()
            print(f"✅ Found {len(scenarios)} scenarios:")
            for scenario in scenarios[:5]:  # Show first 5
                print(f"   - {scenario.get('name', 'Unknown')}: {scenario.get('description', '')}")
            return scenarios
        else:
            print(f"❌ Failed to get scenarios: {resp.status_code}")
            print(f"Response: {resp.text}")
            return []
    except Exception as e:
        print(f"❌ Failed to get scenarios: {e}")
        return []

def start_investigation(entity_id, entity_type="user_id", parallel=True, transaction_data=None):
    """Start an autonomous investigation."""
    print(f"\n🚀 Starting autonomous investigation...")
    print(f"   Entity ID: {entity_id}")
    print(f"   Entity Type: {entity_type}")
    print(f"   Execution Mode: {'Parallel' if parallel else 'Sequential'}")
    if transaction_data:
        print(f"   Transaction Data: {len(transaction_data)} transactions loaded")

    payload = {
        "entity_id": entity_id,
        "entity_type": entity_type,
        "parallel_execution": parallel,
        "config": {
            "max_iterations": 10,
            "enable_logging": True,
            "enable_journey_tracking": True
        }
    }
    
    # Add transaction data if provided
    if transaction_data:
        payload["transaction_data"] = transaction_data

    try:
        resp = requests.post(
            f"{BASE_URL}/autonomous/start_investigation",
            json=payload,
            headers=headers
        )

        if resp.status_code in (200, 201):
            result = resp.json()
            print(f"✅ Investigation started successfully!")
            print(f"   Investigation ID: {result.get('investigation_id', 'Unknown')}")
            print(f"   Status: {result.get('status', 'Unknown')}")
            return result
        else:
            print(f"❌ Failed to start investigation: {resp.status_code}")
            print(f"Response: {resp.text}")
            return None
    except Exception as e:
        print(f"❌ Failed to start investigation: {e}")
        return None

def check_investigation_status(investigation_id):
    """Check the status of an investigation."""
    print(f"\n📊 Checking investigation status...")
    try:
        resp = requests.get(
            f"{BASE_URL}/autonomous/investigation/{investigation_id}/status",
            headers=headers
        )

        if resp.status_code == 200:
            status = resp.json()
            print(f"✅ Investigation Status:")
            print(f"   ID: {status.get('investigation_id', 'Unknown')}")
            print(f"   Phase: {status.get('phase', 'Unknown')}")
            print(f"   Progress: {status.get('progress', 0)}%")
            print(f"   Risk Score: {status.get('risk_score', 'N/A')}")
            return status
        else:
            print(f"❌ Failed to get status: {resp.status_code}")
            return None
    except Exception as e:
        print(f"❌ Failed to get status: {e}")
        return None

def get_investigation_logs(investigation_id):
    """Get logs for an investigation."""
    print(f"\n📜 Getting investigation logs...")
    try:
        resp = requests.get(
            f"{BASE_URL}/autonomous/investigation/{investigation_id}/logs",
            headers=headers
        )

        if resp.status_code == 200:
            logs = resp.json()
            print(f"✅ Retrieved {len(logs)} log entries")
            # Show last 3 log entries
            for log in logs[-3:]:
                print(f"   [{log.get('timestamp', '')}] {log.get('level', '')}: {log.get('message', '')}")
            return logs
        else:
            print(f"❌ Failed to get logs: {resp.status_code}")
            return []
    except Exception as e:
        print(f"❌ Failed to get logs: {e}")
        return []

def get_journey_tracking(investigation_id):
    """Get journey tracking data."""
    print(f"\n🗺️ Getting journey tracking data...")
    try:
        resp = requests.get(
            f"{BASE_URL}/autonomous/investigation/{investigation_id}/journey",
            headers=headers
        )

        if resp.status_code == 200:
            journey = resp.json()
            print(f"✅ Journey tracking data:")
            print(f"   Nodes visited: {len(journey.get('nodes', []))}")
            print(f"   Edges traversed: {len(journey.get('edges', []))}")
            return journey
        else:
            print(f"❌ Failed to get journey: {resp.status_code}")
            return None
    except Exception as e:
        print(f"❌ Failed to get journey: {e}")
        return None

async def monitor_investigation_websocket(investigation_id):
    """Monitor investigation progress via WebSocket."""
    print(f"\n📡 Connecting to WebSocket for real-time updates...")
    ws_url = f"{WS_URL}/autonomous/{investigation_id}"

    try:
        async with websockets.connect(ws_url) as websocket:
            print(f"✅ Connected to WebSocket")

            while True:
                try:
                    message = await asyncio.wait_for(websocket.recv(), timeout=30)
                    data = json.loads(message)

                    print(f"\n📨 WebSocket Update:")
                    print(f"   Type: {data.get('type', 'Unknown')}")
                    print(f"   Phase: {data.get('phase', 'Unknown')}")
                    print(f"   Message: {data.get('message', '')}")

                    # Check if investigation is complete
                    if data.get('phase') == 'completed':
                        print("\n🎉 Investigation completed!")
                        break

                except asyncio.TimeoutError:
                    print("⏱️ No WebSocket updates in 30 seconds")
                    break
                except Exception as e:
                    print(f"❌ WebSocket error: {e}")
                    break

    except Exception as e:
        print(f"❌ Failed to connect to WebSocket: {e}")

def run_full_test(csv_file_path=None, csv_limit=10, entity_id_override=None):
    """Run a complete autonomous investigation test."""
    print_separator("AUTONOMOUS INVESTIGATION TEST")
    
    # Load transaction data if CSV path provided
    transaction_data = None
    entity_id_to_use = test_user_id
    
    if csv_file_path:
        transaction_data = load_transactions_from_csv(csv_file_path, csv_limit)
        if transaction_data and transaction_data[0]['unique_user_id']:
            # Use the first transaction's user ID for investigation
            entity_id_to_use = transaction_data[0]['unique_user_id']
            print(f"📝 Using entity ID from CSV: {entity_id_to_use}")
    
    # Override entity ID if specified
    if entity_id_override:
        entity_id_to_use = entity_id_override
        print(f"🔄 Entity ID override applied: {entity_id_to_use}")

    # Step 1: Check server health
    if not check_health():
        print("\n❌ Server is not healthy. Exiting.")
        return

    # Step 2: Check autonomous health
    if not check_autonomous_health():
        print("\n⚠️ Autonomous health check failed, but continuing...")

    # Step 3: Get available scenarios
    scenarios = get_scenarios()

    # Step 4: Start investigation
    result = start_investigation(entity_id_to_use, test_entity_type, parallel=True, transaction_data=transaction_data)
    if not result:
        print("\n❌ Failed to start investigation. Exiting.")
        return

    investigation_id = result.get('investigation_id')
    if not investigation_id:
        print("\n❌ No investigation ID returned. Exiting.")
        return

    print(f"\n✨ Investigation ID: {investigation_id}")

    # Step 5: Monitor investigation
    print("\n⏳ Monitoring investigation progress...")
    max_checks = 30  # Check for up to 5 minutes
    check_interval = 10  # Check every 10 seconds

    for i in range(max_checks):
        time.sleep(check_interval)

        # Check status
        status = check_investigation_status(investigation_id)
        if status:
            phase = status.get('phase', '')
            if phase == 'completed':
                print("\n🎉 Investigation completed successfully!")
                break
            elif phase == 'failed':
                print("\n❌ Investigation failed!")
                break

        # Get recent logs
        if i % 3 == 0:  # Every 30 seconds
            get_investigation_logs(investigation_id)

    # Step 6: Get final results
    print_separator("FINAL RESULTS")

    # Get final status
    final_status = check_investigation_status(investigation_id)

    # Get journey tracking
    journey = get_journey_tracking(investigation_id)

    # Get all logs
    logs = get_investigation_logs(investigation_id)

    print_separator("TEST COMPLETE")
    print("\n✅ Autonomous investigation test completed!")

    return {
        "investigation_id": investigation_id,
        "final_status": final_status,
        "journey": journey,
        "logs": logs
    }

def parse_arguments():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        description="Simple autonomous investigation test script with CSV transaction data support"
    )
    
    parser.add_argument(
        "--csv-file",
        type=str,
        help="Path to CSV file containing transaction data",
        default=None
    )
    
    parser.add_argument(
        "--csv-limit",
        type=int,
        help="Maximum number of transactions to load from CSV (default: 10)",
        default=10
    )
    
    parser.add_argument(
        "--entity-id",
        type=str,
        help="Override entity ID for investigation (default: use from CSV or test data)",
        default=None
    )
    
    return parser.parse_args()

if __name__ == "__main__":
    # Parse command line arguments
    args = parse_arguments()
    
    # Display configuration
    print("🔧 Configuration:")
    print(f"   Server Port: {SERVER_PORT}")
    print(f"   Base URL: {BASE_URL}")
    if args.csv_file:
        print(f"   CSV File: {args.csv_file}")
        print(f"   CSV Limit: {args.csv_limit}")
    if args.entity_id:
        print(f"   Entity ID Override: {args.entity_id}")
    
    # Run the test
    results = run_full_test(
        csv_file_path=args.csv_file, 
        csv_limit=args.csv_limit,
        entity_id_override=args.entity_id
    )

    # Save results to file
    if results:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # Save JSON results
        json_filename = f"autonomous_test_results_{timestamp}.json"
        with open(json_filename, 'w') as f:
            json.dump(results, f, indent=2, default=str)
        print(f"\n💾 JSON results saved to {json_filename}")
        
        # Generate HTML report
        html_reporter = AutonomousInvestigationHTMLReporter(
            report_title="Autonomous Investigation Test Report - Simple"
        )
        
        # Prepare CSV metadata if CSV was used
        csv_metadata = None
        if args.csv_file:
            csv_metadata = {
                'file_path': args.csv_file,
                'transaction_count': args.csv_limit,
                'unique_users': 1,  # Simple test uses one user
                'sample_user_id': results.get('investigation_id', 'N/A'),
                'date_range': 'See CSV file'
            }
        
        # Convert results to test format for HTML report
        test_results = {
            "Simple Investigation": {
                "status": "PASSED" if results.get("final_status", {}).get("phase") == "completed" else "FAILED",
                "duration": 0,  # Could calculate from timestamps
                "final_risk_score": results.get("final_status", {}).get("risk_score", 0),
                "investigation_id": results.get("investigation_id"),
                "phases": {}
            }
        }
        
        html_filename = f"autonomous_test_report_{timestamp}.html"
        html_path = html_reporter.generate_html_report(
            test_results=test_results,
            csv_metadata=csv_metadata,
            output_path=html_filename
        )
        
        print(f"📊 HTML report generated: {html_filename}")
        print(f"\n🌐 Open in browser: file://{os.path.abspath(html_filename)}")
    
    print("\n✨ Test completed!")