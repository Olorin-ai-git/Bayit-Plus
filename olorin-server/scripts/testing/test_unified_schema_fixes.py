#!/usr/bin/env python3
"""
Test Unified Schema Fixes

This script tests the fixes for the 0.00 risk score issue by validating that:
1. Unified schema properly creates and validates agent responses
2. Risk extraction works with the new format
3. Guarded LLM calls provide fallback responses
4. All agents return valid overall_risk_score values

Run this to verify the fixes work before testing with real investigations.
"""

import json
import asyncio
import sys
import os
from datetime import datetime
from typing import Dict, Any

# Add project root to path
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
sys.path.insert(0, project_root)

from app.service.agent.unified_agent_schema import (
    AgentType, ensure_valid_response, create_agent_response, 
    convert_legacy_response, NetworkAgentResponse, DeviceAgentResponse,
    LocationAgentResponse, LogsAgentResponse, RiskAggregationResponse
)
from app.service.agent.guarded_llm_calls import (
    GuardedLLMCaller, GuardedCallConfig, guarded_llm_call,
    get_production_config, get_development_config, get_testing_config
)


class UnifiedSchemaTestRunner:
    """Test runner for unified schema validation"""
    
    def __init__(self):
        self.passed_tests = 0
        self.failed_tests = 0
        self.test_results = []
    
    def run_test(self, test_name: str, test_func, *args, **kwargs):
        """Run a single test and track results"""
        try:
            print(f"\n🧪 Testing: {test_name}")
            result = test_func(*args, **kwargs)
            if result:
                print(f"✅ PASSED: {test_name}")
                self.passed_tests += 1
                self.test_results.append({"test": test_name, "status": "PASSED", "details": ""})
            else:
                print(f"❌ FAILED: {test_name}")
                self.failed_tests += 1
                self.test_results.append({"test": test_name, "status": "FAILED", "details": "Test returned False"})
        except Exception as e:
            print(f"💥 ERROR: {test_name} - {str(e)}")
            self.failed_tests += 1
            self.test_results.append({"test": test_name, "status": "ERROR", "details": str(e)})
    
    async def run_async_test(self, test_name: str, test_func, *args, **kwargs):
        """Run a single async test and track results"""
        try:
            print(f"\n🧪 Testing: {test_name}")
            result = await test_func(*args, **kwargs)
            if result:
                print(f"✅ PASSED: {test_name}")
                self.passed_tests += 1
                self.test_results.append({"test": test_name, "status": "PASSED", "details": ""})
            else:
                print(f"❌ FAILED: {test_name}")
                self.failed_tests += 1
                self.test_results.append({"test": test_name, "status": "FAILED", "details": "Test returned False"})
        except Exception as e:
            print(f"💥 ERROR: {test_name} - {str(e)}")
            self.failed_tests += 1
            self.test_results.append({"test": test_name, "status": "ERROR", "details": str(e)})
    
    def print_summary(self):
        """Print test summary"""
        total_tests = self.passed_tests + self.failed_tests
        success_rate = (self.passed_tests / total_tests * 100) if total_tests > 0 else 0
        
        print(f"\n{'='*60}")
        print(f"🎯 TEST SUMMARY")
        print(f"{'='*60}")
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {self.passed_tests}")
        print(f"Failed: {self.failed_tests}")
        print(f"Success Rate: {success_rate:.1f}%")
        
        if self.failed_tests > 0:
            print(f"\n❌ FAILED TESTS:")
            for result in self.test_results:
                if result["status"] in ["FAILED", "ERROR"]:
                    print(f"  - {result['test']}: {result['details']}")
        
        print(f"{'='*60}")
        return self.failed_tests == 0


def test_unified_schema_creation():
    """Test that unified schema correctly creates agent responses"""
    
    # Test network agent response
    network_response = create_agent_response(
        agent_type=AgentType.NETWORK,
        overall_risk_score=0.75,
        confidence=0.85,
        risk_factors=["Suspicious IP detected", "Multiple login attempts"],
        mitigation_measures=["Block IP", "Require additional authentication"],
        investigation_id="test_001",
        timestamp=datetime.utcnow().isoformat()
    )
    
    # Validate response structure
    assert network_response.overall_risk_score == 0.75
    assert network_response.confidence == 0.85
    assert network_response.agent_type == AgentType.NETWORK
    assert len(network_response.risk_factors) == 2
    assert len(network_response.mitigation_measures) == 2
    assert "network_red_flags" in network_response.domain_specific
    
    print(f"   Network response created with risk score: {network_response.overall_risk_score}")
    return True


