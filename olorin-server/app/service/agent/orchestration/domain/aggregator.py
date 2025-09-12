"""
Domain Aggregator - SINGLE SOURCE OF TRUTH

This module provides THE ONLY aggregation logic to prevent dual final scores.
All other aggregators should be disabled/deleted to prevent contradictions.
"""

from typing import List, Dict, Any, Tuple, Optional, Iterable
from .domain_result import DomainResult
from .domain_normalize import normalize_domains, get_numeric_domains
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)

# Hard evidence keys that trigger fraud floor
HARD_EVIDENCE_KEYS = {"IS_FRAUD_TX", "chargeback_confirmed", "manual_case_outcome_fraud"}


def aggregate(domains: Iterable[DomainResult], facts: Dict[str, Any]) -> Tuple[Optional[float], Optional[float], str]:
    """
    THE ONLY aggregator - single source of truth to prevent dual finals.
    
    Args:
        domains: Domain results
        facts: Investigation facts
        
    Returns:
        Tuple of (pre_gate_average, final_risk, gating_status)
    """
    # Convert to list and normalize to handle mixed input types
    domain_list = list(domains)
    if domain_list and hasattr(domain_list[0], '_asdict'):
        # Convert DomainResult objects to dictionaries
        domain_dicts = [d._asdict() if hasattr(d, '_asdict') else d.__dict__ for d in domain_list]
    else:
        # Already dictionaries
        domain_dicts = [d if isinstance(d, dict) else d.__dict__ for d in domain_list]
    
    # Normalize domains to prevent KeyError crashes
    normalized_domains = normalize_domains(domain_dicts)
    
    # Get only numeric domains (excludes narrative-only domains like 'risk')
    numeric_domains = get_numeric_domains(normalized_domains)
    numeric = [d["score"] for d in numeric_domains]
    signals = sum(len(d.get("signals", [])) for d in normalized_domains)
    
    # Check for hard evidence
    hard = any([
        facts.get("IS_FRAUD_TX") is True,
        facts.get("chargeback_confirmed") is True, 
        facts.get("manual_case_outcome") == "fraud",
    ])
    
    # Calculate pre-gate average
    pre_gate = (sum(numeric) / len(numeric)) if numeric else None
    
    # Evidence gating and fraud floor logic
    if hard:
        gate = "PASS"
        final = pre_gate if pre_gate is not None else 0.60
        final = max(final, 0.60)  # fraud floor
        logger.info(f"🚨 FRAUD FLOOR: {fmt(final)} (hard evidence bypass)")
    else:
        enough = (len(numeric) >= 2) or (len(numeric) >= 1 and signals >= 2)
        gate = "PASS" if enough else "BLOCK"
        final = pre_gate if gate == "PASS" else None
        
        if gate == "BLOCK":
            logger.info(f"🚫 EVIDENCE GATING: Insufficient evidence (scores={len(numeric)}, signals={signals})")
        else:
            logger.info(f"✅ EVIDENCE GATING: PASS (scores={len(numeric)}, signals={signals})")
    
    logger.info(f"🎯 SINGLE AGGREGATOR: numeric_domains={[d.get('name', 'unknown') for d in numeric_domains]}")
    logger.info(f"🎯 SINGLE AGGREGATOR: scores={numeric}")
    logger.info(f"🎯 SINGLE AGGREGATOR: pre_gate={fmt(pre_gate)}, final={fmt(final)}, gate={gate}")
    return pre_gate, final, gate


def fmt(v: Optional[float]) -> str:
    """Safe formatting - prevents float(None) crashes."""
    return "N/A" if v is None else f"{v:.3f}"


def fmt_score(v: Optional[float]) -> str:
    """Safe score formatting for domain results."""
    return "N/A" if v is None else f"{v:.3f}"


def render_summary(domains: List[DomainResult], pre_gate: Optional[float], final: Optional[float], gate: str) -> str:
    """
    Render investigation summary with single source of truth values.
    
    CRITICAL: Only shows pre_gate and final from the single aggregator.
    No other "calculated risk from N agents" values should be logged.
    """
    lines = [
        "=== SINGLE AGGREGATOR SUMMARY ===",
        f"Pre-gate average: {fmt(pre_gate)}",
        f"Final risk: {fmt(final)} (gating: {gate})"
    ]
    
    lines.append("\nDomain Breakdown:")
    for d in domains:
        lines.append(f"  {d.name}: {fmt(d.score)} | {d.status} | signals={len(d.signals)}")
    
    return "\n".join(lines)


