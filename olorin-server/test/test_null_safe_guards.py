"""
Test suite for null-safe math helpers and evidence gating functionality.

CRITICAL GUARD TESTS: These tests prevent regressions in null-safe handling,
evidence gating, and LLM narrative isolation.
"""

import pytest
from typing import Dict, Any

from app.service.agent.orchestration.metrics.safe import (
    safe_ratio, safe_mean, fmt_num, fmt_pct, safe_div, safe_gt, coerce_float
)
from app.service.agent.orchestration.risk.policy import (
    prepublish_validate, isolate_llm_narrative, get_engine_risk_only
)


class TestNullSafeMath:
    """Test null-safe mathematical operations."""
    
    def test_safe_ratio_basic(self):
        """Test basic safe ratio calculations."""
        assert safe_ratio(10, 2) == 5.0
        assert safe_ratio(10.5, 2.1) == 5.0
        assert safe_ratio(0, 5) == 0.0
        
    def test_safe_ratio_none_handling(self):
        """Test safe ratio with None values."""
        assert safe_ratio(None, 2) == 0.0
        assert safe_ratio(10, None) == 0.0
        assert safe_ratio(None, None) == 0.0
        assert safe_ratio(None, None, default=999) == 999
        
    def test_safe_ratio_zero_division(self):
        """Test safe ratio with zero denominator."""
        assert safe_ratio(10, 0) == 0.0
        assert safe_ratio(10, 0.0) == 0.0
        assert safe_ratio(10, 0, default=999) == 999
        
    def test_safe_mean_basic(self):
        """Test basic safe mean calculations."""
        assert safe_mean([1, 2, 3, 4, 5]) == 3.0
        assert safe_mean([10.5, 20.5]) == 15.5
        assert safe_mean([5]) == 5.0
        
    def test_safe_mean_none_filtering(self):
        """Test safe mean with None values filtered out."""
        assert safe_mean([1, None, 3, None, 5]) == 3.0
        assert safe_mean([None, None, 10]) == 10.0
        assert safe_mean([None, None, None]) == 0.0
        
    def test_safe_mean_empty_list(self):
        """Test safe mean with empty list."""
        assert safe_mean([]) == 0.0
        assert safe_mean([], default=999) == 999
        
    def test_fmt_num_basic(self):
        """Test basic number formatting."""
        assert fmt_num(3.14159, 2) == "3.14"
        assert fmt_num(3.14159, 3) == "3.142"
        assert fmt_num(100, 1) == "100.0"
        assert fmt_num(0, 0) == "0"
        
    def test_fmt_num_none_handling(self):
        """Test number formatting with None values."""
        assert fmt_num(None) == "N/A"
        assert fmt_num(None, na="Missing") == "Missing"
        assert fmt_num(None, digits=3, na="Unknown") == "Unknown"
        
    def test_fmt_pct_basic(self):
        """Test basic percentage formatting."""
        assert fmt_pct(0.25, 1) == "25.0%"
        assert fmt_pct(0.8543, 2) == "85.43%"
        assert fmt_pct(1.0, 0) == "100%"
        
    def test_fmt_pct_none_handling(self):
        """Test percentage formatting with None values."""
        assert fmt_pct(None) == "N/A"
        assert fmt_pct(None, na="Missing") == "Missing"
        
    def test_safe_gt_none_handling(self):
        """Test safe greater-than with None values."""
        assert safe_gt(5, 3) == True
        assert safe_gt(3, 5) == False
        assert safe_gt(None, 5) == False
        assert safe_gt(5, None) == False
        assert safe_gt(None, None) == False
        assert safe_gt(None, None, default=True) == True


class TestEvidenceGating:
    """Test hard evidence gating functionality."""
    
    def test_single_source_blocking(self):
        """Test that single-source investigations are blocked."""
        state = {
            "tools_used": ["snowflake_query_tool"],
            "evidence_strength": 0.5,
            "entity_id": "192.168.1.1",
            "snowflake_data": {"results": [{"MODEL_SCORE": 0.9}]}
        }
        
        result = prepublish_validate(state)
        
        assert result["status"] == "needs_more_evidence"
        assert result["can_publish_numeric_risk"] == False
        assert result["evidence_gate_passed"] == False
        assert any("Single-source investigation" in issue for issue in result["issues"])
        assert "AbuseIPDB" in str(result["recommended_actions"])
        
    def test_insufficient_evidence_blocking(self):
        """Test that low evidence strength blocks publication."""
        state = {
            "tools_used": ["snowflake_query_tool", "abuseipdb_ip_reputation"],
            "evidence_strength": 0.2,  # Below 0.3 threshold
            "entity_id": "192.168.1.1",
            "snowflake_data": {"results": [{"MODEL_SCORE": 0.9}]}
        }
        
        result = prepublish_validate(state)
        
        assert result["status"] == "needs_more_evidence"
        assert result["can_publish_numeric_risk"] == False
        assert any("Insufficient evidence strength" in issue for issue in result["issues"])
        
    def test_sufficient_evidence_passes(self):
        """Test that sufficient evidence allows publication."""
        state = {
            "tools_used": ["snowflake_query_tool", "abuseipdb_ip_reputation", "virustotal_ip_analysis"],
            "evidence_strength": 0.7,  # Above threshold
            "entity_id": "192.168.1.1",
            "snowflake_data": {"results": [{"MODEL_SCORE": 0.9}]},
            "domain_findings": {
                "network": {"risk_score": 0.8},
                "logs": {"risk_score": 0.6}
            }
        }
        
        result = prepublish_validate(state)
        
        assert result["status"] == "valid"
        assert result["can_publish_numeric_risk"] == True
        assert result["evidence_gate_passed"] == True
        assert len(result["issues"]) == 0
        
    def test_out_of_bounds_domain_scores(self):
        """Test detection of invalid domain risk scores."""
        state = {
            "tools_used": ["snowflake_query_tool", "abuseipdb_ip_reputation"],
            "evidence_strength": 0.5,
            "entity_id": "192.168.1.1",
            "snowflake_data": {"results": [{"MODEL_SCORE": 0.9}]},
            "domain_findings": {
                "network": {"risk_score": 1.5},  # Out of bounds
                "logs": {"risk_score": -0.1}     # Out of bounds
            }
        }
        
        result = prepublish_validate(state)
        
        assert any("Risk score out of bounds" in issue for issue in result["issues"])
        assert any("network" in issue for issue in result["issues"])
        assert any("logs" in issue for issue in result["issues"])


