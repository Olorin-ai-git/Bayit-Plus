#!/usr/bin/env python3
"""
Test script for ATO agents fix validation
Tests if the location agent can properly analyze evidence and return risk scores.
"""

import asyncio
import os
import sys
import logging
from typing import Dict, Any

# Add the project root to the path
sys.path.insert(0, '/Users/gklainert/Documents/olorin/olorin-server')

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Set TEST_MODE for mock testing
os.environ['TEST_MODE'] = 'mock'

async def test_evidence_analyzer():
    """Test the evidence analyzer directly."""
    print("🧠 Testing Evidence Analyzer...")

    try:
        from app.service.agent.evidence_analyzer import get_evidence_analyzer

        evidence_analyzer = get_evidence_analyzer()

        # Test evidence analysis
        test_evidence = [
            "User logged in from unusual location",
            "Device fingerprint changed unexpectedly",
            "Multiple failed login attempts detected",
            "IP address associated with proxy service"
        ]

        test_metrics = {
            "login_attempts": 5,
            "unique_locations": 3,
            "device_changes": 2
        }

        analysis_result = await evidence_analyzer.analyze_domain_evidence(
            domain="location",
            evidence=test_evidence,
            metrics=test_metrics,
            entity_type="ip_address",
            entity_id="192.168.1.1"
        )

        print(f"✅ Evidence Analysis Result:")
        print(f"   Risk Score: {analysis_result.get('risk_score', 'None')}")
        print(f"   Confidence: {analysis_result.get('confidence', 'None')}")
        print(f"   Analysis Type: {analysis_result.get('analysis_type', 'None')}")
        print(f"   Risk Factors: {analysis_result.get('risk_factors', 'None')}")

        return analysis_result.get('risk_score') is not None

    except Exception as e:
        print(f"❌ Evidence analyzer test failed: {e}")
        return False

async def test_location_agent():
    """Test the location domain agent."""
    print("📍 Testing Location Domain Agent...")

    try:
        from app.service.agent.orchestration.domain_agents.location_agent import location_agent_node
        from app.service.agent.orchestration.state_schema import InvestigationState
        from langchain_core.messages import HumanMessage

        # Create comprehensive test state
        test_state = {
            "messages": [HumanMessage(content="Test investigation")],
            "investigation_id": "test_investigation_001",
            "entity_id": "192.168.1.1",
            "entity_type": "ip_address",
            "custom_user_prompt": None,
            "current_phase": "domain_analysis",
            "date_range_days": 7,
            "tool_count": "5-6",
            "snowflake_data": {
                "results": [
                    {
                        "IP": "192.168.1.1",
                        "IP_COUNTRY_CODE": "US",
                        "TX_DATETIME": "2024-01-01T10:00:00",
                        "IS_FRAUD_TX": 0,
                        "MODEL_SCORE": 0.3
                    },
                    {
                        "IP": "192.168.1.2",
                        "IP_COUNTRY_CODE": "CA",
                        "TX_DATETIME": "2024-01-01T12:00:00",
                        "IS_FRAUD_TX": 0,
                        "MODEL_SCORE": 0.4
                    },
                    {
                        "IP": "192.168.1.3",
                        "IP_COUNTRY_CODE": "XX",  # High-risk country
                        "TX_DATETIME": "2024-01-01T14:00:00",
                        "IS_FRAUD_TX": 1,
                        "MODEL_SCORE": 0.8
                    }
                ]
            },
            "tool_results": {},
            "tools_used": [],
            "snowflake_completed": True,
            "domain_findings": {},
            "domains_completed": [],
            "risk_score": 0.0,
            "summary": "",
            "next_action": "",
            "is_completed": False,
            "completion_reason": None,
            "orchestrator_loops": 0,
            "tool_execution_attempts": 0,
            "max_loops_reached": False,
            "execution_start_time": "2024-01-01T10:00:00"
        }

        # Call the location agent
        result = await location_agent_node(test_state)

        location_findings = result.get("domain_findings", {}).get("location", {})
        risk_score = location_findings.get("risk_score")

        print(f"✅ Location Agent Result:")
        print(f"   Risk Score: {risk_score}")
        print(f"   Confidence: {location_findings.get('confidence', 'None')}")
        print(f"   Evidence Count: {len(location_findings.get('evidence', []))}")
        print(f"   LLM Analysis: {'Present' if location_findings.get('llm_analysis') else 'Missing'}")

        return risk_score is not None

    except Exception as e:
        print(f"❌ Location agent test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

async def test_ato_agent_direct():
    """Test the ATO location data agent directly."""
    print("🏢 Testing ATO Location Data Agent...")

    try:
        from app.service.agent.ato_agents.location_data_agent.agent import LocationDataAgent

        # Initialize the agent
        agent = LocationDataAgent(api_keys={})
        await agent.initialize()

        # Test location anomaly detection
        anomalies = await agent.detect_location_anomalies("test_user_123")

        print(f"✅ ATO Location Agent Result:")
        print(f"   Anomalies Detected: {len(anomalies)}")

        if anomalies:
            for i, anomaly in enumerate(anomalies[:3]):  # Show first 3
                print(f"   Anomaly {i+1}: Risk Level {anomaly.risk_level}, Confidence {anomaly.confidence}")

        await agent.shutdown()
        return True

    except Exception as e:
        print(f"❌ ATO location agent test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

async def main():
    """Run all tests."""
    print("🚀 Starting ATO Agents Fix Validation Tests")
    print("=" * 60)

    test_results = []

    # Test 1: Evidence Analyzer
    result1 = await test_evidence_analyzer()
    test_results.append(("Evidence Analyzer", result1))
    print()

    # Test 2: Location Domain Agent
    result2 = await test_location_agent()
    test_results.append(("Location Domain Agent", result2))
    print()

    # Test 3: ATO Location Agent
    result3 = await test_ato_agent_direct()
    test_results.append(("ATO Location Agent", result3))
    print()

    # Summary
    print("=" * 60)
    print("📊 Test Results Summary:")

    passed = 0
    for test_name, result in test_results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"   {test_name}: {status}")
        if result:
            passed += 1

    print(f"\n🎯 Overall: {passed}/{len(test_results)} tests passed")

    if passed == len(test_results):
        print("✅ All tests passed! ATO agents fixes are working correctly.")
        return True
    else:
        print("❌ Some tests failed. ATO agents may still have issues.")
        return False

if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)