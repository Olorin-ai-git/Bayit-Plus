from app.service.logging import get_bridge_logger
logger = get_bridge_logger(__name__)

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
            logger.info(f"✅ Created investigation: {result['id']}")
            return result['id']
        else:
            logger.error(f"❌ Failed to create investigation: {response.status_code}")
            logger.info(f"Response: {response.text}")
            return None
    except Exception as e:
        logger.error(f"❌ Error creating investigation: {e}")
        return None


async def upload_csv_file(client: httpx.AsyncClient, investigation_id: str, csv_path: str):
    """Upload CSV file to the raw data API endpoint."""
    
    # Read the CSV file
    csv_file = Path(csv_path)
    if not csv_file.exists():
        logger.info(f"❌ CSV file not found: {csv_path}")
        return None
    
    logger.info(f"📁 Uploading file: {csv_file.name}")
    logger.info(f"📊 File size: {csv_file.stat().st_size:,} bytes")
    
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
            logger.info(f"🚀 Sending request to {API_BASE_URL}/api/investigation/raw-data")
            response = await client.post(
                f"{API_BASE_URL}/api/investigation/raw-data",
                files=files,
                data=data,
                timeout=30.0  # 30 second timeout
            )
            
            logger.info(f"📨 Response status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                return result
            else:
                logger.error(f"❌ Upload failed with status {response.status_code}")
                logger.info(f"Response: {response.text}")
                return None
                
        except httpx.TimeoutException:
            logger.info("❌ Request timed out")
            return None
        except Exception as e:
            logger.error(f"❌ Error during upload: {e}")
            return None


def display_results(result: dict):
    """Display the processing results in a formatted way."""
    if not result:
        logger.info("❌ No results to display")
        return
    
    logger.info("\n" + "="*60)
    logger.info("📊 RAW DATA PROCESSING RESULTS")
    logger.info("="*60)
    
    # Basic info
    logger.info(f"\n✅ Success: {result.get('success', False)}")
    logger.info(f"📝 Message: {result.get('message', 'N/A')}")
    logger.info(f"🔍 Investigation ID: {result.get('investigation_id', 'N/A')}")
    logger.info(f"🆔 Upload ID: {result.get('upload_id', 'N/A')}")
    
    # Processing results
    if 'processing_result' in result and result['processing_result']:
        pr = result['processing_result']
        logger.info("\n📈 Processing Details:")
        logger.info(f"  • Success: {pr.get('success', False)}")
        logger.info(f"  • Filename: {pr.get('filename', 'N/A')}")
        logger.info(f"  • Batches Processed: {pr.get('batches_processed', 0)}")
        logger.info(f"  • Anomalies Count: {pr.get('anomalies_count', 0)}")
        logger.info(f"  • Processing Time: {pr.get('processing_time_seconds', 0):.2f} seconds")
        
        # Quality metrics
        if 'quality_metrics' in pr and pr['quality_metrics']:
            qm = pr['quality_metrics']
            logger.info("\n🎯 Data Quality Metrics:")
            logger.info(f"  • Total Records: {qm.get('total_records', 0)}")
            logger.info(f"  • Valid Records: {qm.get('valid_records', 0)}")
            logger.info(f"  • Invalid Records: {qm.get('invalid_records', 0)}")
            logger.info(f"  • Quality Score: {qm.get('quality_score', 0):.2%}")
            logger.info(f"  • Processing Time: {qm.get('processing_time', 0):.2f} seconds")
            
            # Missing fields
            if 'missing_fields' in qm and qm['missing_fields']:
                logger.info("\n⚠️ Missing Fields:")
                for field, count in qm['missing_fields'].items():
                    logger.info(f"  • {field}: {count} records")
            
            # Data issues
            if 'data_issues' in qm and qm['data_issues']:
                logger.info("\n⚠️ Data Issues:")
                for issue_type, issues in qm['data_issues'].items():
                    logger.info(f"  • {issue_type}:")
                    for issue in issues[:3]:  # Show first 3 issues
                        logger.info(f"    - {issue}")
                    if len(issues) > 3:
                        logger.info(f"    ... and {len(issues) - 3} more")
            
            # Anomalies
            if 'anomalies_detected' in qm and qm['anomalies_detected']:
                logger.info(f"\n🔴 Anomalies Detected: {len(qm['anomalies_detected'])}")
                for i, anomaly in enumerate(qm['anomalies_detected'][:5], 1):  # Show first 5
                    logger.info(f"  {i}. Type: {anomaly.get('type', 'N/A')}")
                    logger.info(f"     Transaction: {anomaly.get('transaction_id', 'N/A')}")
                    logger.info(f"     Description: {anomaly.get('description', 'N/A')}")
                if len(qm['anomalies_detected']) > 5:
                    logger.info(f"  ... and {len(qm['anomalies_detected']) - 5} more anomalies")
        
        # Sample data
        if 'data' in pr and pr['data']:
            logger.info(f"\n📋 Sample Transactions (first 3 of {len(pr['data'])}):")
            for i, tx in enumerate(pr['data'][:3], 1):
                logger.info(f"  {i}. ID: {tx.get('transaction_id', 'N/A')}")
                logger.info(f"     Amount: ${tx.get('amount', 0):.2f}")
                logger.info(f"     Timestamp: {tx.get('timestamp', 'N/A')}")
                if 'merchant' in tx:
                    logger.info(f"     Merchant: {tx.get('merchant', 'N/A')}")
    
    logger.info("\n" + "="*60)


async def main():
    """Main test function."""
    logger.info("🚀 Starting Raw Data API Test")
    logger.info(f"📁 CSV File: {CSV_FILE_PATH}")
    logger.info(f"🌐 API URL: {API_BASE_URL}")
    logger.info("="*60)
    
    # Create HTTP client
    async with httpx.AsyncClient() as client:
        # Step 1: Create investigation
        logger.info("\n📝 Step 1: Creating investigation...")
        investigation_id = await create_investigation(client)
        
        if not investigation_id:
            logger.error("❌ Failed to create investigation. Exiting.")
            return
        
        # Step 2: Upload CSV file
        logger.info(f"\n📤 Step 2: Uploading CSV file to investigation {investigation_id}...")
        result = await upload_csv_file(client, investigation_id, CSV_FILE_PATH)
        
        # Step 3: Display results
        if result:
            display_results(result)
            logger.info("\n✅ Test completed successfully!")
        else:
            logger.error("\n❌ Test failed - no results received")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("\n⚠️ Test interrupted by user")
        sys.exit(1)
    except Exception as e:
        logger.error(f"\n❌ Unexpected error: {e}")
        sys.exit(1)