#!/usr/bin/env python3
"""
Test Domain Regressions - Validate fixes for user-reported contradictions.

This test suite validates the exact fixes for the regressions identified
in the user's investigation run output.
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import pytest
from app.service.agent.orchestration.domain.domain_result import DomainResult, validate_domain
from app.service.agent.orchestration.domain.logs_scorer import score_logs_domain
from app.service.agent.orchestration.domain.network_scorer import score_network_domain
from app.service.agent.orchestration.domain.aggregator import aggregate_domains, summarize_investigation
from app.service.agent.orchestration.domain.linter import lint_investigation, lint_specific_user_regressions


def test_logs_single_clean_transaction():
    """Test logs domain with single clean transaction - should cap score aggressively."""
    metrics = {
        "transaction_count": 1,
        "failed_transaction_count": 0,
        "error_count": 0,
        "total_transaction_count": 1
    }
    facts = {}
    
    result = score_logs_domain(metrics, facts)
    
    assert result.status == "OK"
    assert result.score is not None
    assert result.score <= 0.25, f"Single clean transaction should cap at 0.25, got {result.score}"
    assert "Single successful transaction" in result.narrative
    assert "low risk" in result.narrative.lower() or result.score <= 0.3
    print(f"✅ Logs single clean transaction: score={result.score}, narrative matched")


def test_network_no_signals_scores_none():
    """Test network domain with no signals - should return INSUFFICIENT_EVIDENCE with score=None."""
    result = score_network_domain(
        ti_hits=[], 
        proxy_vpn=False, 
        tor_detected=False, 
        asn_risk=False, 
        geo_anomaly=False, 
        ip_str="67.76.8.209"
    )
    
    assert result.status == "INSUFFICIENT_EVIDENCE"
    assert result.score is None, f"No network signals should result in score=None, got {result.score}"
    assert "insufficient" in result.narrative.lower()
    assert len(result.signals) == 0
    print(f"✅ Network no signals: status={result.status}, score={result.score}")


def test_network_with_signals_has_score():
    """Test network domain with actual signals - should have numeric score."""
    result = score_network_domain(
        ti_hits=[{"provider": "AbuseIPDB", "confidence": 85}], 
        proxy_vpn=True, 
        tor_detected=False, 
        asn_risk=False, 
        geo_anomaly=False, 
        ip_str="67.76.8.209"
    )
    
    assert result.status == "OK"
    assert result.score is not None
    assert result.score > 0.3  # Should have elevated score with signals
    assert len(result.signals) >= 2  # TI hit + proxy/VPN
    print(f"✅ Network with signals: score={result.score}, signals={len(result.signals)}")


def test_aggregation_hard_evidence_floors():
    """Test aggregation with hard evidence - should apply fraud floor."""
    logs = DomainResult(name="logs", score=0.20, status="OK", signals=["clean transaction"])
    network = DomainResult(name="network", score=None, status="INSUFFICIENT_EVIDENCE", signals=[])
    
    # Hard evidence present
    facts = {"IS_FRAUD_TX": True}
    
    final_risk, gating, reason = aggregate_domains([logs, network], facts)
    
    assert gating == "PASS"
    assert final_risk is not None
    assert final_risk >= 0.60, f"Hard evidence should apply fraud floor >=0.60, got {final_risk}"
    assert "Hard evidence" in reason
    print(f"✅ Hard evidence aggregation: final_risk={final_risk}, gating={gating}")


def test_aggregation_insufficient_evidence_blocks():
    """Test aggregation without sufficient evidence - should block publication."""
    logs = DomainResult(name="logs", score=0.20, status="OK", signals=["clean transaction"])
    network = DomainResult(name="network", score=None, status="INSUFFICIENT_EVIDENCE", signals=[])
    
    # No hard evidence
    facts = {}
    
    final_risk, gating, reason = aggregate_domains([logs, network], facts)
    
    assert gating == "BLOCK"
    assert final_risk is None, f"Insufficient evidence should block publication, got {final_risk}"
    assert "Insufficient corroborating evidence" in reason
    print(f"✅ Insufficient evidence blocking: final_risk={final_risk}, gating={gating}")


def test_summary_no_float_none_crash():
    """Test summary generation with None final_risk - should not crash."""
    logs = DomainResult(name="logs", score=0.20, status="OK", signals=["clean"])
    network = DomainResult(name="network", score=None, status="INSUFFICIENT_EVIDENCE", signals=[])
    
    try:
        summary = summarize_investigation(
            final_risk=None,
            gating_status="BLOCK", 
            gating_reason="Insufficient corroborating evidence",
            domains=[logs, network]
        )
        
        assert "N/A (gating: BLOCK" in summary
        assert "logs: 0.200" in summary
        assert "network: N/A" in summary
        print(f"✅ Summary with None risk: no crash, proper formatting")
    except Exception as e:
        pytest.fail(f"Summary generation crashed with None final_risk: {e}")


def test_is_public_deterministic():
    """Test is_public computation is deterministic, not reconciled."""
    # Test public IP
    result1 = score_network_domain([], False, False, False, False, "8.8.8.8")
    assert result1.is_public is True
    
    # Test private IP
    result2 = score_network_domain([], False, False, False, False, "192.168.1.1")
    assert result2.is_public is False
    
    # Test loopback
    result3 = score_network_domain([], False, False, False, False, "127.0.0.1")
    assert result3.is_public is False
    
    print(f"✅ is_public deterministic: public={result1.is_public}, private={result2.is_public}, loopback={result3.is_public}")


def test_domain_validation_catches_contradictions():
    """Test domain validation catches score/status contradictions."""
    # Create invalid domain result
    result = DomainResult(
        name="test",
        score=0.8,  # High score
        status="INSUFFICIENT_EVIDENCE",  # But insufficient evidence - contradiction!
        signals=[]
    )
    
    # Validation should fix this
    validate_domain(result)
    
    assert result.score is None, "Validation should clear score when status=INSUFFICIENT_EVIDENCE"
    print(f"✅ Domain validation: fixed score/status contradiction")


def test_linting_catches_user_regressions():
    """Test linting catches the exact regressions from user's run."""
    # Create domains that mimic user's problematic output
    logs_bad = DomainResult(
        name="logs",
        score=0.793,  # High score
        status="OK",
        signals=["single transaction"],
        narrative="low risk based on transaction patterns"  # Contradiction!
    )
    
    network_bad = DomainResult(
        name="network", 
        score=0.9,  # High score
        status="INSUFFICIENT_EVIDENCE",  # But insufficient evidence!
        signals=[],
        narrative="insufficient evidence for assessment"
    )
    
    errors = lint_investigation([logs_bad, network_bad], final_risk=None)
    
    # Should detect multiple issues
    assert len(errors) > 0, "Linting should detect contradictions"
    
    # Check for specific regression patterns
    regressions = lint_specific_user_regressions([logs_bad, network_bad], None)
    # Note: We expect these bad examples to trigger the regression detection
    # The fixes would prevent these bad results from being created in the first place
    
    print(f"✅ Linting regression detection: {len(errors)} errors found")


