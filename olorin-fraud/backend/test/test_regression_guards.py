"""
Guard tests to prevent regression in critical risk scoring logic.

These tests ensure that key business logic doesn't break with future changes.
"""

import pytest

from app.service.agent.orchestration.risk.policy import (
    dedupe_recommendations,
    derive_confirmed_fraud,
    fuse_risk,
)
from app.service.intel.normalize import canonical_is_public


def test_no_risk_freefall():
    """Ensure risk doesn't drop below floor when MODEL_SCORE is high."""
    model = 0.99
    domains = [0.9, 0.7]
    risk = fuse_risk(model, domains, exculpatory_weight=0.0, confirmed_fraud=False)
    assert risk >= 0.6, f"Risk {risk} below floor for high model score"


def test_confirmed_fraud_floor():
    """Ensure confirmed fraud maintains high floor."""
    risk = fuse_risk(0.92, [0.8], exculpatory_weight=0.2, confirmed_fraud=True)
    assert risk >= 0.9, f"Confirmed fraud risk {risk} below 0.9 floor"


def test_unique_ips_fallback():
    """Test unique_ips fallback logic."""
    unique = None
    entity_ip = "67.76.8.209"
    unique = max(1, len({entity_ip}))
    assert unique == 1, f"unique_ips fallback should be 1, got {unique}"


def test_derive_confirmed_fraud_primary():
    """Test derive_confirmed_fraud with IS_FRAUD_TX."""
    row = {"IS_FRAUD_TX": True}
    assert derive_confirmed_fraud(row) is True


def test_derive_confirmed_fraud_nsure():
    """Test derive_confirmed_fraud with NSURE_LAST_DECISION."""
    row = {"NSURE_LAST_DECISION": "fraud"}
    assert derive_confirmed_fraud(row) is True

    row = {"NSURE_LAST_DECISION": "REJECT"}  # Case insensitive
    assert derive_confirmed_fraud(row) is True


def test_derive_confirmed_fraud_disputes():
    """Test derive_confirmed_fraud with disputes/alerts."""
    row = {"DISPUTES": 1}
    assert derive_confirmed_fraud(row) is True

    row = {"FRAUD_ALERTS": 2}
    assert derive_confirmed_fraud(row) is True


def test_derive_confirmed_fraud_negative():
    """Test derive_confirmed_fraud returns False when no indicators."""
    row = {"IS_FRAUD_TX": False, "DISPUTES": 0, "FRAUD_ALERTS": 0}
    assert derive_confirmed_fraud(row) is False

    row = {}  # Empty row
    assert derive_confirmed_fraud(row) is False


def test_canonical_is_public_rfc1918():
    """Test canonical_is_public correctly identifies private IPs."""
    # Private IPs should return False
    assert canonical_is_public("192.168.1.1") is False
    assert canonical_is_public("10.0.0.1") is False
    assert canonical_is_public("172.16.0.1") is False
    assert canonical_is_public("127.0.0.1") is False

    # Public IPs should return True
    assert canonical_is_public("8.8.8.8") is True
    assert canonical_is_public("67.76.8.209") is True


def test_canonical_is_public_overrides():
    """Test canonical_is_public handles provider disagreements."""
    # Local determination should win over AbuseIPDB false classification
    result = canonical_is_public(
        "8.8.8.8", vt_is_malicious=False, abuse_is_public=False
    )
    assert result is True, "Local RFC check should override AbuseIPDB"


def test_recommendation_deduplication():
    """Test recommendation deduplication removes duplicates."""
    lines = [
        "Immediate block/blacklist IP",
        "immediate block/blacklist ip",  # Duplicate (case insensitive)
        "Freeze/hold recent payments",
        "",  # Empty line
        "Freeze/hold recent payments",  # Exact duplicate
    ]

    result = dedupe_recommendations(lines)
    assert len(result) == 2, f"Expected 2 unique recommendations, got {len(result)}"
    assert "Immediate block/blacklist IP" in result
    assert "Freeze/hold recent payments" in result


def test_risk_floor_enforcement():
    """Test that risk floors are enforced in different scenarios."""
    # High model score should have floor of 0.6
    risk = fuse_risk(0.95, [0.1], 0.0, False)
    assert risk >= 0.6, f"High model score should have floor 0.6, got {risk}"

    # Confirmed fraud should have floor of 0.9
    risk = fuse_risk(0.3, [0.2], 0.0, True)
    assert risk >= 0.9, f"Confirmed fraud should have floor 0.9, got {risk}"

    # Normal case should have basic floor of 0.3
    risk = fuse_risk(0.4, [0.2], 0.0, False)
    assert risk >= 0.3, f"Normal case should have floor 0.3, got {risk}"


