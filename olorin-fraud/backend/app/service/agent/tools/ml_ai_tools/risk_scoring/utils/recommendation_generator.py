"""
Recommendation Generator

Generates risk mitigation recommendations based on assessment results.
"""

from typing import Any, Dict, List

from ..core.input_schema import RiskAssessmentResult


class RecommendationGenerator:
    """Generates risk mitigation recommendations."""

    def generate_recommendations(
        self,
        overall_score: float,
        risk_assessments: List[RiskAssessmentResult],
        model_results: Dict[str, Any],
    ) -> List[str]:
        """
        Generate comprehensive risk mitigation recommendations.

        Args:
            overall_score: Overall composite risk score
            risk_assessments: Individual risk assessments
            model_results: Results from different scoring models

        Returns:
            List of actionable recommendations
        """
        recommendations = []

        # Overall score-based recommendations
        recommendations.extend(self._get_score_based_recommendations(overall_score))

        # Risk type-specific recommendations
        recommendations.extend(self._get_risk_type_recommendations(risk_assessments))

        # Model-specific recommendations
        recommendations.extend(self._get_model_based_recommendations(model_results))

        # Priority-based recommendations
        recommendations.extend(
            self._get_priority_recommendations(overall_score, risk_assessments)
        )

        # Remove duplicates while preserving order
        return list(dict.fromkeys(recommendations))

    def _get_score_based_recommendations(self, score: float) -> List[str]:
        """Generate recommendations based on overall score."""
        recommendations = []

        if score >= 0.9:
            recommendations.extend(
                [
                    "CRITICAL: Immediate intervention required",
                    "Suspend high-risk activities until further review",
                    "Implement emergency risk controls",
                    "Escalate to senior management",
                ]
            )
        elif score >= 0.7:
            recommendations.extend(
                [
                    "HIGH: Implement enhanced monitoring",
                    "Require additional approval for high-value transactions",
                    "Increase verification requirements",
                    "Schedule immediate risk review",
                ]
            )
        elif score >= 0.5:
            recommendations.extend(
                [
                    "MEDIUM: Monitor for trend changes",
                    "Consider implementing additional controls",
                    "Review risk profile monthly",
                    "Document risk factors for trend analysis",
                ]
            )
        elif score >= 0.3:
            recommendations.extend(
                [
                    "LOW-MEDIUM: Maintain standard monitoring",
                    "Continue regular risk assessments",
                ]
            )
        else:
            recommendations.extend(
                [
                    "LOW: Standard monitoring sufficient",
                    "Maintain current risk controls",
                ]
            )

        return recommendations

    def _get_risk_type_recommendations(
        self, risk_assessments: List[RiskAssessmentResult]
    ) -> List[str]:
        """Generate recommendations based on specific risk types."""
        recommendations = []

        for assessment in risk_assessments:
            if assessment.score >= 0.7:
                risk_type = assessment.risk_type
                recommendations.extend(
                    self._get_specific_risk_recommendations(risk_type, assessment.score)
                )

        return recommendations

    def _get_specific_risk_recommendations(
        self, risk_type: str, score: float
    ) -> List[str]:
        """Get recommendations for specific risk types."""
        recommendations = []

        if risk_type == "fraud":
            recommendations.extend(
                [
                    "Implement advanced fraud detection algorithms",
                    "Increase transaction monitoring frequency",
                    "Require multi-factor authentication for high-value transactions",
                    "Review and update fraud rules",
                ]
            )
        elif risk_type == "credit":
            recommendations.extend(
                [
                    "Review credit limits and exposure",
                    "Implement stricter underwriting criteria",
                    "Monitor debt-to-income ratios closely",
                    "Consider requiring additional collateral",
                ]
            )
        elif risk_type == "operational":
            recommendations.extend(
                [
                    "Review operational procedures and controls",
                    "Implement additional system monitoring",
                    "Consider redundancy for critical processes",
                    "Conduct operational risk assessment",
                ]
            )
        elif risk_type == "behavioral":
            recommendations.extend(
                [
                    "Monitor for unusual behavioral patterns",
                    "Implement behavioral analytics",
                    "Consider user education and training",
                    "Review access patterns and permissions",
                ]
            )
        elif risk_type == "contextual":
            recommendations.extend(
                [
                    "Monitor environmental risk factors",
                    "Implement location-based controls",
                    "Consider market volatility in risk assessment",
                    "Review geographic risk exposure",
                ]
            )

        return recommendations

    def _get_model_based_recommendations(
        self, model_results: Dict[str, Any]
    ) -> List[str]:
        """Generate recommendations based on model-specific insights."""
        recommendations = []

        # Check for model disagreement
        if "composite" in model_results:
            composite_result = model_results["composite"]
            if isinstance(composite_result, dict):
                variance = composite_result.get("score_variance", 0)
                if variance > 0.1:
                    recommendations.extend(
                        [
                            "Models show significant disagreement - gather additional data",
                            "Review conflicting risk indicators",
                            "Consider expert manual review",
                        ]
                    )

                consensus_factor = composite_result.get("consensus_factor", 1.0)
                if consensus_factor < 0.5:
                    recommendations.append(
                        "Low model consensus - consider additional validation"
                    )

        # ML model-specific recommendations
        if "ml_based" in model_results:
            ml_result = model_results["ml_based"]
            if isinstance(ml_result, dict):
                prediction_interval = ml_result.get("prediction_interval", {})
                if prediction_interval:
                    range_width = prediction_interval.get(
                        "upper_bound", 0
                    ) - prediction_interval.get("lower_bound", 0)
                    if range_width > 0.3:
                        recommendations.append(
                            "High prediction uncertainty - consider additional data collection"
                        )

        return recommendations

    def _get_priority_recommendations(
        self, overall_score: float, risk_assessments: List[RiskAssessmentResult]
    ) -> List[str]:
        """Generate priority-based recommendations."""
        recommendations = []

        # Identify highest risk factors
        high_risk_assessments = [
            assessment for assessment in risk_assessments if assessment.score >= 0.6
        ]

        if len(high_risk_assessments) >= 3:
            recommendations.append(
                "Multiple high-risk factors detected - comprehensive review recommended"
            )

        # Check for critical combinations
        fraud_score = next(
            (
                assessment.score
                for assessment in risk_assessments
                if assessment.risk_type == "fraud"
            ),
            0.0,
        )
        behavioral_score = next(
            (
                assessment.score
                for assessment in risk_assessments
                if assessment.risk_type == "behavioral"
            ),
            0.0,
        )

        if fraud_score > 0.7 and behavioral_score > 0.6:
            recommendations.append(
                "URGENT: High fraud and behavioral risk combination detected"
            )

        # Time-sensitive recommendations
        if overall_score > 0.8:
            recommendations.extend(
                [
                    "Implement immediate protective measures",
                    "Consider temporary activity suspension",
                    "Notify relevant stakeholders within 24 hours",
                ]
            )

        return recommendations

    def prioritize_recommendations(self, recommendations: List[str]) -> List[str]:
        """Prioritize recommendations by urgency and impact."""
        priority_keywords = {
            "CRITICAL": 5,
            "URGENT": 4,
            "HIGH": 3,
            "Immediate": 3,
            "MEDIUM": 2,
            "LOW": 1,
        }

        def get_priority(recommendation: str) -> int:
            for keyword, priority in priority_keywords.items():
                if keyword in recommendation:
                    return priority
            return 0

        # Sort by priority (highest first)
        return sorted(recommendations, key=get_priority, reverse=True)