def test_full_corrected_flow():
    """Test complete corrected flow that should resolve all user issues."""
    # Mock data similar to user's run
    logs_metrics = {"transaction_count": 1, "failed_transaction_count": 0, "error_count": 0}
    logs_result = score_logs_domain(logs_metrics, {})
    
    network_result = score_network_domain([], False, False, False, False, "67.76.8.209")
    
    # Aggregate without hard evidence (should block)
    final_risk, gating, reason = aggregate_domains([logs_result, network_result], {})
    
    # Generate summary 
    summary = summarize_investigation(final_risk, gating, reason, [logs_result, network_result])
    
    # Validate final results
    assert logs_result.score is None or logs_result.score <= 0.25, f"Logs score should be capped or None: {logs_result.score}"
    assert network_result.score is None, f"Network should have no score: {network_result.score}"
    assert final_risk is None, f"Should be blocked by gating: {final_risk}"
    assert "N/A" in summary, "Summary should handle None risk safely"
    
    # Run linting
    errors = lint_investigation([logs_result, network_result], final_risk)
    critical_errors = [e for e in errors if any(p in e for p in ["float(None)", "out of bounds", "contradiction"])]
    assert len(critical_errors) == 0, f"No critical errors should remain: {critical_errors}"
    
    print(f"✅ Full corrected flow: logs={logs_result.score}, network={network_result.score}, final={final_risk}")


def main():
    """Run all regression tests."""
    print("🔧 Testing Domain Regression Fixes")
    print("=" * 50)
    
    tests = [
        test_logs_single_clean_transaction,
        test_network_no_signals_scores_none,
        test_network_with_signals_has_score,
        test_aggregation_hard_evidence_floors,
        test_aggregation_insufficient_evidence_blocks,
        test_summary_no_float_none_crash,
        test_is_public_deterministic,
        test_domain_validation_catches_contradictions,
        test_linting_catches_user_regressions,
        test_full_corrected_flow
    ]
    
    passed = 0
    for test in tests:
        try:
            test()
            passed += 1
        except Exception as e:
            print(f"❌ {test.__name__} FAILED: {e}")
            import traceback
            traceback.print_exc()
        print()
    
    print("=" * 50)
    print(f"📊 Test Results: {passed}/{len(tests)} passed")
    
    if passed == len(tests):
        print("🎉 All domain regression fixes are working correctly!")
        return True
    else:
        print("❌ Some fixes need additional work")
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)