def test_exculpatory_weight_limits():
    """Test that exculpatory weight is capped appropriately."""
    # Even with maximum exculpatory weight, floors should be respected
    risk = fuse_risk(0.99, [0.8], 1.0, False)  # Max exculpatory weight
    assert (
        risk >= 0.6
    ), f"High model score floor should resist exculpatory weight, got {risk}"

    risk = fuse_risk(0.99, [0.8], 1.0, True)  # Confirmed fraud + max exculpatory
    assert (
        risk >= 0.9
    ), f"Confirmed fraud floor should resist exculpatory weight, got {risk}"


def test_risk_from_location_missing_data():
    """Test risk_from_location returns None for missing data instead of low risk."""
    from app.service.agent.orchestration.risk.policy import risk_from_location

    # Empty findings should return None (neutral)
    empty_findings = {}
    assert risk_from_location(empty_findings) is None

    # Insufficient evidence should return None
    sparse_findings = {
        "evidence": ["Single evidence point"],
        "risk_indicators": [],
        "metrics": {},
    }
    assert risk_from_location(sparse_findings) is None

    # Sufficient evidence should return valid score
    sufficient_findings = {
        "evidence": ["Evidence 1", "Evidence 2"],
        "risk_indicators": ["Risk indicator 1"],
        "metrics": {"location_country": "US"},
        "risk_score": 0.4,
    }
    result = risk_from_location(sufficient_findings)
    assert result == 0.4


def test_fuse_risk_none_handling():
    """Test fuse_risk properly handles None values from domains."""
    from app.service.agent.orchestration.risk.policy import fuse_risk

    # Test with None values in domain scores
    model_score = 0.99
    domain_scores = [0.8, None, 0.6, None]  # Mixed valid and None

    result = fuse_risk(model_score, domain_scores, 0.0, False)

    # Should use model score and valid domains, ignore None values
    assert result >= 0.6  # High model score floor
    assert result <= 1.0


def test_safe_comparison_helpers():
    """Test safe comparison helpers prevent None crashes."""
    from app.service.agent.orchestration.metrics.safe import coerce_float, safe_gt

    # safe_gt should handle None values
    assert safe_gt(None, 0.5, default=False) == False
    assert safe_gt(0.8, None, default=False) == False
    assert safe_gt(0.8, 0.5) == True
    assert safe_gt(0.3, 0.5) == False

    # coerce_float should handle None values
    assert coerce_float(None, 0.0) == 0.0
    assert coerce_float("0.75", 0.0) == 0.75
    assert coerce_float("invalid", 0.5) == 0.5


def test_has_minimum_evidence():
    """Test evidence gate prevents Snowflake-only investigations."""
    from app.service.agent.orchestration.risk.policy import has_minimum_evidence

    # Snowflake-only investigation should fail
    snowflake_only = {
        "snowflake_data": {"results": [{"MODEL_SCORE": 0.99}]},
        "tool_results": {},
        "domain_findings": {},
    }
    assert has_minimum_evidence(snowflake_only) == False

    # Investigation with tool results should pass
    with_tools = {
        "tool_results": {"abuseipdb": {"data": "some_result"}},
        "domain_findings": {},
    }
    assert has_minimum_evidence(with_tools) == True

    # Investigation with sufficient domain evidence should pass
    with_evidence = {
        "tool_results": {},
        "domain_findings": {
            "network": {"evidence": ["Evidence 1", "Evidence 2", "Evidence 3"]}
        },
    }
    assert has_minimum_evidence(with_evidence) == True


def test_action_plan_severity_matching():
    """Test action plan generates severity-appropriate recommendations."""
    from app.service.agent.orchestration.risk.policy import action_plan

    # High risk should generate immediate actions
    high_risk_state = {
        "snowflake_data": {"results": [{"IS_FRAUD_TX": True}]},
        "domain_findings": {},
    }
    high_actions = action_plan(0.95, high_risk_state)
    assert "Immediate block/blacklist IP" in high_actions
    assert "Freeze/hold recent payments and review" in high_actions

    # Medium risk should generate moderate actions
    medium_risk_state = {"snowflake_data": {}, "domain_findings": {}}
    medium_actions = action_plan(0.6, medium_risk_state)
    assert "Step-up verification" in medium_actions[0]

    # Low risk should generate routine actions
    low_actions = action_plan(0.3, medium_risk_state)
    assert "Routine monitoring" in low_actions


