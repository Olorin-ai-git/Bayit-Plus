"""
Risk Score Finalization - Uniform risk score computation.

This module provides centralized risk score calculation and finalization
to ensure consistent risk assessment across all investigation components.
"""

from typing import Dict, Any
from app.service.agent.orchestration.metrics.safe import safe_div


def compute_final_risk(state: Dict[str, Any]) -> float:
    """
    Compute final risk score from domain findings with weighted approach.
    
    Args:
        state: Investigation state containing domain findings
        
    Returns:
        Final risk score between 0.0 and 1.0
    """
    # Domain weights based on importance for fraud detection
    weights = {
        "network": 0.25,     # Network-based indicators
        "logs": 0.25,        # Behavioral patterns from logs
        "device": 0.20,      # Device fingerprinting
        "location": 0.15,    # Geographic anomalies
        "authentication": 0.15  # Auth-specific risks
    }
    
    domain_findings = state.get("domain_findings", {})
    total_weight = 0.0
    weighted_sum = 0.0
    
    # Calculate weighted average of domain risk scores
    for domain, weight in weights.items():
        domain_data = domain_findings.get(domain, {})
        risk_score = domain_data.get("risk_score")
        
        if isinstance(risk_score, (int, float)) and risk_score >= 0:
            weighted_sum += weight * risk_score
            total_weight += weight
    
    # Calculate final risk with fallback
    final_risk = safe_div(weighted_sum, total_weight, 0.0) if total_weight > 0 else 0.0
    return round(min(1.0, max(0.0, final_risk)), 2)


def finalize_risk(state: Dict[str, Any]) -> None:
    """
    Finalize risk score in state using uniform computation.
    
    Args:
        state: Investigation state to update with final risk score
    """
    state["risk_score"] = compute_final_risk(state)


def get_risk_breakdown(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Get detailed risk score breakdown by domain.
    
    Args:
        state: Investigation state containing domain findings
        
    Returns:
        Risk breakdown with domain contributions
    """
    weights = {
        "network": 0.25,
        "logs": 0.25, 
        "device": 0.20,
        "location": 0.15,
        "authentication": 0.15
    }
    
    domain_findings = state.get("domain_findings", {})
    breakdown = {
        "final_risk_score": compute_final_risk(state),
        "domain_contributions": {},
        "total_weight_used": 0.0,
        "missing_domains": []
    }
    
    total_weight = 0.0
    for domain, weight in weights.items():
        domain_data = domain_findings.get(domain, {})
        risk_score = domain_data.get("risk_score")
        
        if isinstance(risk_score, (int, float)) and risk_score >= 0:
            contribution = weight * risk_score
            breakdown["domain_contributions"][domain] = {
                "risk_score": risk_score,
                "weight": weight,
                "contribution": round(contribution, 3)
            }
            total_weight += weight
        else:
            breakdown["missing_domains"].append(domain)
    
    breakdown["total_weight_used"] = total_weight
    return breakdown


def validate_risk_consistency(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Validate risk score consistency across the investigation.
    
    Args:
        state: Investigation state to validate
        
    Returns:
        Validation results with any inconsistencies found
    """
    final_risk = state.get("risk_score", 0.0)
    computed_risk = compute_final_risk(state)
    
    validation = {
        "is_consistent": abs(final_risk - computed_risk) < 0.01,
        "state_risk_score": final_risk,
        "computed_risk_score": computed_risk,
        "difference": round(abs(final_risk - computed_risk), 3),
        "issues": []
    }
    
    if not validation["is_consistent"]:
        validation["issues"].append(f"Risk score mismatch: state={final_risk}, computed={computed_risk}")
    
    # Check domain risk scores are valid
    domain_findings = state.get("domain_findings", {})
    for domain, data in domain_findings.items():
        risk_score = data.get("risk_score")
        if risk_score is not None:
            if not isinstance(risk_score, (int, float)):
                validation["issues"].append(f"Domain {domain} has invalid risk_score type: {type(risk_score)}")
            elif risk_score < 0 or risk_score > 1:
                validation["issues"].append(f"Domain {domain} risk_score out of range: {risk_score}")
    
    return validation