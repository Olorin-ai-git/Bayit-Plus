"""
Feature Description Utilities.

Provides human-readable descriptions for fraud detection features.

Week 9 Phase 3 implementation.
"""

import logging
from typing import Any

logger = logging.getLogger(__name__)


def describe_feature(feature_name: str, value: Any) -> str:
    """
    Generate human-readable feature description.

    Args:
        feature_name: Name of the feature
        value: Feature value

    Returns:
        Human-readable description string
    """
    if "velocity" in feature_name.lower():
        return f"High transaction velocity detected ({value} transactions)"
    elif "amount" in feature_name.lower():
        return f"Transaction amount: {value}"
    elif "device" in feature_name.lower():
        return f"Device-related risk indicator: {value}"
    elif "geo" in feature_name.lower() or "distance" in feature_name.lower():
        return f"Geographic anomaly detected: {value}"
    elif "pattern" in feature_name.lower():
        return f"Suspicious pattern detected: {feature_name}"
    else:
        return f"{feature_name}: {value}"


def get_risk_level(score: float) -> str:
    """
    Get human-readable risk level from score.

    Args:
        score: Risk score (0.0 to 1.0)

    Returns:
        Risk level string (CRITICAL, HIGH, MEDIUM, LOW, MINIMAL)
    """
    if score >= 0.8:
        return "CRITICAL"
    elif score >= 0.6:
        return "HIGH"
    elif score >= 0.4:
        return "MEDIUM"
    elif score >= 0.2:
        return "LOW"
    else:
        return "MINIMAL"


def generate_explanation_text(
    score: float,
    top_features: list,
    features: dict
) -> str:
    """
    Generate human-readable explanation text.

    Args:
        score: Risk score
        top_features: List of (feature_name, contribution) tuples
        features: All feature values

    Returns:
        Explanation text string
    """
    risk_level = get_risk_level(score)

    if not top_features:
        return f"Risk level: {risk_level} (score: {score:.2f}). No significant features detected."

    # Build explanation
    parts = [f"Risk level: {risk_level} (score: {score:.2f})."]

    parts.append("Key factors:")
    for feature_name, contribution in top_features[:3]:
        feature_value = features.get(feature_name, 0)
        description = describe_feature(feature_name, feature_value)
        parts.append(f"- {description}")

    return " ".join(parts)


def interpret_score_difference(score_diff: float) -> str:
    """
    Interpret score difference between models.

    Args:
        score_diff: Difference in scores

    Returns:
        Interpretation string
    """
    abs_diff = abs(score_diff)

    if abs_diff < 0.1:
        return "Models largely agree on risk assessment"
    elif abs_diff < 0.3:
        return "Models show moderate disagreement"
    else:
        return "Significant disagreement between models - manual review recommended"
