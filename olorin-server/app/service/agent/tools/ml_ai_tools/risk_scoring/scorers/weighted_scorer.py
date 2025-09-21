"""
Weighted Risk Scorer

Implements weighted risk scoring methodology.
"""

from typing import Any, Dict, Optional, List
from .base_scorer import BaseScorer
from ..core.input_schema import RiskAssessmentResult


class WeightedScorer(BaseScorer):
    """Weighted risk scoring implementation."""

    def __init__(self):
        """Initialize with default weights."""
        self.default_weights = {
            "fraud": 2.0,
            "credit": 1.5,
            "operational": 1.2,
            "behavioral": 1.8,
            "contextual": 1.0
        }

    def score(
        self,
        processed_data: Dict[str, Any],
        risk_assessments: List[RiskAssessmentResult],
        risk_tolerance: str,
        time_horizon: str = "short_term",
        historical_data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Apply weighted risk scoring."""
        assessment_scores = self._extract_assessment_scores(risk_assessments)

        # Get custom weights if available
        custom_weights = processed_data.get("risk_weights", {})
        weights = self._merge_weights(custom_weights)

        # Calculate weighted score
        total_weighted_score = 0.0
        total_weight = 0.0
        weight_details = {}

        for risk_type, score in assessment_scores.items():
            weight = weights.get(risk_type, 1.0)
            weighted_score = score * weight
            total_weighted_score += weighted_score
            total_weight += weight

            weight_details[risk_type] = {
                "raw_score": score,
                "weight": weight,
                "weighted_score": weighted_score
            }

        # Calculate average weighted score
        if total_weight > 0:
            average_score = total_weighted_score / total_weight
        else:
            average_score = 0.0

        # Apply adjustments
        adjusted_score = self._apply_adjustments(
            average_score, risk_tolerance, time_horizon
        )

        # Normalize final score
        final_score = self._normalize_score(adjusted_score)

        return {
            "overall_score": final_score,
            "risk_level": self._determine_risk_level(final_score),
            "confidence": self._calculate_confidence(risk_assessments),
            "weight_details": weight_details,
            "total_weight": total_weight,
            "model_type": "weighted",
            "applied_weights": weights
        }

    def _merge_weights(self, custom_weights: Dict[str, float]) -> Dict[str, float]:
        """Merge custom weights with defaults."""
        merged_weights = self.default_weights.copy()
        merged_weights.update(custom_weights)
        return merged_weights

    def _apply_adjustments(
        self,
        score: float,
        risk_tolerance: str,
        time_horizon: str
    ) -> float:
        """Apply tolerance and time horizon adjustments."""
        # Risk tolerance adjustment
        tolerance_adjustments = {
            "low": 1.2,
            "medium": 1.0,
            "high": 0.85
        }

        # Time horizon adjustment
        horizon_adjustments = {
            "immediate": 1.15,
            "short_term": 1.0,
            "medium_term": 0.95,
            "long_term": 0.9
        }

        tolerance_factor = tolerance_adjustments.get(risk_tolerance, 1.0)
        horizon_factor = horizon_adjustments.get(time_horizon, 1.0)

        return score * tolerance_factor * horizon_factor

    def update_weights(self, new_weights: Dict[str, float]) -> None:
        """Update default weights."""
        self.default_weights.update(new_weights)