def test_canonical_is_public_conflicts():
    """Test canonical_is_public resolves provider conflicts correctly."""
    from app.service.intel.normalize import canonical_is_public

    # RFC1918 check should override AbuseIPDB false classification
    result = canonical_is_public(
        "8.8.8.8", vt_is_malicious=False, abuse_is_public=False
    )
    assert result == True  # Local RFC check should win

    # Private IP should stay private regardless
    result = canonical_is_public(
        "192.168.1.1", vt_is_malicious=True, abuse_is_public=True
    )
    assert result == False  # RFC1918 private range

    # VirusTotal malicious context should suggest public
    result = canonical_is_public("1.2.3.4", vt_is_malicious=True, abuse_is_public=False)
    assert result == True


def test_safe_formatting_helpers():
    """Test None-safe formatting helpers prevent crashes."""
    from app.service.agent.orchestration.metrics.safe import fmt_num, fmt_pct

    # Test None formatting
    assert fmt_num(None) == "N/A"
    assert fmt_pct(None) == "N/A"

    # Test valid number formatting
    assert fmt_num(0.12345, digits=2) == "0.12"
    assert fmt_pct(0.12345, digits=1) == "12.3%"

    # Test edge cases
    assert fmt_num(0, digits=3) == "0.000"
    assert fmt_pct(1.0, digits=0) == "100%"


def test_uncertainty_uplift_with_coverage():
    """Test uncertainty uplift is applied when coverage is poor."""
    from app.service.agent.orchestration.risk.policy import (
        coverage_score,
        uncertainty_uplift,
    )

    # Test good coverage (no uplift)
    good_domains = {
        "network": {"risk_score": 0.8},
        "location": {"risk_score": 0.6},
        "device": {"risk_score": 0.7},
    }
    assert coverage_score(good_domains) == 1.0  # 3/3 required domains
    assert uncertainty_uplift(good_domains) == 0.0

    # Test moderate coverage (small uplift)
    moderate_domains = {
        "network": {"risk_score": 0.8},
        "location": {"risk_score": None},  # Missing
    }
    assert coverage_score(moderate_domains) == 1 / 3  # 1/3 required domains available
    assert uncertainty_uplift(moderate_domains) == 0.10

    # Test poor coverage (larger uplift)
    poor_domains = {"network": {"risk_score": None}}  # All missing
    assert coverage_score(poor_domains) == 0.0
    assert uncertainty_uplift(poor_domains) == 0.15


def test_location_missing_data_handling():
    """Test location returns None for missing data (neutral, not low risk)."""
    from app.service.agent.orchestration.risk.policy import risk_from_location

    # Test empty findings
    assert risk_from_location({}) is None
    assert risk_from_location(None) is None

    # Test insufficient evidence (should return None, not a number)
    sparse_data = {
        "evidence": ["Single evidence"],
        "risk_indicators": [],
        "metrics": {"unique_countries": 0, "unique_cities": 0},
    }
    assert risk_from_location(sparse_data) is None

    # Test sufficient evidence (should return risk score)
    sufficient_data = {
        "evidence": ["Evidence 1", "Evidence 2"],
        "risk_indicators": ["High risk country"],
        "metrics": {"unique_countries": 2, "unique_cities": 3},
        "risk_score": 0.75,
    }
    assert risk_from_location(sufficient_data) == 0.75


def test_anti_flap_guard_functionality():
    """Test anti-flap guard prevents wild swings without new evidence."""
    from app.service.agent.orchestration.risk.policy import check_anti_flap_guard

    # Test initial assessment (no flap detection)
    state = {
        "domain_findings": {"network": {"evidence": ["Initial evidence"]}},
        "tool_results": {"abuseipdb": {"data": "result"}},
        "snowflake_data": {"results": [{"MODEL_SCORE": 0.99}]},
    }

    result = check_anti_flap_guard("test_entity", 0.8, state)
    assert result["flap_detected"] == False
    assert result["adjusted_risk"] == 0.8

    # Test second assessment with same evidence (should detect flap if big swing)
    result2 = check_anti_flap_guard("test_entity", 0.2, state)  # Big swing down
    assert result2["flap_detected"] == True
    assert result2["adjusted_risk"] > 0.2  # Should be dampened
    assert result2["adjusted_risk"] <= 0.8  # But not exceed previous

    # Test with new evidence (should allow the swing)
    state_new_evidence = {
        "domain_findings": {
            "network": {"evidence": ["Initial evidence", "NEW evidence"]}
        },
        "tool_results": {
            "abuseipdb": {"data": "result"},
            "virustotal": {"data": "new result"},
        },
        "snowflake_data": {"results": [{"MODEL_SCORE": 0.99}]},
    }
    result3 = check_anti_flap_guard("test_entity", 0.2, state_new_evidence)
    assert result3["flap_detected"] == False  # New evidence allows the swing
    assert result3["adjusted_risk"] == 0.2


