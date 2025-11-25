"""
Confidence Scoring for Fraud Detection.

Provides confidence intervals and uncertainty quantification for predictions.

Week 9 Phase 3 implementation.
"""

import logging
import os
from typing import Dict, Any, List, Optional, Tuple
import numpy as np

from app.service.analytics.model_base import ModelPrediction
from app.service.analytics.uncertainty_quantification import (
    quantify_prediction_uncertainty,
    calculate_expected_calibration_error,
    assess_feature_reliability
)

logger = logging.getLogger(__name__)


class ConfidenceScorer:
    """
    Confidence scorer for fraud detection predictions.

    Provides confidence intervals, uncertainty quantification, and reliability metrics.
    """

    def __init__(self):
        """Initialize confidence scorer."""
        alpha_env = os.getenv("CONFIDENCE_ALPHA")
        if not alpha_env:
            raise RuntimeError("CONFIDENCE_ALPHA environment variable is required")
        self.alpha = float(alpha_env)

        min_samples_env = os.getenv("CONFIDENCE_MIN_SAMPLES")
        if not min_samples_env:
            raise RuntimeError("CONFIDENCE_MIN_SAMPLES environment variable is required")
        self.min_samples = int(min_samples_env)

        self.prediction_history: List[Dict[str, Any]] = []
        logger.info(f"📊 ConfidenceScorer initialized (alpha={self.alpha})")

    def calculate_confidence_interval(
        self,
        score: float,
        model_predictions: List[ModelPrediction]
    ) -> Tuple[float, float]:
        """
        Calculate confidence interval for a prediction.

        Args:
            score: Ensemble score
            model_predictions: Individual model predictions

        Returns:
            Tuple of (lower_bound, upper_bound)

        Raises:
            ValueError: If less than 2 model predictions provided
        """
        if len(model_predictions) < 2:
            raise ValueError(
                f"Cannot calculate confidence interval with {len(model_predictions)} predictions. "
                "At least 2 model predictions required for interval estimation."
            )

        # Use standard deviation of model predictions
        scores = [p.score for p in model_predictions]
        std = np.std(scores)

        # Calculate confidence interval using t-distribution approximation
        margin = self._calculate_margin(std, len(scores))

        lower = max(0.0, score - margin)
        upper = min(1.0, score + margin)

        return lower, upper

    def _calculate_margin(self, std: float, n: int) -> float:
        """Calculate margin of error for confidence interval."""
        if n < 2:
            return 0.1

        # t-distribution critical value approximation for small samples
        if n < 30:
            t_critical = 2.0 + (1.0 / n)  # Approximation
        else:
            t_critical = 1.96  # Normal approximation

        margin = t_critical * (std / np.sqrt(n))
        return margin

    def quantify_uncertainty(
        self,
        ensemble_prediction: ModelPrediction,
        model_predictions: List[ModelPrediction]
    ) -> Dict[str, float]:
        """Quantify uncertainty in prediction."""
        return quantify_prediction_uncertainty(ensemble_prediction, model_predictions)

    def assess_reliability(
        self,
        score: float,
        features: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Assess reliability of prediction based on input characteristics."""
        feature_reliability = assess_feature_reliability(features)
        feature_completeness = feature_reliability["feature_completeness"]

        # Score extremity (more extreme scores are more reliable)
        score_extremity = abs(score - 0.5) * 2

        reliability_score = feature_completeness * 0.4 + score_extremity * 0.6

        return {
            "reliability_score": reliability_score,
            "factors": {
                "feature_completeness": feature_completeness,
                "score_extremity": score_extremity
            },
            "is_reliable": reliability_score > 0.5
        }

    def track_prediction(
        self,
        prediction: ModelPrediction,
        actual_label: Optional[bool] = None
    ) -> None:
        """
        Track prediction for confidence calibration.

        Args:
            prediction: Model prediction
            actual_label: Actual outcome if known
        """
        self.prediction_history.append({
            "score": prediction.score,
            "confidence": prediction.confidence,
            "timestamp": prediction.timestamp.isoformat(),
            "actual_label": actual_label
        })

        # Keep only recent history
        if len(self.prediction_history) > 1000:
            self.prediction_history = self.prediction_history[-1000:]

    def get_confidence_statistics(self) -> Dict[str, Any]:
        """
        Get statistics about prediction confidence.

        Returns:
            Dictionary with confidence statistics
        """
        if not self.prediction_history:
            return {}

        scores = [p["score"] for p in self.prediction_history]
        confidences = [p["confidence"] for p in self.prediction_history]

        # Calculate calibration if we have labels
        labeled_predictions = [
            p for p in self.prediction_history
            if p["actual_label"] is not None
        ]

        calibration_error = None
        if len(labeled_predictions) >= self.min_samples:
            calibration_error = self._calculate_calibration_error(labeled_predictions)

        return {
            "total_predictions": len(self.prediction_history),
            "avg_score": np.mean(scores),
            "avg_confidence": np.mean(confidences),
            "score_std": np.std(scores),
            "confidence_std": np.std(confidences),
            "calibration_error": calibration_error,
            "labeled_predictions": len(labeled_predictions)
        }

    def _calculate_calibration_error(
        self,
        labeled_predictions: List[Dict[str, Any]]
    ) -> float:
        """Calculate expected calibration error."""
        return calculate_expected_calibration_error(labeled_predictions)
