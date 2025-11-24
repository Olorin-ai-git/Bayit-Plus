"""
Fraud Detection Scoring and Decision Making

Orchestrates fraud score calculation, indicator identification, and final decisions.

@deprecated Direct usage. Use specialized processors for better modularity:
- fraud_detection_scoring_calculation: Score calculation
- fraud_detection_scoring_indicators: Indicator identification
- fraud_detection_scoring_decision: Final decision and confidence
"""

from typing import Any, Dict, List

from .fraud_detection_scoring_calculation import FraudScoreCalculation
from .fraud_detection_scoring_indicators import FraudIndicatorIdentification
from .fraud_detection_scoring_decision import FraudFinalDecision


class FraudScoringDecision:
    """Fraud scoring, indicator identification, and decision making."""

    @staticmethod
    def calculate_fraud_scores(
        model_results: Dict[str, Any], fraud_types: List[str], sensitivity_level: str
    ) -> Dict[str, Any]:
        """Calculate fraud scores for each fraud type."""
        fraud_scores = FraudScoreCalculation.calculate_fraud_scores(
            model_results, fraud_types, sensitivity_level
        )

        # Calculate confidence interval
        fraud_scores["confidence_interval"] = (
            FraudFinalDecision.calculate_score_confidence_interval(fraud_scores)
        )

        return fraud_scores

    @staticmethod
    def identify_fraud_indicators(
        model_results: Dict[str, Any], processed_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Identify specific fraud indicators from all models."""
        return FraudIndicatorIdentification.identify_fraud_indicators(
            model_results, processed_data
        )

    @staticmethod
    def make_final_fraud_decision(
        fraud_scores: Dict[str, Any],
        fraud_indicators: Dict[str, Any],
        sensitivity_level: str,
    ) -> Dict[str, Any]:
        """Make final fraud detection decision."""
        return FraudFinalDecision.make_final_fraud_decision(
            fraud_scores, fraud_indicators, sensitivity_level
        )

    @staticmethod
    def calculate_score_confidence_interval(
        fraud_scores: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Calculate confidence interval for fraud scores."""
        return FraudFinalDecision.calculate_score_confidence_interval(fraud_scores)
