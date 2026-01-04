"""
Domain Aggregator - SINGLE SOURCE OF TRUTH

This module provides THE ONLY aggregation logic to prevent dual final scores.
All other aggregators should be disabled/deleted to prevent contradictions.
"""

from typing import Any, Dict, Iterable, List, Optional, Tuple

from app.service.logging import get_bridge_logger

from .domain_normalize import get_numeric_domains, normalize_domains
from .domain_result import DomainResult

logger = get_bridge_logger(__name__)

# Hard evidence keys that trigger fraud floor
# CRITICAL: IS_FRAUD_TX removed - must not use ground truth labels during investigation
HARD_EVIDENCE_KEYS = {"chargeback_confirmed", "manual_case_outcome_fraud"}


def aggregate(
    domains: Iterable[DomainResult], facts: Dict[str, Any]
) -> Tuple[Optional[float], Optional[float], str]:
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
    if domain_list and hasattr(domain_list[0], "_asdict"):
        # Convert DomainResult objects to dictionaries
        domain_dicts = [
            d._asdict() if hasattr(d, "_asdict") else d.__dict__ for d in domain_list
        ]
    else:
        # Already dictionaries
        domain_dicts = [d if isinstance(d, dict) else d.__dict__ for d in domain_list]

    # Normalize domains to prevent KeyError crashes
    normalized_domains = normalize_domains(domain_dicts)

    # Get only numeric domains (excludes narrative-only domains like 'risk')
    numeric_domains = get_numeric_domains(normalized_domains)
    numeric = [d["score"] for d in numeric_domains]
    signals = sum(len(d.get("signals", [])) for d in normalized_domains)

    # C1 FIX: Track missing/insufficient domains for clear failure reporting
    insufficient_domains = []
    missing_domains = []

    # Identify domains with insufficient evidence
    for domain_dict in normalized_domains:
        domain_name = domain_dict.get("name", "unknown")
        domain_status = domain_dict.get("status", "UNKNOWN")
        domain_score = domain_dict.get("score")
        domain_signals = domain_dict.get("signals", [])

        if domain_status == "INSUFFICIENT_EVIDENCE" or domain_score is None:
            reason = _get_domain_failure_reason(domain_dict)
            insufficient_domains.append(
                {"name": domain_name, "reason": reason, "signals": len(domain_signals)}
            )

    # Check for completely missing expected domains
    expected_domains = {"logs", "network", "device", "location", "authentication"}
    present_domains = {d.get("name") for d in normalized_domains}
    missing_domain_names = expected_domains - present_domains

    if missing_domain_names:
        for missing_name in missing_domain_names:
            missing_domains.append(
                {
                    "name": missing_name,
                    "reason": "Domain not executed or missing from results",
                }
            )

    # Check for hard evidence
    # CRITICAL: No fraud indicators can be used during investigation to prevent data leakage
    # All fraud indicator columns (IS_FRAUD_TX, COUNT_DISPUTES, COUNT_FRAUD_ALERTS, etc.) are excluded
    # Only manual case outcomes can be used (if provided externally, not from Snowflake)
    hard = any(
        [
            facts.get("manual_case_outcome") == "fraud",
        ]
    )

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
            # C1 FIX: Provide detailed failure information
            logger.error(
                f"🚫 AGGREGATION FAILED: Insufficient evidence for risk calculation"
            )
            logger.error(f"   Requirements: ≥2 domain scores OR ≥1 score + ≥2 signals")
            logger.error(f"   Current state: {len(numeric)} scores, {signals} signals")

            if insufficient_domains:
                logger.error(
                    f"   Domains with insufficient evidence ({len(insufficient_domains)}):"
                )
                for domain_info in insufficient_domains:
                    logger.error(
                        f"     - {domain_info['name']}: {domain_info['reason']} (signals: {domain_info['signals']})"
                    )

            if missing_domains:
                logger.error(f"   Missing domains ({len(missing_domains)}):")
                for domain_info in missing_domains:
                    logger.error(
                        f"     - {domain_info['name']}: {domain_info['reason']}"
                    )

            if numeric_domains:
                logger.info(
                    f"   Available domains ({len(numeric_domains)}): {[d.get('name') for d in numeric_domains]}"
                )
        else:
            logger.info(
                f"✅ EVIDENCE GATING: PASS (scores={len(numeric)}, signals={signals})"
            )

    logger.info(
        f"🎯 SINGLE AGGREGATOR: numeric_domains={[d.get('name', 'unknown') for d in numeric_domains]}"
    )
    logger.info(f"🎯 SINGLE AGGREGATOR: scores={numeric}")
    logger.info(
        f"🎯 SINGLE AGGREGATOR: pre_gate={fmt(pre_gate)}, final={fmt(final)}, gate={gate}"
    )
    return pre_gate, final, gate


def _get_domain_failure_reason(domain_dict: Dict[str, Any]) -> str:
    """
    C1 FIX: Generate clear failure reason for a domain with insufficient evidence.

    Args:
        domain_dict: Domain dictionary with score, signals, and status

    Returns:
        Human-readable reason for domain failure
    """
    domain_name = domain_dict.get("name", "unknown")
    score = domain_dict.get("score")
    signals = domain_dict.get("signals", [])
    status = domain_dict.get("status", "UNKNOWN")

    # Build detailed reason
    if score is None and len(signals) == 0:
        return f"No data available - no score and no signals collected"
    elif score is None and len(signals) > 0:
        return (
            f"Insufficient signal quality - {len(signals)} signals but no numeric score"
        )
    elif score is not None and len(signals) == 0:
        return f"Score present ({fmt(score)}) but no supporting signals/evidence"
    elif status == "INSUFFICIENT_EVIDENCE":
        return f"Marked insufficient by domain agent - {len(signals)} signals, score {fmt(score)}"
    else:
        return f"Unknown failure condition - status: {status}"


