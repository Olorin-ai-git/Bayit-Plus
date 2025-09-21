"""
Base Risk Assessor

Abstract base class for all risk assessment modules.
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, List
from ..core.input_schema import RiskAssessmentResult


class BaseRiskAssessor(ABC):
    """Base class for risk assessment modules."""

    @abstractmethod
    def assess(self, processed_data: Dict[str, Any], risk_tolerance: str) -> RiskAssessmentResult:
        """
        Assess risk for the specific domain.

        Args:
            processed_data: Processed risk data
            risk_tolerance: Risk tolerance level

        Returns:
            RiskAssessmentResult with assessment details
        """
        pass

    def _calculate_risk_score(self, factors: List[Dict[str, Any]]) -> float:
        """Calculate composite risk score from multiple factors."""
        if not factors:
            return 0.0

        total_weight = sum(factor.get("weight", 1.0) for factor in factors)
        if total_weight == 0:
            return 0.0

        weighted_score = sum(
            factor.get("score", 0.0) * factor.get("weight", 1.0)
            for factor in factors
        )

        return min(weighted_score / total_weight, 1.0)

    def _determine_risk_level(self, score: float, tolerance: str) -> str:
        """Determine risk level based on score and tolerance."""
        tolerance_thresholds = {
            "low": {"low": 0.2, "medium": 0.4, "high": 0.6},
            "medium": {"low": 0.3, "medium": 0.6, "high": 0.8},
            "high": {"low": 0.4, "medium": 0.7, "high": 0.9}
        }

        thresholds = tolerance_thresholds.get(tolerance, tolerance_thresholds["medium"])

        if score <= thresholds["low"]:
            return "low"
        elif score <= thresholds["medium"]:
            return "medium"
        elif score <= thresholds["high"]:
            return "high"
        else:
            return "critical"

    def _calculate_confidence(self, data_quality: float, factor_count: int) -> float:
        """Calculate confidence in the assessment."""
        base_confidence = min(data_quality, 1.0)
        factor_bonus = min(factor_count * 0.1, 0.3)
        return min(base_confidence + factor_bonus, 1.0)