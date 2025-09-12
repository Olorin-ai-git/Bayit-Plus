"""
Investigation Linter - Catch narrative/score contradictions before rendering.

This module provides linting guards to detect the exact issues found in the
user's investigation run: narrative mismatches, contract violations, etc.
"""

from typing import List, Dict, Any, Optional
from .domain_result import DomainResult, lint_domain_result
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


def lint_investigation(
    domains: List[DomainResult],
    final_risk: Optional[float],
    investigation_state: Dict[str, Any] = None
) -> List[str]:
    """
    Comprehensive linting for investigation contradictions.
    
    This catches the exact regressions found in the user's run:
    - Logs domain saying "low risk" but outputting 0.793
    - Network domain claiming "insufficient evidence" but outputting 0.9
    - Float(None) crashes in summary generation
    - is_public inconsistencies
    
    Args:
        domains: List of domain results to lint
        final_risk: Final aggregated risk score
        investigation_state: Full investigation state for context
        
    Returns:
        List of detected issues
    """
    errors = []
    
    # 1. Domain-level linting (narrative/score contradictions)
    for domain in domains:
        domain_errors = lint_domain_result(domain)
        errors.extend(domain_errors)
    
    # 2. Cross-domain consistency checks
    errors.extend(_lint_cross_domain_consistency(domains))
    
    # 3. Aggregation safety checks
    errors.extend(_lint_aggregation_safety(domains, final_risk))
    
    # 4. Rendering safety checks  
    errors.extend(_lint_rendering_safety(final_risk, domains))
    
    # 5. Investigation state consistency (if provided)
    if investigation_state:
        errors.extend(_lint_state_consistency(investigation_state, domains, final_risk))
    
    # Log all detected issues
    if errors:
        logger.error(f"🚨 LINTING FAILURES DETECTED ({len(errors)} issues):")
        for i, error in enumerate(errors, 1):
            logger.error(f"  {i}. {error}")
    else:
        logger.info("✅ All linting checks passed")
    
    return errors


def _lint_cross_domain_consistency(domains: List[DomainResult]) -> List[str]:
    """Check for cross-domain inconsistencies."""
    errors = []
    
    # Check for is_public disagreements (should be deterministic)
    public_values = []
    for domain in domains:
        if hasattr(domain, 'is_public') and domain.is_public is not None:
            public_values.append((domain.name, domain.is_public))
    
    if len(set(val for _, val in public_values)) > 1:
        # Multiple different is_public values - should be impossible with deterministic computation
        values_str = ", ".join(f"{name}={val}" for name, val in public_values)
        errors.append(f"is_public inconsistency: {values_str} (should be deterministic)")
    
    # Check for impossible score combinations
    high_scores = [d for d in domains if d.score and d.score > 0.8]
    insufficient_domains = [d for d in domains if d.status == "INSUFFICIENT_EVIDENCE"]
    
    if len(high_scores) > 2 and len(insufficient_domains) > 0:
        errors.append(f"Suspicious: {len(high_scores)} high scores but {len(insufficient_domains)} insufficient domains")
    
    return errors


def _lint_aggregation_safety(domains: List[DomainResult], final_risk: Optional[float]) -> List[str]:
    """Check aggregation logic safety."""
    errors = []
    
    numeric_scores = [d.score for d in domains if isinstance(d.score, (int, float))]
    
    # Check for impossible aggregation results
    if final_risk is not None:
        if not numeric_scores:
            errors.append("final_risk is numeric but no domain scores available")
        elif final_risk < 0.0 or final_risk > 1.0:
            errors.append(f"final_risk out of bounds: {final_risk}")
        else:
            # Check if final_risk is reasonable given input scores
            if numeric_scores:
                min_score = min(numeric_scores)
                max_score = max(numeric_scores)
                
                # Allow fraud floor to elevate score above max domain score
                if final_risk < min_score * 0.5:  # Shouldn't drop too far below minimum
                    errors.append(f"final_risk {final_risk:.3f} suspiciously low vs domain range [{min_score:.3f}, {max_score:.3f}]")
    
    return errors