class TestLLMNarrativeIsolation:
    """Test LLM narrative isolation from engine math."""
    
    def test_llm_risk_score_isolation(self):
        """Test that LLM risk_score is moved to claimed_risk."""
        state = {
            "domain_findings": {
                "network": {
                    "llm_analysis": {
                        "risk_score": 0.85,
                        "reasoning": "High risk due to suspicious patterns"
                    },
                    "risk_score": 0.75  # Engine score
                },
                "logs": {
                    "llm_analysis": {
                        "risk_score": 0.65,
                        "confidence": 0.8
                    }
                }
            }
        }
        
        isolate_llm_narrative(state)
        
        # Check network domain
        network_llm = state["domain_findings"]["network"]["llm_analysis"]
        assert "risk_score" not in network_llm
        assert network_llm["claimed_risk"] == 0.85
        assert network_llm["reasoning"] == "High risk due to suspicious patterns"
        
        # Check logs domain  
        logs_llm = state["domain_findings"]["logs"]["llm_analysis"]
        assert "risk_score" not in logs_llm
        assert logs_llm["claimed_risk"] == 0.65
        assert logs_llm["confidence"] == 0.8
        
    def test_get_engine_risk_only(self):
        """Test extraction of engine-only risk scores."""
        # Domain with both engine and LLM scores
        domain_data = {
            "risk_score": 0.75,  # Engine score
            "llm_analysis": {
                "claimed_risk": 0.85,  # LLM claim (isolated)
                "reasoning": "High risk assessment"
            }
        }
        
        engine_risk = get_engine_risk_only(domain_data)
        assert engine_risk == 0.75
        
        # Domain with no risk score
        domain_data_empty = {"llm_analysis": {"claimed_risk": 0.85}}
        engine_risk_empty = get_engine_risk_only(domain_data_empty)
        assert engine_risk_empty is None
        
        # Invalid domain data
        invalid_risk = get_engine_risk_only(None)
        assert invalid_risk is None
        
    def test_no_llm_scores_to_isolate(self):
        """Test isolation when no LLM risk_score fields exist."""
        state = {
            "domain_findings": {
                "network": {
                    "risk_score": 0.75,  # Engine only
                    "llm_analysis": {
                        "reasoning": "Analysis without risk score"
                    }
                }
            }
        }
        
        # Should not raise any errors
        isolate_llm_narrative(state)
        
        # Should remain unchanged
        assert state["domain_findings"]["network"]["risk_score"] == 0.75
        assert "claimed_risk" not in state["domain_findings"]["network"]["llm_analysis"]


class TestGuardIntegration:
    """Test integration of guards in the overall system."""
    
    def test_comprehensive_regression_prevention(self):
        """Test that all guards work together to prevent regressions."""
        # Simulate a problematic state that should be caught
        state = {
            "tools_used": ["snowflake_query_tool"],  # Single source
            "evidence_strength": 0.1,  # Low evidence
            "entity_id": "192.168.1.1",
            "snowflake_data": {"results": [{"MODEL_SCORE": 0.99}]},
            "domain_findings": {
                "network": {
                    "risk_score": 0.85,
                    "llm_analysis": {
                        "risk_score": 0.90,  # Should be isolated
                        "reasoning": "Suspicious activity detected"
                    }
                },
                "logs": {
                    "risk_score": 1.2,  # Out of bounds
                    "llm_analysis": {
                        "risk_score": 0.80
                    }
                }
            }
        }
        
        # Apply LLM isolation
        isolate_llm_narrative(state)
        
        # Apply evidence gating
        validation_result = prepublish_validate(state)
        
        # Verify LLM isolation worked
        assert "risk_score" not in state["domain_findings"]["network"]["llm_analysis"]
        assert state["domain_findings"]["network"]["llm_analysis"]["claimed_risk"] == 0.90
        
        # Verify evidence gating blocked publication
        assert validation_result["status"] == "needs_more_evidence"
        assert not validation_result["can_publish_numeric_risk"]
        
        # Verify issues were detected
        issues = validation_result["issues"]
        assert any("Single-source" in issue for issue in issues)
        assert any("Insufficient evidence" in issue for issue in issues)
        assert any("out of bounds" in issue for issue in issues)
        
        # Verify recommendations provided
        actions = validation_result["recommended_actions"]
        actions_str = str(actions)
        assert "AbuseIPDB" in actions_str
        assert "VirusTotal" in actions_str


if __name__ == "__main__":
    pytest.main([__file__, "-v"])