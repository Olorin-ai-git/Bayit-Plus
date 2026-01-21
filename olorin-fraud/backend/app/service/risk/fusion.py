"""
Risk Fusion - Intelligent fusion of internal telemetry with external intelligence.

This module combines multiple risk signals to produce more accurate risk assessments
by appropriately weighting internal transaction data against external threat intelligence.
"""

import json
from typing import Any, Dict, Union

from app.service.intel.normalize import abuseipdb_risk_component
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


def fuse_network_risk(
    internal_tx_risk: float, abuseipdb_payload: Union[str, Dict[str, Any]]
) -> float:
    """
    Fuse internal transaction risk with AbuseIPDB threat intelligence.

    Internal telemetry (transaction model scores, behavior patterns) typically
    carries more weight than external reputation since it's based on actual
    observed behavior in our system.

    Weighting:
    - Internal: 70% (transaction patterns, model scores)
    - External: 30% (threat intelligence reputation)

    Args:
        internal_tx_risk: Risk score from internal transaction analysis (0.0-1.0)
        abuseipdb_payload: AbuseIPDB response (string or dict)

    Returns:
        Fused risk score (0.0-1.0)
    """
    try:
        # Parse payload if string
        if isinstance(abuseipdb_payload, str):
            abuseipdb_data = json.loads(abuseipdb_payload)
        else:
            abuseipdb_data = abuseipdb_payload

        # Extract external risk component
        external_risk = abuseipdb_risk_component(abuseipdb_data)

        # Weighted fusion - internal telemetry carries more weight
        weight_internal = 0.7
        weight_external = 0.3

        fused_risk = (weight_internal * internal_tx_risk) + (
            weight_external * external_risk
        )

        # Ensure result is within bounds
        fused_risk = max(0.0, min(1.0, fused_risk))

        logger.debug(
            f"Risk fusion: internal={internal_tx_risk:.3f} (70%), "
            f"external={external_risk:.3f} (30%), fused={fused_risk:.3f}"
        )

        return round(fused_risk, 3)

    except Exception as e:
        logger.error(f"Failed to fuse network risk: {e}")
        # Fallback to internal risk only
        return max(0.0, min(1.0, internal_tx_risk))


def fuse_domain_risks(
    domain_risks: Dict[str, float], weights: Dict[str, float] = None
) -> float:
    """
    Fuse risk scores from multiple investigation domains.

    Default weights prioritize domains with higher fraud signal:
    - logs: 25% (transaction patterns, failures)
    - location: 20% (geographic anomalies)
    - network: 20% (IP reputation, patterns)
    - authentication: 15% (auth failures, anomalies)
    - device: 10% (device consistency)
    - behavioral: 10% (if present)

    Args:
        domain_risks: Dict mapping domain names to risk scores
        weights: Optional custom weights (must sum to 1.0)

    Returns:
        Weighted average risk score (0.0-1.0)
    """
    if not domain_risks:
        return 0.0

    # Default weights based on fraud detection value
    default_weights = {
        "logs": 0.25,
        "location": 0.20,
        "network": 0.20,
        "authentication": 0.15,
        "device": 0.10,
        "behavioral": 0.10,
    }

    weights = weights or default_weights

    total_weighted_risk = 0.0
    total_weight = 0.0

    for domain, risk in domain_risks.items():
        if domain in weights:
            weight = weights[domain]
            total_weighted_risk += risk * weight
            total_weight += weight

    # Handle case where no domains match weights
    if total_weight == 0:
        # Simple average if no weights match
        return sum(domain_risks.values()) / len(domain_risks)

    # Normalize by actual total weight (handles partial coverage)
    fused_risk = total_weighted_risk / total_weight

    return max(0.0, min(1.0, round(fused_risk, 3)))


def apply_confidence_adjustment(risk_score: float, confidence: float) -> float:
    """
    Adjust risk score based on confidence in the analysis.

    Lower confidence reduces risk score toward baseline (0.5) to avoid
    false positives when data is insufficient.

    Args:
        risk_score: Base risk score (0.0-1.0)
        confidence: Confidence in analysis (0.0-1.0)

    Returns:
        Confidence-adjusted risk score
    """
    if not (0.0 <= confidence <= 1.0):
        confidence = 0.5  # Default to medium confidence

    baseline_risk = 0.5
    adjustment = confidence  # Higher confidence = less adjustment toward baseline

    adjusted_risk = (adjustment * risk_score) + ((1 - adjustment) * baseline_risk)

    return max(0.0, min(1.0, round(adjusted_risk, 3)))
