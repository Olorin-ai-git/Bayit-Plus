"""
Fraud Detection Final Decision and Confidence

Makes final fraud detection decisions and calculates confidence intervals.
"""

from typing import Any, Dict
import math


class FraudFinalDecision:
    """Final fraud detection decision making and confidence calculation."""

    @staticmethod
    def make_final_fraud_decision(
        fraud_scores: Dict[str, Any],
        fraud_indicators: Dict[str, Any],
        sensitivity_level: str,
    ) -> Dict[str, Any]:
        """Make final fraud detection decision."""
        decision = {
            "decision": "approve",
            "confidence": 0.0,
            "risk_level": "low",
            "primary_concerns": [],
            "decision_factors": {},
            "recommended_actions": [],
        }

        overall_score = fraud_scores.get("overall_fraud_score", 0)
        high_risk_count = len(fraud_indicators.get("high_risk_indicators", []))
        medium_risk_count = len(fraud_indicators.get("medium_risk_indicators", []))

        # Set decision thresholds
        if sensitivity_level == "aggressive":
            decline_threshold = 0.4
            review_threshold = 0.25
        elif sensitivity_level == "conservative":
            decline_threshold = 0.8
            review_threshold = 0.6
        else:
            decline_threshold = 0.6
            review_threshold = 0.4

        # Make decision
        if overall_score >= decline_threshold or high_risk_count >= 3:
            decision["decision"] = "decline"
            decision["risk_level"] = "high"
            decision["confidence"] = min(overall_score + 0.2, 1.0)

        elif (
            overall_score >= review_threshold
            or high_risk_count >= 1
            or medium_risk_count >= 3
        ):
            decision["decision"] = "review"
            decision["risk_level"] = "medium"
            decision["confidence"] = overall_score

        else:
            decision["decision"] = "approve"
            decision["risk_level"] = "low"
            decision["confidence"] = 1 - overall_score

        # Identify primary concerns
        primary_concerns = []
        high_risk_indicators = fraud_indicators.get("high_risk_indicators", [])

        for indicator in high_risk_indicators[:5]:
            concern = {
                "type": indicator.get("type", "unknown"),
                "description": indicator.get("description", ""),
                "confidence": indicator.get("confidence", 0),
                "source": indicator.get("source_model", "unknown"),
            }
            primary_concerns.append(concern)

        decision["primary_concerns"] = primary_concerns

        # Decision factors
        decision["decision_factors"] = {
            "fraud_score": overall_score,
            "high_risk_indicators": high_risk_count,
            "medium_risk_indicators": medium_risk_count,
            "sensitivity_level": sensitivity_level,
            "decision_threshold": decline_threshold,
        }

        # Recommended actions
        if decision["decision"] == "decline":
            decision["recommended_actions"] = [
                "Block transaction/activity immediately",
                "Flag account for investigation",
                "Require additional verification",
                "Contact fraud team",
            ]
        elif decision["decision"] == "review":
            decision["recommended_actions"] = [
                "Route to manual review",
                "Request additional information",
                "Apply additional monitoring",
                "Consider step-up authentication",
            ]
        else:
            decision["recommended_actions"] = [
                "Allow transaction to proceed",
                "Continue normal monitoring",
                "Update user behavior baseline",
            ]

        return decision

    @staticmethod
    def calculate_score_confidence_interval(
        fraud_scores: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Calculate confidence interval for fraud scores."""
        confidence_interval = {
            "lower_bound": 0.0,
            "upper_bound": 0.0,
            "confidence_level": 0.95,
        }

        overall_score = fraud_scores.get("overall_fraud_score", 0)

        # Use model agreement as measure of uncertainty
        model_scores = list(fraud_scores.get("by_model", {}).values())
        if len(model_scores) > 1:
            score_variance = sum(
                (score - overall_score) ** 2 for score in model_scores
            ) / len(model_scores)
            score_std = math.sqrt(score_variance)

            # 95% confidence interval
            margin_of_error = 2 * score_std
            confidence_interval["lower_bound"] = max(0, overall_score - margin_of_error)
            confidence_interval["upper_bound"] = min(1, overall_score + margin_of_error)
        else:
            # Default margin
            margin = 0.1
            confidence_interval["lower_bound"] = max(0, overall_score - margin)
            confidence_interval["upper_bound"] = min(1, overall_score + margin)

        return confidence_interval
