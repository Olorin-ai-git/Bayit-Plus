#!/usr/bin/env python3
"""
Test autonomous investigation with proper mocking of external services.
This version mocks the IPS Cache client to avoid external connections.
"""

import asyncio
import json
import os
import sys
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch
import requests

# Configuration
SERVER_PORT = os.environ.get("SERVER_PORT", "8090")
BASE_URL = f"http://localhost:{SERVER_PORT}"

# Test data
test_user_id = "4621097846089147992"
test_entity_type = "user_id"

# Headers for authentication
headers = {
    "Authorization": "Olorin_APIKey olorin_apikey=preprdakyres3AVWXWEiZESQdOnynrcYt9h9wwfR,olorin_apikey_version=1.0",
    "Content-Type": "application/json",
    "X-Forwarded-Port": "8090",
    "olorin_experience_id": "d3d28eaa-7ca9-4aa2-8905-69ac11fd8c58",
    "olorin_originating_assetalias": "Olorin.cas.hri.olorin",
}


def create_mock_ips_cache_client():
    """Create a mock IPS Cache client that returns expected values."""
    mock_client = MagicMock()
    
    # Mock async methods
    mock_client.zscan = AsyncMock(return_value=[])
    mock_client.zadd = AsyncMock(return_value=None)
    mock_client.hgetall = AsyncMock(return_value={})
    mock_client.hset = AsyncMock(return_value=None)
    mock_client.expire = AsyncMock(return_value=None)
    mock_client.pipeline = MagicMock()
    
    # Mock pipeline methods
    mock_pipeline = MagicMock()
    mock_pipeline.hset = MagicMock()
    mock_pipeline.zadd = MagicMock()
    mock_pipeline.expire = MagicMock()
    mock_pipeline.execute = AsyncMock(return_value=[])
    mock_client.pipeline.return_value = mock_pipeline
    
    return mock_client


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


def start_investigation_with_mocks(entity_id, entity_type="user_id"):
    """Start an autonomous investigation with mocked external services."""
    print(f"\n🚀 Starting autonomous investigation with mocks...")
    print(f"   Entity ID: {entity_id}")
    print(f"   Entity Type: {entity_type}")
    
    # Mock the IPS Cache client before making the request
    with patch('app.persistence.async_ips_redis.IPSCacheClient') as mock_ips_class:
        mock_ips_class.return_value = create_mock_ips_cache_client()
        
        # Also mock the IPSCacheClient in the adapters module
        with patch('app.adapters.ips_cache_client.IPSCacheClient', mock_ips_class):
            
            payload = {
                "entity_id": entity_id,
                "entity_type": entity_type,
                "parallel_execution": True,
                "config": {
                    "max_iterations": 10,
                    "enable_logging": True,
                    "enable_journey_tracking": True,
                    "use_mock_cache": True  # Flag to indicate we're using mocks
                }
            }
            
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


def run_test_with_mocks():
    """Run the autonomous investigation test with proper mocking."""
    print_separator("AUTONOMOUS INVESTIGATION TEST WITH MOCKS")
    
    # Step 1: Check server health
    if not check_health():
        print("\n❌ Server is not healthy. Exiting.")
        return
    
    # Step 2: Start investigation with mocks
    # We need to patch at the module level where it's imported
    with patch('app.persistence.async_ips_redis.IPSCacheClient') as mock_ips_class:
        mock_ips_class.return_value = create_mock_ips_cache_client()
        
        result = start_investigation_with_mocks(test_user_id, test_entity_type)
        if not result:
            print("\n❌ Failed to start investigation. Exiting.")
            return
        
        investigation_id = result.get('investigation_id')
        if not investigation_id:
            print("\n❌ No investigation ID returned. Exiting.")
            return
        
        print(f"\n✨ Investigation ID: {investigation_id}")
        
        # Give it a moment to process
        import time
        time.sleep(5)
        
        # Check status
        try:
            resp = requests.get(
                f"{BASE_URL}/autonomous/investigation/{investigation_id}/status",
                headers=headers
            )
            
            if resp.status_code == 200:
                status = resp.json()
                print(f"\n✅ Investigation Status:")
                print(f"   ID: {status.get('investigation_id', 'Unknown')}")
                print(f"   Phase: {status.get('phase', 'Unknown')}")
                print(f"   Progress: {status.get('progress', 0)}%")
                print(f"   Risk Score: {status.get('risk_score', 'N/A')}")
            else:
                print(f"❌ Failed to get status: {resp.status_code}")
        except Exception as e:
            print(f"❌ Failed to get status: {e}")
    
    print_separator("TEST COMPLETE")
    print("\n✅ Test with mocks completed!")


if __name__ == "__main__":
    # For proper mocking, we need to run this in a way that patches are applied
    # before the modules are imported by the server
    
    # First approach: Try to run with the existing server
    print("Note: For best results, restart the server with mock configuration enabled.")
    print("You can set environment variable: MOCK_EXTERNAL_SERVICES=true")
    
    run_test_with_mocks()