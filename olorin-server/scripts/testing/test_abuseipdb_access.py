#!/usr/bin/env python3
"""
Test script to verify AbuseIPDB API key access and functionality
"""

import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from app.utils.firebase_secrets import get_firebase_secret
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)

async def test_abuseipdb_access():
    """Test AbuseIPDB API key access and basic functionality"""
    
    print("🔍 Testing AbuseIPDB API Key Access")
    print("=" * 50)
    
    # Test 1: Check if API key can be retrieved from Firebase
    print("\n1. Testing Firebase Secret Access...")
    try:
        api_key = get_firebase_secret("ABUSEIPDB_API_KEY")
        if api_key:
            print(f"   ✅ API key retrieved successfully (length: {len(api_key)})")
            print(f"   First 20 chars: {api_key[:20]}...")
        else:
            print("   ❌ API key not found in Firebase secrets")
            return False
    except Exception as e:
        print(f"   ❌ Error retrieving API key: {e}")
        return False
    
    # Test 2: Initialize AbuseIPDB client
    print("\n2. Testing AbuseIPDB Client Initialization...")
    try:
        from app.service.agent.tools.threat_intelligence_tool.abuseipdb.abuseipdb_client import AbuseIPDBClient
        from app.service.agent.tools.threat_intelligence_tool.abuseipdb.models import AbuseIPDBConfig
        
        config = AbuseIPDBConfig(api_key_secret="ABUSEIPDB_API_KEY")
        client = AbuseIPDBClient(config)
        print("   ✅ AbuseIPDB client initialized successfully")
    except Exception as e:
        print(f"   ❌ Error initializing client: {e}")
        return False
    
    # Test 3: Test IP reputation check with a known safe IP (Google DNS)
    print("\n3. Testing IP Reputation Check...")
    try:
        test_ip = "8.8.8.8"  # Google DNS - should be safe
        print(f"   Testing with IP: {test_ip}")
        
        # Use context manager for proper cleanup
        async with client:
            result = await client.check_ip_reputation(test_ip)
        if result and result.success and result.ip_info:
            print(f"   ✅ IP check successful!")
            print(f"   - IP Address: {result.ip_info.ip_address}")
            print(f"   - Abuse Confidence Score: {result.ip_info.abuse_confidence_percentage}%")
            print(f"   - Usage Type: {result.ip_info.usage_type}")
            print(f"   - ISP: {result.ip_info.isp}")
            print(f"   - Country: {result.ip_info.country_name}")
            print(f"   - Is Whitelisted: {result.ip_info.is_whitelisted}")
            print(f"   - Risk Level: {result.get_risk_level()}")
        else:
            print(f"   ❌ IP check failed or returned no results")
            if result and result.error:
                print(f"   Error: {result.error}")
            return False
    except Exception as e:
        print(f"   ❌ Error checking IP: {e}")
        return False
    
    # Test 4: Test the IP reputation tool directly
    print("\n4. Testing IP Reputation Tool...")
    try:
        from app.service.agent.tools.threat_intelligence_tool.abuseipdb.ip_reputation_tool import IPReputationTool
        
        tool = IPReputationTool()
        tool_result = await tool._arun(ip_address=test_ip)
        print(f"   ✅ Tool execution successful")
        print(f"   Tool output preview: {tool_result[:200]}...")
    except Exception as e:
        print(f"   ❌ Error running tool: {e}")
        return False
    
    print("\n" + "=" * 50)
    print("✅ All tests passed! AbuseIPDB integration is working correctly.")
    return True

if __name__ == "__main__":
    success = asyncio.run(test_abuseipdb_access())
    sys.exit(0 if success else 1)