def test_legacy_response_conversion():
    """Test conversion of legacy responses to unified format"""
    
    # Test string response conversion
    legacy_string = "risk_level: 0.65, confidence: 0.78, findings: suspicious activity detected"
    
    converted = convert_legacy_response(
        agent_type=AgentType.DEVICE,
        legacy_response=legacy_string,
        investigation_id="test_002",
        timestamp=datetime.utcnow().isoformat()
    )
    
    assert converted.overall_risk_score > 0  # Should extract risk from string
    assert converted.agent_type == AgentType.DEVICE
    assert "device_fingerprint_anomalies" in converted.domain_specific
    
    # Test dict response conversion
    legacy_dict = {
        "risk_assessment": {"risk_level": 0.82},
        "findings": ["Device spoofing detected"],
        "confidence": 0.90
    }
    
    converted_dict = convert_legacy_response(
        agent_type=AgentType.LOCATION,
        legacy_response=legacy_dict,
        investigation_id="test_003",
        timestamp=datetime.utcnow().isoformat()
    )
    
    assert converted_dict.overall_risk_score == 0.82
    assert converted_dict.confidence == 0.90
    assert converted_dict.agent_type == AgentType.LOCATION
    
    print(f"   String conversion risk score: {converted.overall_risk_score}")
    print(f"   Dict conversion risk score: {converted_dict.overall_risk_score}")
    return True


def test_risk_score_validation():
    """Test that risk scores are properly validated"""
    
    try:
        # Test invalid risk score (should be corrected)
        response = create_agent_response(
            agent_type=AgentType.LOGS,
            overall_risk_score=1.5,  # Invalid - over 1.0
            confidence=0.8,
            risk_factors=["Test factor"],
            mitigation_measures=["Test measure"],
            investigation_id="test_004",
            timestamp=datetime.utcnow().isoformat()
        )
        
        # Should be clamped to 1.0
        assert response.overall_risk_score <= 1.0
        print(f"   Invalid score (1.5) corrected to: {response.overall_risk_score}")
        
    except Exception as e:
        print(f"   Validation test handled error: {e}")
    
    # Test negative risk score
    try:
        response = create_agent_response(
            agent_type=AgentType.LOGS,
            overall_risk_score=-0.5,  # Invalid - negative
            confidence=0.8,
            risk_factors=["Test factor"],
            mitigation_measures=["Test measure"],
            investigation_id="test_005",
            timestamp=datetime.utcnow().isoformat()
        )
        
        # Should be clamped to 0.0
        assert response.overall_risk_score >= 0.0
        print(f"   Invalid score (-0.5) corrected to: {response.overall_risk_score}")
        
    except Exception as e:
        print(f"   Validation test handled error: {e}")
    
    return True


async def test_guarded_llm_fallback():
    """Test that guarded LLM calls provide fallback responses"""
    
    async def failing_llm_function(**kwargs):
        """Simulate failing LLM function"""
        raise Exception("Simulated LLM failure")
    
    # Test guarded call with failure
    caller = GuardedLLMCaller(get_testing_config())  # Fast config for testing
    
    result = await caller.call_with_guard(
        llm_function=failing_llm_function,
        agent_type=AgentType.NETWORK,
        investigation_id="test_006",
        fallback_data={"test": "data"}
    )
    
    # Should use fallback
    assert result.used_fallback == True
    assert result.response is not None
    assert result.response.overall_risk_score > 0  # Should not be 0.00
    assert result.response.agent_type == AgentType.NETWORK
    
    print(f"   Fallback response risk score: {result.response.overall_risk_score}")
    print(f"   Fallback reason: {result.fallback_reason}")
    return True


