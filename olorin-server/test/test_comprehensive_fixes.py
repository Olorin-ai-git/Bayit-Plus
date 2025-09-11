"""
Unit Tests for Comprehensive Investigation Fixes

Tests all fixes implemented based on the user's tight fix plan:
1. Single transaction minimal TI capping
2. No None to zero coercion
3. Null-safe rendering
4. MODEL_SCORE driver blocking
"""

import pytest
from unittest.mock import MagicMock

from app.service.agent.orchestration.risk.evidence_gating import (
    finalize, publish, evidence_strength, is_discordant
)
from app.service.agent.orchestration.metrics.null_safe_formatting import (
    fmt_num, safe_ratio
)
from app.service.agent.orchestration.consistency_guardrails import (
    uses_model_score
)


def test_single_tx_minimal_ti_is_capped():
    """Test that single transaction with minimal TI gets capped at 0.4."""
    result = finalize(
        internal=0.65, 
        external=0.05, 
        ext_level="MINIMAL",
        events=1, 
        agree=0.1, 
        sources=1
    )
    
    assert result["final"] <= 0.40, f"Expected final <= 0.40, got {result['final']}"
    assert result["status"] == "capped_for_low_evidence"
    assert "evidence_strength" in result


def test_no_none_to_zero():
    """Test that None values are not coerced to 0.00 on publish."""
    result = publish(final=None, status="needs_more_evidence")
    
    assert result["display"] == "N/A"
    assert result["status"] == "needs_more_evidence"


def test_renderer_null_safe():
    """Test that null-safe rendering works correctly."""
    assert fmt_num(None) == "N/A"
    assert fmt_num(None, 3) == "N/A"
    assert fmt_num(0.123456, 3) == "0.123"
    assert fmt_num(1.0) == "1.00"
    
    assert safe_ratio(None, 0) == "N/A"
    assert safe_ratio(10, None) == "N/A"
    assert safe_ratio(0, 0) == "N/A"
    assert safe_ratio(10, 2) == "5.00"


def test_block_model_score_driver():
    """Test that MODEL_SCORE driver usage is detected."""
    # Test cases that should be blocked
    blocked_narratives = [
        "High risk due to high model score 0.99",
        "Based on the model score of 0.990, this indicates fraud",
        "Model score 0.99 shows significant risk",
        "Risk driven by model score analysis"
    ]
    
    for narrative in blocked_narratives:
        assert uses_model_score(narrative) is True, f"Should block: {narrative}"
    
    # Test cases that should be allowed
    allowed_narratives = [
        "High risk due to unusual network patterns",
        "Evidence shows suspicious login attempts",
        "Threat intelligence indicates malicious activity",
        "Geographic anomalies suggest fraud"
    ]
    
    for narrative in allowed_narratives:
        assert uses_model_score(narrative) is False, f"Should allow: {narrative}"


def test_evidence_strength_calculation():
    """Test evidence strength calculation logic."""
    # High evidence strength: multiple sources, many events, high agreement
    high_strength = evidence_strength(sources=3, events=10, agree=0.9)
    assert high_strength >= 0.7, f"Expected high strength >= 0.7, got {high_strength}"
    
    # Low evidence strength: single source, few events, low agreement
    low_strength = evidence_strength(sources=1, events=1, agree=0.1)
    assert low_strength <= 0.4, f"Expected low strength <= 0.4, got {low_strength}"


def test_discordance_detection():
    """Test discordance detection between internal and external signals."""
    # High internal score + minimal external + single event = discordant
    assert is_discordant(internal=0.8, ext_level="MINIMAL", events=1) is True
    
    # High internal score + high external = not discordant
    assert is_discordant(internal=0.8, ext_level="HIGH", events=1) is False
    
    # Low internal score = not discordant
    assert is_discordant(internal=0.3, ext_level="MINIMAL", events=1) is False
    
    # Multiple events = not discordant
    assert is_discordant(internal=0.8, ext_level="MINIMAL", events=5) is False


def test_fusion_logic():
    """Test risk fusion with 70:30 weighting."""
    from app.service.agent.orchestration.risk.evidence_gating import fuse
    
    # Test 70% internal, 30% external weighting
    result = fuse(internal=1.0, external=0.0)
    expected = 0.7  # 0.7 * 1.0 + 0.3 * 0.0
    assert abs(result - expected) < 0.01, f"Expected {expected}, got {result}"
    
    result = fuse(internal=0.0, external=1.0)
    expected = 0.3  # 0.7 * 0.0 + 0.3 * 1.0
    assert abs(result - expected) < 0.01, f"Expected {expected}, got {result}"


def test_comprehensive_validation_scenario():
    """Test the comprehensive scenario from user's analysis."""
    # Scenario: High MODEL_SCORE + MINIMAL AbuseIPDB
    internal_score = 0.65  # From deterministic domain scoring (no MODEL_SCORE)
    external_score = 0.05   # MINIMAL threat level
    ext_level = "MINIMAL"
    events = 1
    sources = 2  # Snowflake + AbuseIPDB
    agree = 0.1  # Low agreement between high internal and minimal external
    
    result = finalize(
        internal=internal_score,
        external=external_score,
        ext_level=ext_level,
        events=events,
        agree=agree,
        sources=sources
    )
    
    # Should be capped due to discordance
    assert result["final"] <= 0.40, f"Discordant signals should cap at 0.40, got {result['final']}"
    assert result["status"] == "capped_for_low_evidence"
    
    # Evidence strength should be low (0.2-0.4 range)
    assert 0.2 <= result["evidence_strength"] <= 0.4, f"Evidence strength should be 0.2-0.4, got {result['evidence_strength']}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])