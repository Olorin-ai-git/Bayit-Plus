"""
Calibration and Rule-Overrides Module

Provides model calibration and rule-based overrides for precision optimization.
"""

import json
import os
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)

# Rule-override thresholds from environment variables
CLEAN_INTEL_VETO_THRESHOLD = float(
    os.getenv("CALIBRATION_CLEAN_INTEL_VETO_THRESHOLD", "0.3")
)
IMPOSSIBLE_TRAVEL_HARD_BLOCK_THRESHOLD = float(
    os.getenv("CALIBRATION_IMPOSSIBLE_TRAVEL_HARD_BLOCK_THRESHOLD", "800.0")
)
IP_REPUTATION_CLEAN_VALUES = json.loads(
    os.getenv(
        "CALIBRATION_IP_REPUTATION_CLEAN_VALUES", '["VERY_LOW", "MINIMAL", "LOW"]'
    )
)


def apply_clean_intel_veto(
    risk_score: float,
    ip_reputation: Optional[str],
    advanced_features: Dict[str, Any],
    domain_findings: Dict[str, Any],
) -> Tuple[float, str]:
    """
    Apply clean-intel veto: down-weight risk when IP reputation is clean and no high-weight features fire.

    Args:
        risk_score: Current risk score (0-1)
        ip_reputation: IP reputation level (VERY_LOW, MINIMAL, LOW, MEDIUM, HIGH, VERY_HIGH)
        advanced_features: Advanced feature dictionary
        domain_findings: Domain findings dictionary

    Returns:
        Tuple of (adjusted_risk_score, reason)
    """
    # Check if IP reputation is clean
    is_clean_ip = ip_reputation and ip_reputation.upper() in IP_REPUTATION_CLEAN_VALUES

    if not is_clean_ip:
        return risk_score, "IP reputation not clean"

    # Check for high-weight features
    high_weight_features = []

    # Check velocity features
    if advanced_features.get("tx_per_5min_by_email", 0) > 5:
        high_weight_features.append("high_email_velocity")
    if advanced_features.get("tx_per_5min_by_device", 0) > 5:
        high_weight_features.append("high_device_velocity")
    if advanced_features.get("tx_per_5min_by_ip", 0) > 5:
        high_weight_features.append("high_ip_velocity")

    # Check geovelocity
    if advanced_features.get("impossible_travel_count", 0) > 0:
        high_weight_features.append("impossible_travel")
    if advanced_features.get("distance_anomaly_score", 0) > 0.7:
        high_weight_features.append("high_distance_anomaly")

    # Check amount patterns
    if advanced_features.get("amount_clustering_score", 0) > 0.7:
        high_weight_features.append("amount_clustering")

    # Check device instability
    if advanced_features.get("device_instability_score", 0) > 0.7:
        high_weight_features.append("device_instability")

    # Check domain findings for high-risk indicators
    if domain_findings:
        for domain_name, domain_data in domain_findings.items():
            if isinstance(domain_data, dict):
                risk_score_domain = domain_data.get("risk_score", 0)
                if risk_score_domain and float(risk_score_domain) > 0.7:
                    high_weight_features.append(f"high_{domain_name}_risk")

    # Apply veto if no high-weight features and risk score is below threshold
    if not high_weight_features and risk_score < CLEAN_INTEL_VETO_THRESHOLD:
        # Down-weight by 50%
        adjusted_score = risk_score * 0.5
        reason = f"Clean-intel veto: IP reputation {ip_reputation} with no high-weight features"
        logger.info(
            f"🔽 Applied clean-intel veto: {risk_score:.3f} → {adjusted_score:.3f} ({reason})"
        )
        return adjusted_score, reason

    return risk_score, "No veto applied"


def apply_impossible_travel_hard_block(
    risk_score: float, advanced_features: Dict[str, Any]
) -> Tuple[float, str]:
    """
    Apply hard block for impossible travel (speed >> feasible).

    Args:
        risk_score: Current risk score (0-1)
        advanced_features: Advanced feature dictionary

    Returns:
        Tuple of (adjusted_risk_score, reason)
    """
    max_speed = advanced_features.get("max_travel_speed_mph", 0)

    if max_speed > IMPOSSIBLE_TRAVEL_HARD_BLOCK_THRESHOLD:
        # Hard block: set risk score to 0.95 (very high risk)
        adjusted_score = 0.95
        reason = f"Impossible travel hard block: {max_speed:.0f} mph (threshold: {IMPOSSIBLE_TRAVEL_HARD_BLOCK_THRESHOLD} mph)"
        logger.warning(
            f"🚨 Applied impossible travel hard block: {risk_score:.3f} → {adjusted_score:.3f} ({reason})"
        )
        return adjusted_score, reason

    return risk_score, "No hard block applied"


