"""
Ensemble Helper Utilities.

Provides common utilities for ensemble operations.

Week 8 Phase 3 implementation.
"""

from typing import List, Set

from app.service.analytics.model_base import ModelPrediction


def combine_features(predictions: List[ModelPrediction]) -> List[str]:
    """
    Combine feature lists from multiple predictions.

    Args:
        predictions: List of model predictions

    Returns:
        Combined list of unique features
    """
    all_features: Set[str] = set()
    for p in predictions:
        all_features.update(p.features_used)
    return list(all_features)