def _lint_rendering_safety(final_risk: Optional[float], domains: List[DomainResult]) -> List[str]:
    """Check for rendering safety issues that cause float(None) crashes."""
    errors = []
    
    # The exact issue from user's run: float(None) in summary generation
    if final_risk is None:
        # This should be safe now, but verify no renderer tries to cast to float
        for domain in domains:
            if domain.score is None and domain.status == "OK":
                errors.append(f"Domain {domain.name} has status=OK but score=None (renderer risk)")
    
    # Check narrative consistency with None scores
    for domain in domains:
        if domain.score is None:
            # Narrative should acknowledge insufficient evidence
            narrative_lower = domain.narrative.lower()
            if not any(term in narrative_lower for term in ["insufficient", "no", "limited", "unavailable"]):
                errors.append(f"Domain {domain.name} score=None but narrative doesn't indicate insufficient evidence")
    
    return errors


def _lint_state_consistency(
    state: Dict[str, Any], 
    domains: List[DomainResult], 
    final_risk: Optional[float]
) -> List[str]:
    """Check investigation state consistency."""
    errors = []
    
    # Check state risk_score matches final_risk
    state_risk = state.get("risk_score")
    if state_risk != final_risk:
        errors.append(f"state.risk_score ({state_risk}) != final_risk ({final_risk})")
    
    # Check domain findings consistency
    domain_findings = state.get("domain_findings", {})
    for domain in domains:
        finding = domain_findings.get(domain.name, {})
        finding_score = finding.get("risk_score")
        
        if finding_score != domain.score:
            errors.append(f"Domain {domain.name}: finding.risk_score ({finding_score}) != domain.score ({domain.score})")
    
    # Check for the specific pattern that caused the user's crash
    errors_list = state.get("errors", [])
    float_none_errors = [e for e in errors_list if "float() argument must be a string or a real number, not 'NoneType'" in str(e)]
    if float_none_errors:
        errors.append(f"CRITICAL: float(None) crashes detected in state.errors: {len(float_none_errors)} occurrences")
    
    return errors


def assert_investigation_safety(
    domains: List[DomainResult],
    final_risk: Optional[float],
    investigation_state: Dict[str, Any] = None
) -> None:
    """
    Assert investigation safety - raise on critical issues.
    
    This provides hard stops for the exact regressions the user reported.
    
    Args:
        domains: Domain results
        final_risk: Final risk score
        investigation_state: Investigation state
        
    Raises:
        AssertionError: If critical safety violations detected
    """
    errors = lint_investigation(domains, final_risk, investigation_state)
    
    # Critical errors that should stop processing
    critical_patterns = [
        "float(None)",
        "score present but status=INSUFFICIENT_EVIDENCE",
        "out of bounds",
        "final_risk is numeric but no domain scores"
    ]
    
    critical_errors = []
    for error in errors:
        if any(pattern in error for pattern in critical_patterns):
            critical_errors.append(error)
    
    if critical_errors:
        logger.error(f"🚨 CRITICAL SAFETY VIOLATIONS: {len(critical_errors)} issues")
        for error in critical_errors:
            logger.error(f"  CRITICAL: {error}")
        
        # Raise with first critical error
        raise AssertionError(f"Investigation safety violation: {critical_errors[0]}")
    
    # Non-critical warnings
    warnings = [e for e in errors if e not in critical_errors]
    if warnings:
        logger.warning(f"⚠️  Investigation linting warnings: {len(warnings)} issues")
        for warning in warnings:
            logger.warning(f"  WARNING: {warning}")


def lint_specific_user_regressions(domains: List[DomainResult], final_risk: Optional[float]) -> Dict[str, bool]:
    """
    Check for the specific regressions the user reported.
    
    Returns:
        Dictionary of regression checks with pass/fail status
    """
    checks = {
        "logs_narrative_score_mismatch": False,
        "network_insufficient_but_scored": False, 
        "final_risk_float_none_crash": False,
        "is_public_reconciliation_issue": False
    }
    
    # Check 1: logs domain says "low risk" but outputs 0.793
    logs_domain = next((d for d in domains if d.name == "logs"), None)
    if logs_domain:
        if "low risk" in logs_domain.narrative.lower() and logs_domain.score and logs_domain.score > 0.4:
            checks["logs_narrative_score_mismatch"] = True
    
    # Check 2: network domain claims "insufficient evidence" but outputs 0.9
    network_domain = next((d for d in domains if d.name == "network"), None)
    if network_domain:
        if (network_domain.status == "INSUFFICIENT_EVIDENCE" or "insufficient" in network_domain.narrative.lower()) and network_domain.score:
            checks["network_insufficient_but_scored"] = True
    
    # Check 3: final score still N/A → potential float(None) crash
    if final_risk is None:
        checks["final_risk_float_none_crash"] = True  # Potential risk
    
    # Check 4: is_public reconciliation instead of computation
    # This would be detected in cross-domain consistency checks
    
    return checks