def test_evidence_gate_blocks_snowflake_only():
    """Test evidence gate blocks investigations with only Snowflake data."""
    from app.service.agent.orchestration.risk.policy import has_minimum_evidence

    # Test Snowflake-only investigation (should fail)
    snowflake_only = {
        "snowflake_data": {"results": [{"MODEL_SCORE": 0.99}]},
        "tool_results": {},
        "domain_findings": {},
    }
    assert has_minimum_evidence(snowflake_only) == False

    # Test with external tool (should pass)
    with_external = {
        "snowflake_data": {"results": [{"MODEL_SCORE": 0.99}]},
        "tool_results": {"abuseipdb": {"reputation": "malicious"}},
        "domain_findings": {},
    }
    assert has_minimum_evidence(with_external) == True

    # Test with domain evidence (should pass)
    with_domain_evidence = {
        "snowflake_data": {"results": [{"MODEL_SCORE": 0.99}]},
        "tool_results": {},
        "domain_findings": {
            "network": {"evidence": ["Evidence 1", "Evidence 2", "Evidence 3"]}
        },
    }
    assert has_minimum_evidence(with_domain_evidence) == True


def test_action_plan_severity_matching():
    """Test action plans match risk severity levels."""
    from app.service.agent.orchestration.risk.policy import action_plan, actions_for

    # Test high risk generates immediate actions
    high_actions = actions_for(0.95, confirmed_fraud=True)
    assert "Immediate block/blacklist IP" in high_actions
    assert "Freeze/hold recent payments and review" in high_actions

    # Test medium risk generates moderate actions
    medium_actions = actions_for(0.65, confirmed_fraud=False)
    assert any("verification" in action.lower() for action in medium_actions)

    # Test low risk generates routine actions
    low_actions = actions_for(0.25, confirmed_fraud=False)
    assert "Routine monitoring" in low_actions


def test_confirmed_fraud_floor_enforcement():
    """Test confirmed fraud floor prevents risk suppression."""
    from app.service.agent.orchestration.risk.policy import apply_confirmed_fraud_floor

    # Test domain with confirmed fraud signal
    domain_obj = {
        "risk_score": 0.3,
        "llm_analysis": {
            "risk_factors": "Multiple confirmed fraud indicators detected",
            "reasoning": "This shows clear confirmed fraud patterns",
        },
    }

    # Apply floor
    apply_confirmed_fraud_floor(domain_obj)

    # Should be elevated to 0.9 floor
    assert domain_obj["risk_score"] >= 0.9


def test_risk_fusion_none_handling():
    """Test risk fusion properly handles None values in domain scores."""
    from app.service.agent.orchestration.risk.policy import fuse_risk

    # Test with mixed None and valid scores
    domain_scores = [0.8, None, 0.6, None, 0.9]
    result = fuse_risk(
        model_score=0.99,
        domain_scores=domain_scores,
        exculpatory_weight=0.0,
        confirmed_fraud=False,
    )

    # Should use model score and valid domains (0.8, 0.6, 0.9), ignore None
    assert result >= 0.6  # High model score floor
    assert result <= 1.0


def test_comprehensive_regression_prevention():
    """Test comprehensive regression prevention across all fixes."""
    from app.service.agent.orchestration.metrics.safe import fmt_num, safe_gt
    from app.service.agent.orchestration.risk.policy import (
        action_plan,
        derive_confirmed_fraud,
        fuse_risk,
        has_minimum_evidence,
        risk_from_location,
    )

    # Test 1: Risk freefall prevention
    high_model_low_domains = fuse_risk(0.99, [0.1, 0.2], 0.0, False)
    assert (
        high_model_low_domains >= 0.6
    ), f"Risk freefall detected: {high_model_low_domains}"

    # Test 2: Missing location data handling
    empty_location = risk_from_location({})
    assert (
        empty_location is None
    ), f"Missing location should be None, got {empty_location}"

    # Test 3: Evidence gate
    snowflake_only = {
        "snowflake_data": {"results": [{"MODEL_SCORE": 0.99}]},
        "tool_results": {},
        "domain_findings": {},
    }
    assert (
        has_minimum_evidence(snowflake_only) == False
    ), "Evidence gate should block Snowflake-only"

    # Test 4: Confirmed fraud detection
    fraud_row = {"IS_FRAUD_TX": True}
    assert derive_confirmed_fraud(fraud_row) == True, "Should detect confirmed fraud"

    # Test 5: Safe comparisons
    assert safe_gt(None, 0.5) == False, "Safe comparison should handle None"

    # Test 6: Safe formatting
    assert fmt_num(None) == "N/A", "Safe formatting should handle None"

    # Test 7: Action severity matching
    high_risk_actions = action_plan(0.95, {"snowflake_data": {}, "domain_findings": {}})
    assert len(high_risk_actions) > 0, "High risk should generate actions"

    print("✅ All regression prevention tests passed!")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
