"""
Composite Risk Scorer

Combines multiple scoring models for comprehensive risk assessment.
"""

from typing import Any, Dict, Optional, List
from .base_scorer import BaseScorer
from ..core.input_schema import RiskAssessmentResult


class CompositeScorer(BaseScorer):
    """Composite risk scoring implementation."""

    def __init__(self):
        """Initialize with default model weights."""
        self.model_weights = {
            "rule_based": 0.3,
            "weighted": 0.3,
            "ml_based": 0.4
        }

    def score(
        self,
        processed_data: Dict[str, Any],
        risk_assessments: List[RiskAssessmentResult],
        risk_tolerance: str,
        time_horizon: str = "short_term",
        historical_data: Optional[Dict[str, Any]] = None,
        model_scores: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Apply composite risk scoring combining multiple models."""
        if not model_scores:
            raise ValueError("Composite scorer requires model_scores from other scoring models")

        # Extract scores from each model
        scores = {}
        model_details = {}

        for model_type, result in model_scores.items():
            if isinstance(result, dict) and "overall_score" in result:
                scores[model_type] = result["overall_score"]
                model_details[model_type] = result
            else:
                scores[model_type] = 0.0

        # Apply model weights
        weighted_scores = {}
        total_weight = 0.0
        composite_score = 0.0

        for model_type, score in scores.items():
            weight = self.model_weights.get(model_type, 0.0)
            weighted_score = score * weight
            weighted_scores[model_type] = weighted_score
            composite_score += weighted_score
            total_weight += weight

        # Normalize by total weight
        if total_weight > 0:
            composite_score /= total_weight

        # Apply consensus adjustment
        consensus_adjusted_score = self._apply_consensus_adjustment(
            composite_score, scores
        )

        # Apply composite-specific adjustments
        final_score = self._apply_composite_adjustments(
            consensus_adjusted_score, risk_tolerance, time_horizon
        )

        # Normalize final score
        normalized_score = self._normalize_score(final_score)

        # Calculate composite confidence
        composite_confidence = self._calculate_composite_confidence(model_details)

        # Generate recommendations
        recommendations = self._generate_recommendations(
            normalized_score, scores, risk_assessments
        )

        return {
            "overall_score": normalized_score,
            "risk_level": self._determine_risk_level(normalized_score),
            "confidence": composite_confidence,
            "model_scores": scores,
            "weighted_scores": weighted_scores,
            "model_weights": self.model_weights,
            "consensus_factor": self._calculate_consensus_factor(scores),
            "model_type": "composite",
            "recommendations": recommendations,
            "score_variance": self._calculate_score_variance(scores)
        }

    def _apply_consensus_adjustment(
        self,
        composite_score: float,
        model_scores: Dict[str, float]
    ) -> float:
        """Apply adjustment based on model consensus."""
        if len(model_scores) < 2:
            return composite_score

        # Calculate consensus factor
        consensus_factor = self._calculate_consensus_factor(model_scores)

        # Adjust score based on consensus
        if consensus_factor > 0.8:  # High consensus
            return composite_score * 1.05  # Slight boost for high consensus
        elif consensus_factor < 0.4:  # Low consensus
            return composite_score * 0.95  # Slight reduction for low consensus
        else:
            return composite_score  # No adjustment for medium consensus

    def _calculate_consensus_factor(self, model_scores: Dict[str, float]) -> float:
        """Calculate consensus factor among models."""
        scores_list = list(model_scores.values())
        if len(scores_list) < 2:
            return 1.0

        mean_score = sum(scores_list) / len(scores_list)
        variance = sum((score - mean_score) ** 2 for score in scores_list) / len(scores_list)

        # Convert variance to consensus (inverse relationship)
        max_variance = 0.25  # Maximum expected variance
        consensus = max(0.0, 1.0 - (variance / max_variance))
        return min(1.0, consensus)

    def _apply_composite_adjustments(
        self,
        score: float,
        risk_tolerance: str,
        time_horizon: str
    ) -> float:
        """Apply composite-specific adjustments."""
        # Conservative adjustments for composite model
        tolerance_factors = {
            "low": 1.05,
            "medium": 1.0,
            "high": 0.95
        }

        horizon_factors = {
            "immediate": 1.02,
            "short_term": 1.0,
            "medium_term": 0.99,
            "long_term": 0.98
        }

        tolerance_factor = tolerance_factors.get(risk_tolerance, 1.0)
        horizon_factor = horizon_factors.get(time_horizon, 1.0)

        return score * tolerance_factor * horizon_factor

    def _calculate_composite_confidence(self, model_details: Dict[str, Any]) -> float:
        """Calculate composite confidence from individual models."""
        confidences = []

        for model_type, details in model_details.items():
            if isinstance(details, dict) and "confidence" in details:
                weight = self.model_weights.get(model_type, 0.0)
                confidences.append(details["confidence"] * weight)

        if confidences:
            return sum(confidences) / sum(self.model_weights.values())
        else:
            return 0.5  # Default confidence

    def _generate_recommendations(
        self,
        composite_score: float,
        model_scores: Dict[str, float],
        risk_assessments: List[RiskAssessmentResult]
    ) -> List[str]:
        """Generate risk mitigation recommendations."""
        recommendations = []

        # Score-based recommendations
        if composite_score > 0.8:
            recommendations.append("Immediate risk mitigation required")
            recommendations.append("Consider enhanced monitoring")
        elif composite_score > 0.6:
            recommendations.append("Implement additional risk controls")
            recommendations.append("Increase transaction monitoring frequency")
        elif composite_score > 0.4:
            recommendations.append("Monitor for trend changes")

        # Model disagreement recommendations
        score_variance = self._calculate_score_variance(model_scores)
        if score_variance > 0.1:
            recommendations.append("Review conflicting risk indicators")
            recommendations.append("Gather additional data for clarification")

        # Assessment-specific recommendations
        high_risk_assessments = [
            assessment for assessment in risk_assessments
            if assessment.score > 0.7
        ]

        for assessment in high_risk_assessments:
            recommendations.append(f"Address {assessment.risk_type} risk factors")

        return recommendations

    def _calculate_score_variance(self, model_scores: Dict[str, float]) -> float:
        """Calculate variance among model scores."""
        scores_list = list(model_scores.values())
        if len(scores_list) < 2:
            return 0.0

        mean_score = sum(scores_list) / len(scores_list)
        return sum((score - mean_score) ** 2 for score in scores_list) / len(scores_list)

    def update_model_weights(self, new_weights: Dict[str, float]) -> None:
        """Update model weights."""
        # Normalize weights to sum to 1.0
        total_weight = sum(new_weights.values())
        if total_weight > 0:
            self.model_weights = {
                model: weight / total_weight
                for model, weight in new_weights.items()
            }