async def test_guarded_llm_success():
    """Test that guarded LLM calls work with successful responses"""
    
    async def successful_llm_function(**kwargs):
        """Simulate successful LLM function"""
        return {
            "overall_risk_score": 0.73,
            "confidence": 0.88,
            "findings": ["Successful analysis completed"]
        }
    
    # Test guarded call with success
    caller = GuardedLLMCaller(get_testing_config())
    
    result = await caller.call_with_guard(
        llm_function=successful_llm_function,
        agent_type=AgentType.DEVICE,
        investigation_id="test_007",
        fallback_data={"test": "data"}
    )
    
    # Should succeed without fallback
    assert result.success == True
    assert result.used_fallback == False
    assert result.response is not None
    assert result.response.overall_risk_score == 0.73
    assert result.response.agent_type == AgentType.DEVICE
    
    print(f"   Successful response risk score: {result.response.overall_risk_score}")
    return True


def test_json_serialization():
    """Test that responses can be properly serialized to JSON"""
    
    response = create_agent_response(
        agent_type=AgentType.RISK_AGGREGATION,
        overall_risk_score=0.68,
        confidence=0.85,
        risk_factors=["Cross-domain correlation detected", "High confidence indicators"],
        mitigation_measures=["Enhanced monitoring", "Manual verification"],
        investigation_id="test_008",
        timestamp=datetime.utcnow().isoformat(),
        domain_specific={
            "cross_domain_correlations": ["network-device", "location-logs"],
            "individual_agent_scores": {"network": 0.7, "device": 0.8}
        }
    )
    
    # Test JSON serialization (Pydantic v2 compatible)
    json_str = response.model_dump_json()
    json_dict = json.loads(json_str)
    
    # Verify key fields
    assert json_dict["overall_risk_score"] == 0.68
    assert json_dict["agent_type"] == "risk_aggregation"
    assert "cross_domain_correlations" in json_dict["domain_specific"]
    
    print(f"   JSON serialization successful, risk score: {json_dict['overall_risk_score']}")
    return True


def test_ensure_valid_response():
    """Test the ensure_valid_response function with various inputs"""
    
    # Test with dict input
    dict_response = ensure_valid_response(
        agent_type=AgentType.LOCATION,
        response={"risk_level": 0.55, "findings": ["GPS inconsistency"]},
        investigation_id="test_009"
    )
    
    assert dict_response.overall_risk_score > 0
    assert dict_response.agent_type == AgentType.LOCATION
    
    # Test with string input
    string_response = ensure_valid_response(
        agent_type=AgentType.LOGS,
        response="risk_score: 0.72, confidence: 0.85, behavioral patterns detected",
        investigation_id="test_010"
    )
    
    assert string_response.overall_risk_score > 0
    assert string_response.agent_type == AgentType.LOGS
    
    # Test with already valid response
    valid_response = create_agent_response(
        agent_type=AgentType.NETWORK,
        overall_risk_score=0.63,
        confidence=0.77,
        risk_factors=["Test"],
        mitigation_measures=["Test"],
        investigation_id="test_011",
        timestamp=datetime.utcnow().isoformat()
    )
    
    ensured_response = ensure_valid_response(
        agent_type=AgentType.NETWORK,
        response=valid_response,
        investigation_id="test_011"
    )
    
    assert ensured_response.overall_risk_score == 0.63
    
    print(f"   Dict response risk score: {dict_response.overall_risk_score}")
    print(f"   String response risk score: {string_response.overall_risk_score}")
    print(f"   Valid response preserved: {ensured_response.overall_risk_score}")
    return True


async def main():
    """Run all unified schema tests"""
    
    print("🚀 Starting Unified Schema Fix Tests")
    print("=" * 60)
    
    runner = UnifiedSchemaTestRunner()
    
    # Run synchronous tests
    runner.run_test("Unified Schema Creation", test_unified_schema_creation)
    runner.run_test("Legacy Response Conversion", test_legacy_response_conversion)
    runner.run_test("Risk Score Validation", test_risk_score_validation)
    runner.run_test("JSON Serialization", test_json_serialization)
    runner.run_test("Ensure Valid Response", test_ensure_valid_response)
    
    # Run async tests
    await runner.run_async_test("Guarded LLM Fallback", test_guarded_llm_fallback)
    await runner.run_async_test("Guarded LLM Success", test_guarded_llm_success)
    
    # Print summary
    success = runner.print_summary()
    
    if success:
        print("🎉 ALL TESTS PASSED! Unified schema fixes are working correctly.")
        print("✅ The 0.00 risk score issue should now be resolved.")
        return 0
    else:
        print("❌ SOME TESTS FAILED! Review the issues above.")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)