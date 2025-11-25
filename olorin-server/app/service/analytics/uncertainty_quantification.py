"""
Uncertainty Quantification Utilities.

Provides uncertainty metrics and confidence interval calculation.

Week 9 Phase 3 implementation.
"""

import logging
from typing import Any, Dict, List

import numpy as np

from app.service.analytics.model_base import ModelPrediction

logger = logging.getLogger(__name__)


def quantify_prediction_uncertainty(
    ensemble_prediction: ModelPrediction, model_predictions: List[ModelPrediction]
) -> Dict[str, float]:
    """
    Quantify uncertainty in prediction.

    Args:
        ensemble_prediction: Ensemble prediction
        model_predictions: Individual model predictions

    Returns:
        Dictionary with uncertainty metrics
    """
    if len(model_predictions) == 0:
        return {
            "prediction_uncertainty": 1.0,
            "model_disagreement": 0.0,
            "confidence_score": 0.0,
        }

    scores = [p.score for p in model_predictions]
    confidences = [p.confidence for p in model_predictions]

    # Prediction uncertainty (variance of scores)
    prediction_std = np.std(scores) if len(scores) > 1 else 0.0
    prediction_uncertainty = min(1.0, prediction_std * 2)

    # Model disagreement (max distance from ensemble)
    if scores:
        max_deviation = max(abs(s - ensemble_prediction.score) for s in scores)
        model_disagreement = min(1.0, max_deviation)
    else:
        model_disagreement = 0.0

    # Overall confidence (inverse of uncertainty)
    avg_confidence = np.mean(confidences) if confidences else 0.5
    uncertainty_penalty = (prediction_uncertainty + model_disagreement) / 2
    confidence_score = avg_confidence * (1.0 - uncertainty_penalty)

    return {
        "prediction_uncertainty": prediction_uncertainty,
        "model_disagreement": model_disagreement,
        "confidence_score": confidence_score,
        "avg_model_confidence": avg_confidence,
        "score_std": prediction_std,
    }


def calculate_expected_calibration_error(
    labeled_predictions: List[Dict[str, Any]],
) -> float:
    """
    Calculate expected calibration error (ECE).

    Args:
        labeled_predictions: List of predictions with labels

    Returns:
        Expected calibration error (0.0 to 1.0)
    """
    scores = [p["score"] for p in labeled_predictions]
    labels = [1.0 if p["actual_label"] else 0.0 for p in labeled_predictions]

    # Bin predictions and calculate ECE
    n_bins = 10
    bin_edges = np.linspace(0, 1, n_bins + 1)

    ece = 0.0
    for i in range(n_bins):
        bin_mask = (np.array(scores) >= bin_edges[i]) & (
            np.array(scores) < bin_edges[i + 1]
        )
        if np.sum(bin_mask) > 0:
            bin_scores = np.array(scores)[bin_mask]
            bin_labels = np.array(labels)[bin_mask]
            bin_confidence = np.mean(bin_scores)
            bin_accuracy = np.mean(bin_labels)
            ece += np.abs(bin_confidence - bin_accuracy) * len(bin_scores)

    ece /= len(scores)
    return ece


def assess_feature_reliability(features: Dict[str, Any]) -> Dict[str, Any]:
    """
    Assess reliability based on feature completeness.

    Args:
        features: Input features

    Returns:
        Dictionary with reliability factors
    """
    total_features = len(features)
    non_null_features = sum(1 for v in features.values() if v is not None and v != 0)
    feature_completeness = (
        non_null_features / total_features if total_features > 0 else 0.0
    )

    return {
        "feature_completeness": feature_completeness,
        "total_features": total_features,
        "non_null_features": non_null_features,
    }
