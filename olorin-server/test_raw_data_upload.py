#!/usr/bin/env python3
"""
Test script for uploading CSV file to Raw Data API endpoint.

This script tests the raw data upload functionality by sending a real CSV file
to the API endpoint and displaying the processing results.
"""

import asyncio
import json
import sys
from pathlib import Path
import httpx
import uuid
from datetime import datetime

# Configuration
API_BASE_URL = "http://localhost:8090"
CSV_FILE_PATH = "/Users/gklainert/Documents/olorin/transaction_dataset.csv"
# Use an existing investigation ID or create a new one
INVESTIGATION_ID = f"test-raw-data-{datetime.now().strftime('%Y%m%d-%H%M%S')}"


async def create_investigation(client: httpx.AsyncClient) -> str:
    """Create a new investigation for testing."""
    investigation_data = {
        "id": INVESTIGATION_ID,
        "entity_id": "test-user-123",
        "entity_type": "user_id"
    }
    
    try:
        response = await client.post(
            f"{API_BASE_URL}/api/investigations/",
            json=investigation_data
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Created investigation: {result['id']}")
            return result['id']
        else:
            print(f"❌ Failed to create investigation: {response.status_code}")
            print(f"Response: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Error creating investigation: {e}")
        return None


async def upload_csv_file(client: httpx.AsyncClient, investigation_id: str, csv_path: str):
    """Upload CSV file to the raw data API endpoint."""
    
    # Read the CSV file
    csv_file = Path(csv_path)
    if not csv_file.exists():
        print(f"❌ CSV file not found: {csv_path}")
        return None
    
    print(f"📁 Uploading file: {csv_file.name}")
    print(f"📊 File size: {csv_file.stat().st_size:,} bytes")
    
    # Prepare the multipart form data
    with open(csv_file, 'rb') as f:
        files = {
            'file': (csv_file.name, f, 'text/csv')
        }
        data = {
            'investigation_id': investigation_id
        }
        
        try:
            # Send the POST request
            print(f"🚀 Sending request to {API_BASE_URL}/api/investigation/raw-data")
            response = await client.post(
                f"{API_BASE_URL}/api/investigation/raw-data",
                files=files,
                data=data,
                timeout=30.0  # 30 second timeout
            )
            
            print(f"📨 Response status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                return result
            else:
                print(f"❌ Upload failed with status {response.status_code}")
                print(f"Response: {response.text}")
                return None
                
        except httpx.TimeoutException:
            print("❌ Request timed out")
            return None
        except Exception as e:
            print(f"❌ Error during upload: {e}")
            return None


def display_results(result: dict):
    """Display the processing results in a formatted way."""
    if not result:
        print("❌ No results to display")
        return
    
    print("\n" + "="*60)
    print("📊 RAW DATA PROCESSING RESULTS")
    print("="*60)
    
    # Basic info
    print(f"\n✅ Success: {result.get('success', False)}")
    print(f"📝 Message: {result.get('message', 'N/A')}")
    print(f"🔍 Investigation ID: {result.get('investigation_id', 'N/A')}")
    print(f"🆔 Upload ID: {result.get('upload_id', 'N/A')}")
    
    # Processing results
    if 'processing_result' in result and result['processing_result']:
        pr = result['processing_result']
        print("\n📈 Processing Details:")
        print(f"  • Success: {pr.get('success', False)}")
        print(f"  • Filename: {pr.get('filename', 'N/A')}")
        print(f"  • Batches Processed: {pr.get('batches_processed', 0)}")
        print(f"  • Anomalies Count: {pr.get('anomalies_count', 0)}")
        print(f"  • Processing Time: {pr.get('processing_time_seconds', 0):.2f} seconds")
        
        # Quality metrics
        if 'quality_metrics' in pr and pr['quality_metrics']:
            qm = pr['quality_metrics']
            print("\n🎯 Data Quality Metrics:")
            print(f"  • Total Records: {qm.get('total_records', 0)}")
            print(f"  • Valid Records: {qm.get('valid_records', 0)}")
            print(f"  • Invalid Records: {qm.get('invalid_records', 0)}")
            print(f"  • Quality Score: {qm.get('quality_score', 0):.2%}")
            print(f"  • Processing Time: {qm.get('processing_time', 0):.2f} seconds")
            
            # Missing fields
            if 'missing_fields' in qm and qm['missing_fields']:
                print("\n⚠️ Missing Fields:")
                for field, count in qm['missing_fields'].items():
                    print(f"  • {field}: {count} records")
            
            # Data issues
            if 'data_issues' in qm and qm['data_issues']:
                print("\n⚠️ Data Issues:")
                for issue_type, issues in qm['data_issues'].items():
                    print(f"  • {issue_type}:")
                    for issue in issues[:3]:  # Show first 3 issues
                        print(f"    - {issue}")
                    if len(issues) > 3:
                        print(f"    ... and {len(issues) - 3} more")
            
            # Anomalies
            if 'anomalies_detected' in qm and qm['anomalies_detected']:
                print(f"\n🔴 Anomalies Detected: {len(qm['anomalies_detected'])}")
                for i, anomaly in enumerate(qm['anomalies_detected'][:5], 1):  # Show first 5
                    print(f"  {i}. Type: {anomaly.get('type', 'N/A')}")
                    print(f"     Transaction: {anomaly.get('transaction_id', 'N/A')}")
                    print(f"     Description: {anomaly.get('description', 'N/A')}")
                if len(qm['anomalies_detected']) > 5:
                    print(f"  ... and {len(qm['anomalies_detected']) - 5} more anomalies")
        
        # Sample data
        if 'data' in pr and pr['data']:
            print(f"\n📋 Sample Transactions (first 3 of {len(pr['data'])}):")
            for i, tx in enumerate(pr['data'][:3], 1):
                print(f"  {i}. ID: {tx.get('transaction_id', 'N/A')}")
                print(f"     Amount: ${tx.get('amount', 0):.2f}")
                print(f"     Timestamp: {tx.get('timestamp', 'N/A')}")
                if 'merchant' in tx:
                    print(f"     Merchant: {tx.get('merchant', 'N/A')}")
    
    print("\n" + "="*60)


async def main():
    """Main test function."""
    print("🚀 Starting Raw Data API Test")
    print(f"📁 CSV File: {CSV_FILE_PATH}")
    print(f"🌐 API URL: {API_BASE_URL}")
    print("="*60)
    
    # Create HTTP client
    async with httpx.AsyncClient() as client:
        # Step 1: Create investigation
        print("\n📝 Step 1: Creating investigation...")
        investigation_id = await create_investigation(client)
        
        if not investigation_id:
            print("❌ Failed to create investigation. Exiting.")
            return
        
        # Step 2: Upload CSV file
        print(f"\n📤 Step 2: Uploading CSV file to investigation {investigation_id}...")
        result = await upload_csv_file(client, investigation_id, CSV_FILE_PATH)
        
        # Step 3: Display results
        if result:
            display_results(result)
            print("\n✅ Test completed successfully!")
        else:
            print("\n❌ Test failed - no results received")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n⚠️ Test interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        sys.exit(1)