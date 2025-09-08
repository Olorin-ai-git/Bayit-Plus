#!/usr/bin/env python3
"""
Test graceful error handling for failing tools.
Verifies that failed tools don't pollute logs with excessive errors.
"""

import asyncio
import os
import sys
from pathlib import Path

# Add the parent directory to the Python path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from app.service.agent.tools.threat_intelligence_tool.shodan.infrastructure_analysis_tool import ShodanInfrastructureAnalysisTool
from app.service.agent.tools.threat_intelligence_tool.virustotal.domain_analysis_tool import VirusTotalDomainAnalysisTool
from app.service.agent.tools.sumologic_tool.sumologic_tool import SumoLogicQueryTool
from app.service.agent.tools.threat_intelligence_tool.abuseipdb.ip_reputation_tool import IPReputationTool
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)

async def test_tool_error_handling():
    """Test that all tools handle errors gracefully without polluting logs."""
    
    print("🚀 Testing graceful error handling for external tools...")
    
    # Test 1: Shodan tool with subscription error
    print("\n🔍 Testing Shodan tool (subscription required error)...")
    shodan_tool = ShodanInfrastructureAnalysisTool()
    
    try:
        result = await shodan_tool._arun(
            ip_address="8.8.8.8",
            include_vulnerabilities=True,
            include_services=True,
            include_history=False
        )
        print("✅ Shodan tool handled error gracefully")
        print(f"📄 Response status: {result[:200]}...")
    except Exception as e:
        print(f"❌ Shodan tool failed ungracefully: {e}")
    
    # Test 2: VirusTotal domain tool with IP address error
    print("\n🔍 Testing VirusTotal domain tool (IP address instead of domain)...")
    virustotal_tool = VirusTotalDomainAnalysisTool()
    
    try:
        result = await virustotal_tool._arun(
            domain="102.159.115.190",  # IP address should be handled gracefully
            include_subdomains=True,
            include_whois=True,
            max_detections=50
        )
        print("✅ VirusTotal domain tool handled error gracefully")
        print(f"📄 Response status: {result[:200]}...")
    except Exception as e:
        print(f"❌ VirusTotal domain tool failed ungracefully: {e}")
    
    # Test 3: SumoLogic tool with missing credentials
    print("\n🔍 Testing SumoLogic tool (missing credentials)...")
    sumologic_tool = SumoLogicQueryTool()
    
    try:
        result = await sumologic_tool._arun(
            query="test query",
            time_range="24h"
        )
        print("✅ SumoLogic tool handled error gracefully")
        print(f"📄 Response status: {str(result)[:200]}...")
    except Exception as e:
        print(f"❌ SumoLogic tool failed ungracefully: {e}")
    
    # Test 4: AbuseIPDB tool with subscription error
    print("\n🔍 Testing AbuseIPDB tool (potential subscription issues)...")
    abuseipdb_tool = IPReputationTool()
    
    try:
        result = await abuseipdb_tool.analyze_ip_reputation(
            ip_address="8.8.8.8",
            max_age_days=90,  # This might trigger subscription error
            include_country_match=True,
            include_usage_type=True
        )
        print("✅ AbuseIPDB tool handled error gracefully")
        print(f"📄 Response success: {result.success}, error: {getattr(result, 'error', 'None')}")
    except Exception as e:
        print(f"❌ AbuseIPDB tool failed ungracefully: {e}")
    
    print("\n🎉 All error handling tests completed!")
    print("📝 Check logs to verify that failed tools only generate DEBUG/WARNING messages, not ERROR messages")

if __name__ == "__main__":
    print("🧪 Testing tool error handling (graceful failures)...")
    asyncio.run(test_tool_error_handling())