# Legacy compatibility functions - redirect to single aggregator
def aggregate_domains(
    domains: List[DomainResult], 
    facts: Dict[str, Any]
) -> Tuple[Optional[float], str, Optional[str]]:
    """Legacy wrapper - redirects to single aggregator."""
    pre_gate, final, gate = aggregate(domains, facts)
    gating_reason = (
        "Hard evidence detected (confirmed fraud)" if facts.get("IS_FRAUD_TX") else
        f"Evidence check: {len([d for d in domains if d.score is not None])} domains" if gate == "PASS" else
        "Insufficient corroborating evidence"
    )
    return final, gate, gating_reason


def summarize_investigation(
    final_risk: Optional[float],
    gating_status: str,
    gating_reason: Optional[str],
    domains: List[DomainResult]
) -> str:
    """
    Generate investigation summary with consistent narrative.
    
    Args:
        final_risk: Final aggregated risk score
        gating_status: Evidence gating result
        gating_reason: Reason for gating decision
        domains: List of domain results
        
    Returns:
        Formatted summary text
    """
    # Header with final risk (safe formatting)
    if final_risk is None:
        risk_text = f"N/A (gating: {gating_status}"
        if gating_reason:
            risk_text += f" - {gating_reason}"
        risk_text += ")"
        headline = f"Final risk: {risk_text}"
    else:
        headline = f"Final risk: {fmt(final_risk)} (gating: {gating_status})"
    
    # Domain breakdown lines (guaranteed consistent by validation)
    domain_lines = []
    for domain in domains:
        score_text = fmt_score(domain.score)
        status_text = domain.status
        signal_count = len(domain.signals)
        
        line = f"- {domain.name}: {score_text} | {status_text} | signals={signal_count}"
        domain_lines.append(line)
    
    # Summary statistics
    numeric_count = sum(1 for d in domains if d.score is not None)
    total_signals = sum(len(d.signals) for d in domains)
    
    stats_line = f"- Summary: {numeric_count}/{len(domains)} domains scored, {total_signals} total signals"
    
    return "\n".join([headline] + domain_lines + [stats_line])


def get_recommendations_for_risk(
    final_risk: Optional[float],
    hard_evidence: bool,
    domains: List[DomainResult]
) -> List[str]:
    """
    Generate risk-appropriate recommendations.
    
    Args:
        final_risk: Final risk score
        hard_evidence: Whether hard evidence is present
        domains: Domain results for context
        
    Returns:
        List of appropriate recommendations
    """
    recommendations = []
    
    if hard_evidence:
        # Hard evidence recommendations (regardless of score)
        recommendations.extend([
            "IMMEDIATE: Manual review required due to confirmed fraud indicators",
            "IMMEDIATE: Consider account restrictions pending investigation", 
            "IMMEDIATE: Flag for enhanced monitoring and verification",
            "MEDIUM: Review transaction patterns for additional fraud indicators"
        ])
    elif final_risk is None:
        # Insufficient evidence recommendations  
        recommendations.extend([
            "SHORT: Execute additional external validation tools (AbuseIPDB, VirusTotal)",
            "SHORT: Gather more transaction history if available",
            "MEDIUM: Monitor entity for behavioral changes",
            "MEDIUM: Consider temporary enhanced verification steps"
        ])
    elif final_risk >= 0.7:
        # High risk recommendations
        recommendations.extend([
            "IMMEDIATE: Manual review and verification required",
            "IMMEDIATE: Consider blocking or flagging transaction", 
            "SHORT: Execute comprehensive fraud investigation",
            "MEDIUM: Implement enhanced monitoring"
        ])
    elif final_risk >= 0.4:
        # Moderate risk recommendations
        recommendations.extend([
            "SHORT: Additional verification steps recommended",
            "MEDIUM: Enhanced monitoring for behavioral changes",
            "MEDIUM: Consider stepped-up authentication requirements"
        ])
    else:
        # Low risk recommendations
        recommendations.extend([
            "MEDIUM: Continue standard monitoring",
            "LONG: Periodic review recommended"
        ])
    
    # Add domain-specific recommendations
    insufficient_domains = [d for d in domains if d.status == "INSUFFICIENT_EVIDENCE"]
    if insufficient_domains:
        domain_names = [d.name for d in insufficient_domains]
        recommendations.append(f"MEDIUM: Gather additional evidence for {', '.join(domain_names)} domains")
    
    return recommendations