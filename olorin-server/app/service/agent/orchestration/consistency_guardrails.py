"""
Consistency Guardrails

Implements consistency checks as specified in the user's tight fix plan:
1. Narrative-numeric agreement
2. No model-score driver detection 
3. Aggregator vs Publish validation
"""

import re
from typing import Dict, Any, List
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


def uses_model_score(narrative_text: str) -> bool:
    """
    Detect if narrative text inappropriately uses MODEL_SCORE as a risk driver.
    
    Args:
        narrative_text: Text to analyze for MODEL_SCORE references
        
    Returns:
        True if text uses MODEL_SCORE as risk justification
    """
    # Convert to lowercase for case-insensitive matching
    text_lower = narrative_text.lower()
    
    # Patterns that indicate MODEL_SCORE is being used as a risk driver
    forbidden_patterns = [
        r'high.*model.*score.*\d+\.\d+',
        r'model.*score.*indicates',
        r'based.*on.*model.*score',
        r'due.*to.*model.*score',
        r'model.*score.*of.*\d+\.\d+.*suggests',
        r'risk.*driven.*by.*model.*score',
        r'model.*score.*justifies',
        r'because.*model.*score.*is.*high',
        r'model.*score.*\d+\.\d+.*shows'
    ]
    
    for pattern in forbidden_patterns:
        if re.search(pattern, text_lower):
            logger.warning(f"🚫 Detected MODEL_SCORE usage in narrative: {pattern}")
            return True
    
    return False


def validate_narrative_numeric_agreement(domain: str, findings: Dict[str, Any]) -> List[str]:
    """
    Validate that domain narrative agrees with numeric assessment.
    
    Args:
        domain: Domain name
        findings: Domain findings with narrative and risk_score
        
    Returns:
        List of validation issues found
    """
    issues = []
    
    if not findings:
        return issues
    
    risk_score = findings.get("risk_score", 0.0)
    llm_analysis = findings.get("llm_analysis", {})
    reasoning = llm_analysis.get("reasoning", "")
    
    # Check for narrative-numeric mismatch
    if risk_score <= 0.4:  # Low risk numeric
        # Narrative should NOT mention high risk
        high_risk_phrases = ["high risk", "critical risk", "severe", "dangerous", "immediate threat"]
        for phrase in high_risk_phrases:
            if phrase.lower() in reasoning.lower():
                issues.append(f"{domain}: Low numeric risk ({risk_score:.2f}) but narrative mentions '{phrase}'")
    
    # Check for low data volume mismatch
    if "limited data" in reasoning.lower() or "1 transaction" in reasoning.lower():
        if risk_score > 0.4:
            issues.append(f"{domain}: Narrative mentions limited data but risk_score is {risk_score:.2f} > 0.4")
    
    # Check for MINIMAL external TI mismatch
    if "minimal" in reasoning.lower() and "external" in reasoning.lower():
        if risk_score > 0.4:
            issues.append(f"{domain}: Narrative mentions MINIMAL external TI but risk_score is {risk_score:.2f} > 0.4")
    
    return issues


def validate_no_model_score_driver(domain: str, findings: Dict[str, Any]) -> bool:
    """
    Validate that domain doesn't use MODEL_SCORE as a risk driver.
    
    Args:
        domain: Domain name
        findings: Domain findings with narrative
        
    Returns:
        True if MODEL_SCORE usage detected (validation failed)
    """
    llm_analysis = findings.get("llm_analysis", {})
    reasoning = llm_analysis.get("reasoning", "")
    risk_factors = llm_analysis.get("risk_factors", "")
    
    # Check reasoning and risk factors for MODEL_SCORE usage
    if uses_model_score(reasoning) or uses_model_score(risk_factors):
        logger.error(f"🚫 {domain}: Uses MODEL_SCORE as risk driver - domain weight set to 0")
        return True
    
    return False


def validate_aggregator_vs_publish_consistency(calculated_risk: float, published_risk: float, tolerance: float = 0.05) -> bool:
    """
    Validate consistency between aggregated risk and published risk.
    
    Args:
        calculated_risk: Risk calculated by aggregator
        published_risk: Risk that will be published
        tolerance: Maximum allowed difference
        
    Returns:
        True if consistent, False if mismatch detected
    """
    if calculated_risk is None or published_risk is None:
        return True  # Can't validate None values
    
    difference = abs(calculated_risk - published_risk)
    if difference > tolerance:
        logger.error(f"🚫 PUBLISH_MISMATCH: calculated={calculated_risk:.3f}, published={published_risk:.3f}, diff={difference:.3f}")
        return False
    
    return True


def apply_consistency_guardrails(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Apply all consistency guardrails to investigation state.
    
    Args:
        state: Investigation state
        
    Returns:
        Updated state with consistency issues flagged
    """
    issues = []
    domains_with_model_score_usage = []
    
    domain_findings = state.get("domain_findings", {})
    
    for domain, findings in domain_findings.items():
        if not isinstance(findings, dict):
            continue
        
        # Check narrative-numeric agreement
        narrative_issues = validate_narrative_numeric_agreement(domain, findings)
        issues.extend(narrative_issues)
        
        # Check for MODEL_SCORE driver usage
        if validate_no_model_score_driver(domain, findings):
            domains_with_model_score_usage.append(domain)
    
    # Zero out weights for domains using MODEL_SCORE
    if domains_with_model_score_usage:
        state["domains_using_model_score"] = domains_with_model_score_usage
        logger.warning(f"🚫 Zeroing weights for domains using MODEL_SCORE: {domains_with_model_score_usage}")
    
    # Store consistency issues
    if issues:
        state["consistency_issues"] = issues
        logger.warning(f"🚫 Consistency issues detected: {len(issues)}")
        for issue in issues:
            logger.warning(f"   - {issue}")
    
    return state


def sanity_check_before_publish(calculated: float, final: float) -> None:
    """
    Perform sanity check before publishing risk score.
    
    Args:
        calculated: Calculated/aggregated risk score
        final: Final risk score to be published
        
    Raises:
        AssertionError: If publish mismatch detected
    """
    if calculated is not None and final is not None:
        difference = abs(calculated - final)
        assert difference <= 0.05, f"publish_mismatch: calculated={calculated:.3f}, final={final:.3f}, diff={difference:.3f}"