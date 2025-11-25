"""
Score Explainability for Fraud Detection.

Provides feature contribution analysis and score explanations.

Week 9 Phase 3 implementation.
"""

import logging
from typing import Any, Dict, List, Optional, Tuple

from app.service.analytics.feature_contribution import calculate_feature_contributions
from app.service.analytics.feature_description import (
    generate_explanation_text,
    interpret_score_difference,
)
from app.service.analytics.model_base import FraudDetectionModel, ModelPrediction

logger = logging.getLogger(__name__)


class ScoreExplainer:
    """
    Explains fraud detection scores through feature contributions.

    Provides feature-level explanations and interpretable reasoning for predictions.
    """

    def __init__(self):
        """Initialize score explainer."""
        self.feature_importance_cache: Dict[str, Dict[str, float]] = {}
        logger.info("📊 ScoreExplainer initialized")

    def explain_prediction(
        self,
        prediction: ModelPrediction,
        features: Dict[str, Any],
        model: Optional[FraudDetectionModel] = None,
    ) -> Dict[str, Any]:
        """Generate explanation for a prediction."""
        # Get feature contributions
        contributions = calculate_feature_contributions(prediction, features, model)

        # Get top contributing features
        top_features = self._get_top_features(contributions, n=5)

        # Generate human-readable explanation
        explanation_text = generate_explanation_text(
            prediction.score, top_features, features
        )

        return {
            "score": prediction.score,
            "confidence": prediction.confidence,
            "feature_contributions": contributions,
            "top_features": top_features,
            "explanation": explanation_text,
            "model_name": prediction.model_name,
            "model_version": prediction.model_version,
        }

    def _get_top_features(
        self, contributions: Dict[str, float], n: int = 5
    ) -> List[Tuple[str, float]]:
        """Get top N contributing features."""
        sorted_features = sorted(
            contributions.items(), key=lambda x: abs(x[1]), reverse=True
        )
        return sorted_features[:n]

    def compare_predictions(
        self,
        prediction_a: ModelPrediction,
        prediction_b: ModelPrediction,
        features: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Compare two predictions and explain differences."""
        score_diff = prediction_b.score - prediction_a.score
        confidence_diff = prediction_b.confidence - prediction_a.confidence

        return {
            "score_difference": score_diff,
            "confidence_difference": confidence_diff,
            "model_a": {
                "name": prediction_a.model_name,
                "score": prediction_a.score,
                "confidence": prediction_a.confidence,
            },
            "model_b": {
                "name": prediction_b.model_name,
                "score": prediction_b.score,
                "confidence": prediction_b.confidence,
            },
            "interpretation": interpret_score_difference(score_diff),
        }
