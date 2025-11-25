"""
Feature Contribution Calculation.

Calculates feature contributions to predictions for explainability.

Week 9 Phase 3 implementation.
"""

import logging
from typing import Any, Dict, Optional

import numpy as np

from app.service.analytics.model_base import FraudDetectionModel, ModelPrediction

logger = logging.getLogger(__name__)


def normalize_feature_value(feature_name: str, value: Any) -> float:
    """
    Normalize feature value to 0-1 range.

    Args:
        feature_name: Name of the feature
        value: Feature value to normalize

    Returns:
        Normalized value (0.0 to 1.0)
    """
    try:
        float_value = float(value)

        # Common feature ranges
        if "velocity" in feature_name.lower() or "count" in feature_name.lower():
            # Velocity/count features: use log scale
            return min(1.0, np.log1p(float_value) / 5.0)
        elif "amount" in feature_name.lower():
            # Amount features: use log scale
            return min(1.0, np.log1p(float_value) / 10.0)
        elif "score" in feature_name.lower() or "ratio" in feature_name.lower():
            # Already normalized
            return min(1.0, max(0.0, float_value))
        elif "hour" in feature_name.lower():
            # Hour (0-23)
            return float_value / 24.0
        elif "day" in feature_name.lower():
            # Day of week (0-6)
            return float_value / 7.0
        else:
            # Default: assume already in reasonable range
            return min(1.0, max(0.0, float_value / 100.0))

    except (ValueError, TypeError):
        return 0.0


def calculate_feature_contributions(
    prediction: ModelPrediction,
    features: Dict[str, Any],
    model: Optional[FraudDetectionModel],
) -> Dict[str, float]:
    """
    Calculate feature contributions to prediction.

    Uses feature importance and feature values to estimate contributions.

    Args:
        prediction: Model prediction
        features: Input features
        model: Model that generated prediction (for feature importance)

    Returns:
        Dictionary of feature contributions
    """
    contributions = {}

    # Get feature importance from model
    if not model:
        raise ValueError(
            "Model parameter is required for calculating feature contributions. "
            "Cannot calculate contributions without model feature importance."
        )

    importance = model.get_feature_importance()

    # Calculate contributions (importance * normalized_value)
    for feature_name in features:
        feature_value = features[feature_name]

        if feature_value is None:
            contributions[feature_name] = 0.0
            continue

        # Get importance weight
        weight = importance.get(feature_name, 0.1)

        # Normalize feature value (0 to 1)
        normalized_value = normalize_feature_value(feature_name, feature_value)

        # Contribution is weighted normalized value
        contribution = weight * normalized_value * prediction.score

        contributions[feature_name] = contribution

    return contributions