def apply_rule_overrides(
    risk_score: float,
    ip_reputation: Optional[str],
    advanced_features: Dict[str, Any],
    domain_findings: Dict[str, Any],
) -> Tuple[float, List[str]]:
    """
    Apply all rule-overrides in sequence.

    Args:
        risk_score: Current risk score (0-1)
        ip_reputation: IP reputation level
        advanced_features: Advanced feature dictionary
        domain_findings: Domain findings dictionary

    Returns:
        Tuple of (final_risk_score, list_of_applied_rules)
    """
    applied_rules = []
    current_score = risk_score

    # 1. Check for impossible travel hard block (highest priority)
    blocked_score, block_reason = apply_impossible_travel_hard_block(
        current_score, advanced_features
    )
    if blocked_score != current_score:
        current_score = blocked_score
        applied_rules.append(block_reason)
        # Hard block takes precedence - return early
        return current_score, applied_rules

    # 2. Apply clean-intel veto (only if not hard-blocked)
    vetoed_score, veto_reason = apply_clean_intel_veto(
        current_score, ip_reputation, advanced_features, domain_findings
    )
    if vetoed_score != current_score:
        current_score = vetoed_score
        applied_rules.append(veto_reason)

    return current_score, applied_rules


def calibrate_risk_score(
    base_score: float,
    historical_performance: Optional[Dict[str, float]] = None,
    use_isotonic: bool = True,
) -> float:
    """
    Calibrate risk score using isotonic regression or historical performance data.

    Args:
        base_score: Base risk score (0-1)
        historical_performance: Optional historical performance metrics
        use_isotonic: If True, use isotonic calibration (requires CALIBRATOR_PATH env var)

    Returns:
        Calibrated risk score (0-1)
    """
    # Try isotonic calibration if enabled and calibrator is available
    if use_isotonic:
        try:
            from app.service.analytics.calibration import IsotonicCalibrator

            calibrator = IsotonicCalibrator()
            if calibrator.is_fitted:
                calibrated_score = calibrator.calibrate(base_score)
                logger.debug(
                    f"📊 Isotonic calibrated score: {base_score:.3f} → {calibrated_score:.3f}"
                )
                return calibrated_score
            else:
                logger.debug(
                    "Isotonic calibrator not fitted, falling back to historical calibration"
                )
        except Exception as e:
            logger.debug(
                f"Isotonic calibration not available: {e}, using historical calibration"
            )

    # Fallback to historical performance-based calibration
    if historical_performance:
        precision = historical_performance.get("precision", 0.5)
        recall = historical_performance.get("recall", 0.5)

        # If precision is low, we're over-predicting - adjust scores down slightly
        if precision < 0.3:
            calibration_factor = 0.9
        elif precision < 0.5:
            calibration_factor = 0.95
        else:
            calibration_factor = 1.0

        calibrated_score = base_score * calibration_factor
        logger.debug(
            f"📊 Historical calibrated score: {base_score:.3f} → {calibrated_score:.3f} (precision: {precision:.2f})"
        )
        return min(1.0, max(0.0, calibrated_score))

    # No calibration available
    return base_score


def optimize_precision_at_k(
    transaction_scores: Dict[str, float],
    k: int,
    ground_truth: Optional[Dict[str, int]] = None,
) -> Dict[str, Any]:
    """
    Optimize precision @ k by selecting top-k transactions.

    Args:
        transaction_scores: Dictionary mapping transaction_id to risk score
        k: Number of top transactions to select
        ground_truth: Optional dictionary mapping transaction_id to fraud label (1=fraud, 0=not_fraud)

    Returns:
        Dictionary with:
        - top_k_transactions: List of top-k transaction IDs
        - precision_at_k: Precision if ground_truth provided
        - threshold: Score threshold for top-k
    """
    if not transaction_scores:
        return {"top_k_transactions": [], "precision_at_k": 0.0, "threshold": 0.0}

    # Sort transactions by score (descending)
    sorted_txs = sorted(transaction_scores.items(), key=lambda x: x[1], reverse=True)

    # Get top-k
    top_k = min(k, len(sorted_txs))
    top_k_transactions = [tx_id for tx_id, score in sorted_txs[:top_k]]
    threshold = sorted_txs[top_k - 1][1] if top_k > 0 else 0.0

    # Calculate precision if ground truth available
    precision_at_k = 0.0
    if ground_truth:
        true_positives = sum(
            1 for tx_id in top_k_transactions if ground_truth.get(tx_id) == 1
        )
        precision_at_k = true_positives / top_k if top_k > 0 else 0.0

    return {
        "top_k_transactions": top_k_transactions,
        "precision_at_k": precision_at_k,
        "threshold": threshold,
    }
