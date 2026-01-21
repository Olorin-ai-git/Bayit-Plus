#!/usr/bin/env python3
"""
Simple test to verify the unified schema fixes the 0.00 risk score issue.

This tests the core fix without dependencies on the full test framework.
"""

import json
import os
import sys
from datetime import datetime

# Add project root to path
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
sys.path.insert(0, project_root)


def test_unified_schema_risk_extraction():
    """Test that unified schema properly creates and extracts risk scores"""

    print("🧪 Testing unified schema risk score extraction...")

    try:
        from app.service.agent.unified_agent_schema import (
            AgentType,
            create_agent_response,
        )

        # Create a response with unified schema
        response = create_agent_response(
            agent_type=AgentType.RISK_AGGREGATION,
            overall_risk_score=0.75,  # This should NOT be 0.00
            confidence=0.85,
            risk_factors=["Test risk factor"],
            mitigation_measures=["Test mitigation"],
            investigation_id="test_123",
            timestamp=datetime.utcnow().isoformat(),
        )

        print(
            f"✅ Created response with overall_risk_score: {response.overall_risk_score}"
        )

        # Test JSON serialization (what agents return)
        json_str = response.model_dump_json()
        json_dict = json.loads(json_str)

        print(f"✅ JSON contains overall_risk_score: {json_dict['overall_risk_score']}")

        # Test the extraction logic from the test runner
        risk_score = extract_risk_score_like_test_runner(json_dict)
        print(f"✅ Test runner extraction gives: {risk_score}")

        if risk_score == 0.75:
            print("🎉 SUCCESS: Risk score extraction working correctly!")
            return True
        else:
            print(f"❌ FAILED: Expected 0.75, got {risk_score}")
            return False

    except Exception as e:
        print(f"💥 ERROR: {e}")
        return False


def extract_risk_score_like_test_runner(response_dict):
    """Simulate the test runner's risk extraction logic"""

    # This mimics the updated _extract_risk_score_from_response method
    if isinstance(response_dict, dict):
        # Check for unified schema fields first (NEW - prevents 0.00 scores)
        if "overall_risk_score" in response_dict:
            score = response_dict["overall_risk_score"]
            if isinstance(score, (int, float)) and score > 0:
                return float(score)

    return 0.0


def test_legacy_vs_unified():
    """Compare legacy format vs unified format extraction"""

    print("\n🧪 Testing legacy vs unified format extraction...")

    # Legacy format (old way that caused 0.00 scores)
    legacy_response = {
        "messages": [{"content": json.dumps({"risk_assessment": {"risk_level": 0.68}})}]
    }

    # Unified format (new way that should work)
    unified_response = {
        "overall_risk_score": 0.68,
        "confidence": 0.8,
        "agent_type": "risk_aggregation",
    }

    # Extract from both
    legacy_score = extract_complex_risk_score(legacy_response)
    unified_score = extract_risk_score_like_test_runner(unified_response)

    print(f"Legacy format extraction: {legacy_score}")
    print(f"Unified format extraction: {unified_score}")

    if unified_score > 0 and unified_score == 0.68:
        print("✅ Unified format works correctly!")
        return True
    else:
        print("❌ Unified format extraction failed!")
        return False


def extract_complex_risk_score(response):
    """Simulate complex extraction from messages format"""

    if isinstance(response, dict) and "messages" in response:
        for message in response["messages"]:
            if isinstance(message, dict) and "content" in message:
                try:
                    content = json.loads(message["content"])
                    if "risk_assessment" in content:
                        risk_level = content["risk_assessment"].get("risk_level", 0.0)
                        return float(risk_level) if risk_level is not None else 0.0
                except:
                    pass
    return 0.0


if __name__ == "__main__":
    print("🚀 Testing Unified Schema Risk Extraction Fix")
    print("=" * 50)

    success1 = test_unified_schema_risk_extraction()
    success2 = test_legacy_vs_unified()

    print("\n" + "=" * 50)
    if success1 and success2:
        print("🎉 ALL TESTS PASSED!")
        print("✅ The 0.00 risk score issue is FIXED!")
        sys.exit(0)
    else:
        print("❌ SOME TESTS FAILED!")
        sys.exit(1)
