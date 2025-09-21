"""
Risk Scoring Processor

Handles assessment and scoring model execution.
"""

from typing import Any, Dict, Optional, List
from app.service.logging import get_bridge_logger

from .input_schema import RiskAssessmentResult

logger = get_bridge_logger(__name__)


class RiskScoringProcessor:
    """Processes risk assessments and applies scoring models."""

    def __init__(self, assessors: Dict[str, Any], scorers: Dict[str, Any]):
        """Initialize with assessors and scorers."""
        self._assessors = assessors
        self._scorers = scorers

    def perform_risk_assessments(
        self,
        processed_data: Dict[str, Any],
        risk_factors: List[str],
        risk_tolerance: str
    ) -> List[RiskAssessmentResult]:
        """Perform individual risk assessments."""
        assessments = []

        for risk_factor in risk_factors:
            if risk_factor in self._assessors:
                try:
                    assessment = self._assessors[risk_factor].assess(
                        processed_data, risk_tolerance
                    )
                    assessments.append(assessment)
                    logger.debug(f"{risk_factor} assessment: {assessment.score:.3f}")
                except Exception as e:
                    logger.warning(f"Failed to assess {risk_factor} risk: {str(e)}")

        return assessments

    def apply_scoring_models(
        self,
        processed_data: Dict[str, Any],
        risk_assessments: List[RiskAssessmentResult],
        scoring_models: List[str],
        risk_tolerance: str,
        time_horizon: str,
        historical_data: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Apply different scoring models."""
        model_scores = {}

        # Apply individual models first
        for model_name in scoring_models:
            if model_name == "composite":
                continue  # Handle composite separately

            if model_name in self._scorers:
                try:
                    score_result = self._scorers[model_name].score(
                        processed_data, risk_assessments, risk_tolerance,
                        time_horizon, historical_data
                    )
                    model_scores[model_name] = score_result
                    logger.debug(f"{model_name} model score: {score_result.get('overall_score', 0):.3f}")
                except Exception as e:
                    logger.warning(f"Failed to apply {model_name} scoring: {str(e)}")

        # Apply composite model if requested
        if "composite" in scoring_models and len(model_scores) > 1:
            try:
                composite_result = self._scorers["composite"].score(
                    processed_data, risk_assessments, risk_tolerance,
                    time_horizon, historical_data, model_scores
                )
                model_scores["composite"] = composite_result
                logger.debug(f"Composite model score: {composite_result.get('overall_score', 0):.3f}")
            except Exception as e:
                logger.warning(f"Failed to apply composite scoring: {str(e)}")

        return model_scores