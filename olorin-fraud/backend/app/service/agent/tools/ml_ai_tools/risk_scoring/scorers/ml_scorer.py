"""
Machine Learning Risk Scorer

Implements ML-based risk scoring methodology.
"""

import math
from typing import Any, Dict, List, Optional

from ..core.input_schema import RiskAssessmentResult
from .base_scorer import BaseScorer


class MLBasedScorer(BaseScorer):
    """Machine learning-based risk scoring implementation."""

    def score(
        self,
        processed_data: Dict[str, Any],
        risk_assessments: List[RiskAssessmentResult],
        risk_tolerance: str,
        time_horizon: str = "short_term",
        historical_data: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Apply machine learning-based risk scoring."""
        assessment_scores = self._extract_assessment_scores(risk_assessments)

        # Extract features for ML model
        features = self._extract_ml_features(processed_data, assessment_scores)

        # Apply simplified ML scoring (placeholder for actual ML model)
        ml_score = self._apply_ml_model(features, historical_data)

        # Apply confidence weighting
        confidence_weighted_score = self._apply_confidence_weighting(
            ml_score, risk_assessments
        )

        # Historical trend adjustment
        trend_adjusted_score = self._apply_trend_adjustment(
            confidence_weighted_score, historical_data
        )

        # Risk tolerance and time horizon adjustments
        final_score = self._apply_ml_adjustments(
            trend_adjusted_score, risk_tolerance, time_horizon
        )

        # Normalize final score
        normalized_score = self._normalize_score(final_score)

        return {
            "overall_score": normalized_score,
            "risk_level": self._determine_risk_level(normalized_score),
            "confidence": self._calculate_ml_confidence(features, risk_assessments),
            "feature_importance": self._calculate_feature_importance(features),
            "model_type": "ml_based",
            "trend_adjustment": trend_adjusted_score - confidence_weighted_score,
            "prediction_interval": self._calculate_prediction_interval(
                normalized_score
            ),
        }

    def _extract_ml_features(
        self, processed_data: Dict[str, Any], assessment_scores: Dict[str, float]
    ) -> Dict[str, float]:
        """Extract features for ML model."""
        features = {}

        # Assessment scores as features
        features.update(assessment_scores)

        # Data quality features
        features["data_quality"] = processed_data.get("data_quality", 0.7)
        features["data_completeness"] = processed_data.get("data_completeness", 0.8)

        # Interaction features
        features["fraud_behavioral_interaction"] = assessment_scores.get(
            "fraud", 0
        ) * assessment_scores.get("behavioral", 0)
        features["credit_operational_interaction"] = assessment_scores.get(
            "credit", 0
        ) * assessment_scores.get("operational", 0)

        # Statistical features
        scores_list = list(assessment_scores.values())
        if scores_list:
            features["risk_score_mean"] = sum(scores_list) / len(scores_list)
            features["risk_score_max"] = max(scores_list)
            features["risk_score_variance"] = self._calculate_variance(scores_list)

        return features

    def _apply_ml_model(
        self, features: Dict[str, float], historical_data: Optional[Dict[str, Any]]
    ) -> float:
        """Apply simplified ML model (placeholder for actual implementation)."""
        # Simplified linear combination (replace with actual ML model)
        weights = {
            "fraud": 0.25,
            "credit": 0.20,
            "operational": 0.15,
            "behavioral": 0.22,
            "contextual": 0.18,
            "data_quality": 0.05,
            "fraud_behavioral_interaction": 0.15,
            "risk_score_variance": 0.10,
        }

        score = 0.0
        for feature, value in features.items():
            weight = weights.get(feature, 0.0)
            score += value * weight

        # Apply non-linear transformation
        return 1 / (1 + math.exp(-5 * (score - 0.5)))  # Sigmoid transformation

    def _apply_confidence_weighting(
        self, score: float, risk_assessments: List[RiskAssessmentResult]
    ) -> float:
        """Apply confidence weighting to the score."""
        avg_confidence = self._calculate_confidence(risk_assessments)
        return score * (0.5 + 0.5 * avg_confidence)

    def _apply_trend_adjustment(
        self, score: float, historical_data: Optional[Dict[str, Any]]
    ) -> float:
        """Apply historical trend adjustment."""
        if not historical_data:
            return score

        trend_factor = historical_data.get("risk_trend", 0.0)
        trend_adjustment = trend_factor * 0.1  # Small adjustment based on trend
        return score + trend_adjustment

    def _apply_ml_adjustments(
        self, score: float, risk_tolerance: str, time_horizon: str
    ) -> float:
        """Apply ML-specific adjustments."""
        # Less aggressive adjustments than rule-based
        tolerance_factors = {"low": 1.1, "medium": 1.0, "high": 0.9}

        horizon_factors = {
            "immediate": 1.05,
            "short_term": 1.0,
            "medium_term": 0.98,
            "long_term": 0.95,
        }

        tolerance_factor = tolerance_factors.get(risk_tolerance, 1.0)
        horizon_factor = horizon_factors.get(time_horizon, 1.0)

        return score * tolerance_factor * horizon_factor

    def _calculate_variance(self, values: List[float]) -> float:
        """Calculate variance of values."""
        if len(values) < 2:
            return 0.0

        mean = sum(values) / len(values)
        return sum((x - mean) ** 2 for x in values) / len(values)

    def _calculate_ml_confidence(
        self, features: Dict[str, float], risk_assessments: List[RiskAssessmentResult]
    ) -> float:
        """Calculate ML model confidence."""
        base_confidence = self._calculate_confidence(risk_assessments)
        data_quality = features.get("data_quality", 0.7)
        feature_count_bonus = min(len(features) * 0.02, 0.2)

        return min(base_confidence * data_quality + feature_count_bonus, 1.0)

    def _calculate_feature_importance(
        self, features: Dict[str, float]
    ) -> Dict[str, float]:
        """Calculate feature importance scores."""
        # Simplified importance calculation
        importance = {}
        total_value = sum(abs(value) for value in features.values())

        if total_value > 0:
            for feature, value in features.items():
                importance[feature] = abs(value) / total_value

        return importance

    def _calculate_prediction_interval(self, score: float) -> Dict[str, float]:
        """Calculate prediction interval for the score."""
        uncertainty = 0.1  # 10% uncertainty
        return {
            "lower_bound": max(0.0, score - uncertainty),
            "upper_bound": min(1.0, score + uncertainty),
        }
