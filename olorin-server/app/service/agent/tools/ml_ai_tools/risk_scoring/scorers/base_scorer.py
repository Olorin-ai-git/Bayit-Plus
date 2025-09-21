"""
Base Risk Scorer

Abstract base class for all scoring model implementations.
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, Optional, List
from ..core.input_schema import RiskAssessmentResult


class BaseScorer(ABC):
    """Base class for risk scoring models."""

    @abstractmethod
    def score(
        self,
        processed_data: Dict[str, Any],
        risk_assessments: List[RiskAssessmentResult],
        risk_tolerance: str,
        time_horizon: str = "short_term",
        historical_data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Calculate risk score using the specific model.

        Args:
            processed_data: Processed risk data
            risk_assessments: Individual risk assessments
            risk_tolerance: Risk tolerance level
            time_horizon: Risk assessment horizon
            historical_data: Historical risk data (optional)

        Returns:
            Dict containing scoring results
        """
        pass

    def _normalize_score(self, score: float) -> float:
        """Normalize score to 0.0-1.0 range."""
        return max(0.0, min(1.0, score))

    def _determine_risk_level(self, score: float) -> str:
        """Determine risk level from score."""
        if score <= 0.25:
            return "low"
        elif score <= 0.5:
            return "medium"
        elif score <= 0.75:
            return "high"
        else:
            return "critical"

    def _calculate_confidence(self, assessments: List[RiskAssessmentResult]) -> float:
        """Calculate overall confidence from individual assessments."""
        if not assessments:
            return 0.0

        total_confidence = sum(assessment.confidence for assessment in assessments)
        return total_confidence / len(assessments)

    def _extract_assessment_scores(self, assessments: List[RiskAssessmentResult]) -> Dict[str, float]:
        """Extract scores from risk assessments."""
        return {
            assessment.risk_type: assessment.score
            for assessment in assessments
        }