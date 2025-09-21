"""
Mini tests for investigation basics - validating core fixes.

These tests validate the 5 critical fixes implemented to ensure
bulletproof investigations without timing, metrics, or risk issues.
"""

import pytest
from unittest.mock import patch
from typing import Dict, Any

from app.service.agent.orchestration.timing import run_timer
from app.service.agent.orchestration.metrics.network import compute_network_metrics
from app.service.agent.orchestration.risk.policy import apply_confirmed_fraud_floor


def test_duration_is_filled_when_end_missing():
    """Test that timing is bulletproof when end_time is missing or corrupted."""
    
    # Test case 1: Missing end_time with run_timer
    state = {
        "start_time": "2024-01-01T10:00:00.000000Z",
        # end_time is missing
    }
    
    with run_timer(state):
        # Simulate some work
        import time
        time.sleep(0.01)  # 10ms
    
    # Should have filled total_duration_ms from internal timer
    assert "total_duration_ms" in state
    assert isinstance(state["total_duration_ms"], (int, float))
    assert state["total_duration_ms"] > 0
    
    # Test case 2: Test the _ensure_duration functionality directly
    from app.service.agent.orchestration.hybrid.graph.metrics.summary_generator import SummaryGenerator
    
    state2 = {
        "start_time": "2024-01-01T10:00:30.000000Z", 
        "end_time": "2024-01-01T10:00:00.000000Z",  # Earlier than start!
        "total_duration_ms": None,
        "_timer_elapsed_ms": 5000  # Fallback value
    }
    
    # Summary generator should fix this
    components = {"intelligence_mode": "adaptive"}
    generator = SummaryGenerator(components)
    generator._ensure_duration(state2)
    
    # Should have been corrected with authoritative fallback
    assert state2.get("total_duration_ms") is not None
    assert state2["total_duration_ms"] >= 0


def test_unique_ip_minimum_for_ip_entity():
    """Test that IP investigations have minimum unique_ip_count of 1."""
    
    # Test case 1: IP entity with missing metrics
    state = {
        "entity_type": "ip",
        "entity_id": "192.168.1.100",
        "domain_findings": {}
    }
    
    compute_network_metrics(state)
    
    # Should have created network domain with metrics
    assert "network" in state["domain_findings"]
    assert "metrics" in state["domain_findings"]["network"]
    metrics = state["domain_findings"]["network"]["metrics"]
    assert metrics.get("unique_ip_count") == 1
    
    # Test case 2: IP entity with existing 0 count
    state2 = {
        "entity_type": "ip", 
        "entity_id": "10.0.0.1",
        "domain_findings": {
            "network": {
                "metrics": {
                    "unique_ip_count": 0  # Bug: should be at least 1
                }
            }
        }
    }
    
    compute_network_metrics(state2)
    
    # Should have been corrected to minimum 1
    metrics2 = state2["domain_findings"]["network"]["metrics"]
    assert metrics2["unique_ip_count"] == 1
    
    # Test case 3: Non-IP entity should be unchanged
    state3 = {
        "entity_type": "user_id",
        "entity_id": "user123",
        "domain_findings": {
            "network": {
                "metrics": {
                    "unique_ip_count": 0
                }
            }
        }
    }
    
    compute_network_metrics(state3)
    
    # Non-IP entity should keep 0 count
    metrics3 = state3["domain_findings"]["network"]["metrics"]
    assert metrics3["unique_ip_count"] == 0


def test_confirmed_fraud_floor():
    """Test that confirmed fraud signals trigger 0.90 risk floor."""
    
    # Test case 1: Confirmed fraud in LLM analysis
    domain_obj = {
        "risk_score": 0.3,  # Low risk that should be elevated
        "llm_analysis": {
            "risk_factors": "Multiple confirmed fraud indicators detected",
            "reasoning": "This transaction shows confirmed fraud patterns"
        }
    }
    
    apply_confirmed_fraud_floor(domain_obj)
    
    # Should have been elevated to 0.90
    assert domain_obj["risk_score"] == 0.90
    
    # Test case 2: Snowflake IS_FRAUD_TX flag
    domain_obj2 = {
        "risk_score": 0.45,
        "analysis": {
            "records": [
                {"transaction_id": "tx1", "IS_FRAUD_TX": True},
                {"transaction_id": "tx2", "IS_FRAUD_TX": False}
            ]
        }
    }
    
    apply_confirmed_fraud_floor(domain_obj2)
    
    # Should have been elevated to 0.90
    assert domain_obj2["risk_score"] == 0.90
    
    # Test case 3: No fraud indicators - should be unchanged
    domain_obj3 = {
        "risk_score": 0.25,
        "llm_analysis": {
            "risk_factors": "Some minor anomalies detected", 
            "reasoning": "Low risk transaction with normal patterns"
        }
    }
    
    apply_confirmed_fraud_floor(domain_obj3)
    
    # Should remain unchanged
    assert domain_obj3["risk_score"] == 0.25
    
    # Test case 4: Already high risk should not be reduced
    domain_obj4 = {
        "risk_score": 0.95,
        "llm_analysis": {
            "risk_factors": "Some confirmed fraud signals",
            "reasoning": "High risk confirmed fraud case"
        }
    }
    
    apply_confirmed_fraud_floor(domain_obj4)
    
    # Should keep higher score
    assert domain_obj4["risk_score"] == 0.95


if __name__ == "__main__":
    # Run the tests
    test_duration_is_filled_when_end_missing()
    print("✅ test_duration_is_filled_when_end_missing passed")
    
    test_unique_ip_minimum_for_ip_entity()  
    print("✅ test_unique_ip_minimum_for_ip_entity passed")
    
    test_confirmed_fraud_floor()
    print("✅ test_confirmed_fraud_floor passed")
    
    print("\n🎉 All mini tests passed! Core fixes are working correctly.")