def fmt(v: Optional[float]) -> str:
    """Safe formatting - prevents float(None) crashes."""
    return "N/A" if v is None else f"{v:.3f}"


def fmt_score(v: Optional[float]) -> str:
    """Safe score formatting for domain results."""
    return "N/A" if v is None else f"{v:.3f}"


def render_summary(
    domains: List[DomainResult],
    pre_gate: Optional[float],
    final: Optional[float],
    gate: str,
) -> str:
    """
    Render investigation summary with single source of truth values.

    CRITICAL: Only shows pre_gate and final from the single aggregator.
    No other "calculated risk from N agents" values should be logged.
    """
    lines = [
        "=== SINGLE AGGREGATOR SUMMARY ===",
        f"Pre-gate average: {fmt(pre_gate)}",
        f"Final risk: {fmt(final)} (gating: {gate})",
    ]

    lines.append("\nDomain Breakdown:")
    for d in domains:
        lines.append(
            f"  {d.name}: {fmt(d.score)} | {d.status} | signals={len(d.signals)}"
        )

    return "\n".join(lines)


# Legacy compatibility functions - redirect to single aggregator
def aggregate_domains(
    domains: List[DomainResult], facts: Dict[str, Any]
) -> Tuple[Optional[float], str, Optional[str]]:
    """
    Legacy wrapper - redirects to single aggregator with enhanced gating reasons.

    C1 FIX: Now provides detailed failure information when aggregation fails.
    """
    pre_gate, final, gate = aggregate(domains, facts)

    # C1 FIX: Build comprehensive gating_reason with specific failure details
    # CRITICAL: No fraud indicators can be used during investigation to prevent data leakage
    # All fraud indicator columns (IS_FRAUD_TX, COUNT_DISPUTES, COUNT_FRAUD_ALERTS, etc.) are excluded
    if facts.get("manual_case_outcome") == "fraud":
        gating_reason = "Hard evidence detected (manual fraud determination)"
    elif gate == "PASS":
        scored_domains = [d for d in domains if d.score is not None]
        gating_reason = f"Evidence check passed: {len(scored_domains)} domains scored"
    else:
        # BLOCK case - provide detailed failure information
        insufficient = [
            d for d in domains if d.status == "INSUFFICIENT_EVIDENCE" or d.score is None
        ]
        scored = [d for d in domains if d.score is not None]

        # Build comprehensive failure reason
        parts = [f"Aggregation blocked: {len(scored)} scored domains (need ≥2)"]

        if insufficient:
            insufficient_names = [d.name for d in insufficient]
            parts.append(f"Insufficient evidence: {', '.join(insufficient_names)}")

        # Check for completely missing domains
        expected_domains = {"logs", "network", "device", "location", "authentication"}
        present_domains = {d.name for d in domains}
        missing = expected_domains - present_domains

        if missing:
            parts.append(f"Missing domains: {', '.join(sorted(missing))}")

        gating_reason = " | ".join(parts)

    return final, gate, gating_reason


def summarize_investigation(
    final_risk: Optional[float],
    gating_status: str,
    gating_reason: Optional[str],
    domains: List[DomainResult],
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
    final_risk: Optional[float], hard_evidence: bool, domains: List[DomainResult]
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
        recommendations.extend(
            [
                "IMMEDIATE: Manual review required due to confirmed fraud indicators",
                "IMMEDIATE: Consider account restrictions pending investigation",
                "IMMEDIATE: Flag for enhanced monitoring and verification",
                "MEDIUM: Review transaction patterns for additional fraud indicators",
            ]
        )
    elif final_risk is None:
        # Insufficient evidence recommendations
        recommendations.extend(
            [
                "SHORT: Execute additional external validation tools (AbuseIPDB, VirusTotal)",
                "SHORT: Gather more transaction history if available",
                "MEDIUM: Monitor entity for behavioral changes",
                "MEDIUM: Consider temporary enhanced verification steps",
            ]
        )
    elif final_risk >= 0.7:
        # High risk recommendations
        recommendations.extend(
            [
                "IMMEDIATE: Manual review and verification required",
                "IMMEDIATE: Consider blocking or flagging transaction",
                "SHORT: Execute comprehensive fraud investigation",
                "MEDIUM: Implement enhanced monitoring",
            ]
        )
    elif final_risk >= 0.4:
        # Moderate risk recommendations
        recommendations.extend(
            [
                "SHORT: Additional verification steps recommended",
                "MEDIUM: Enhanced monitoring for behavioral changes",
                "MEDIUM: Consider stepped-up authentication requirements",
            ]
        )
    else:
        # Low risk recommendations
        recommendations.extend(
            [
                "MEDIUM: Continue standard monitoring",
                "LONG: Periodic review recommended",
            ]
        )

    # Add domain-specific recommendations
    insufficient_domains = [d for d in domains if d.status == "INSUFFICIENT_EVIDENCE"]
    if insufficient_domains:
        domain_names = [d.name for d in insufficient_domains]
        recommendations.append(
            f"MEDIUM: Gather additional evidence for {', '.join(domain_names)} domains"
        )

    return recommendations
