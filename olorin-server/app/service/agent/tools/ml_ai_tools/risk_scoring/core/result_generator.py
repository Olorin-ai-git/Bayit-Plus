"""
Risk Scoring Result Generator

Generates comprehensive risk assessment results.
"""

from typing import Any, Dict, List
from .input_schema import ComprehensiveRiskResult, RiskAssessmentResult


class RiskScoringResultGenerator:
    """Generates comprehensive risk assessment results."""

    def __init__(self, recommendation_generator):
        """Initialize with recommendation generator."""
        self._recommendation_generator = recommendation_generator

    def generate_comprehensive_result(
        self,
        model_scores: Dict[str, Any],
        risk_assessments: List[RiskAssessmentResult],
        processed_data: Dict[str, Any]
    ) -> ComprehensiveRiskResult:
        """Generate comprehensive risk assessment result."""
        # Determine primary score (prefer composite, then weighted, then highest individual)
        primary_score = 0.0
        primary_level = "low"

        if "composite" in model_scores:
            primary_score = model_scores["composite"].get("overall_score", 0.0)
            primary_level = model_scores["composite"].get("risk_level", "low")
        elif "weighted" in model_scores:
            primary_score = model_scores["weighted"].get("overall_score", 0.0)
            primary_level = model_scores["weighted"].get("risk_level", "low")
        elif model_scores:
            # Use the highest score from available models
            scores = [result.get("overall_score", 0.0) for result in model_scores.values()]
            primary_score = max(scores) if scores else 0.0
            primary_level = self._determine_risk_level(primary_score)

        # Extract model scores
        extracted_model_scores = {
            model: result.get("overall_score", 0.0)
            for model, result in model_scores.items()
        }

        # Generate recommendations
        recommendations = self._recommendation_generator.generate_recommendations(
            primary_score, risk_assessments, model_scores
        )

        # Prepare metadata
        metadata = {
            "processing_info": {
                "data_quality": processed_data.get("data_quality", 0.0),
                "data_completeness": processed_data.get("data_completeness", 0.0),
                "models_applied": list(model_scores.keys()),
                "assessments_completed": len(risk_assessments)
            },
            "model_details": model_scores
        }

        return ComprehensiveRiskResult(
            overall_score=primary_score,
            risk_level=primary_level,
            individual_assessments=risk_assessments,
            model_scores=extracted_model_scores,
            recommendations=recommendations,
            metadata=metadata
        )

    def _determine_risk_level(self, score: float) -> str:
        """Determine risk level from score."""
        if score >= 0.75:
            return "critical"
        elif score >= 0.5:
            return "high"
        elif score >= 0.25:
            return "medium"
        else:
            return "low"