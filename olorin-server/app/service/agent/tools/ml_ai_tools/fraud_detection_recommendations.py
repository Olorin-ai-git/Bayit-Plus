"""
Fraud Detection Recommendations

Generates fraud-specific recommendations based on detection results.
"""

from typing import Any, Dict, List


class FraudRecommendations:
    """Generates fraud prevention and response recommendations."""

    @staticmethod
    def generate_fraud_recommendations(
        final_decision: Dict[str, Any],
        fraud_indicators: Dict[str, Any],
        fraud_scores: Dict[str, Any],
    ) -> List[Dict[str, Any]]:
        """Generate fraud-specific recommendations."""
        recommendations = []

        decision_type = final_decision.get("decision", "approve")
        risk_level = final_decision.get("risk_level", "low")

        # High-risk recommendations
        if risk_level == "high":
            recommendations.append(
                {
                    "priority": "critical",
                    "category": "immediate_action",
                    "action": "block_and_investigate",
                    "description": "Immediate blocking and fraud investigation required",
                    "implementation": "Auto-block transaction and escalate to fraud team",
                    "timeframe": "immediate",
                }
            )

        high_risk_indicators = fraud_indicators.get("high_risk_indicators", [])

        # Payment fraud recommendations
        payment_indicators = [
            ind for ind in high_risk_indicators if "payment" in ind.get("type", "")
        ]
        if payment_indicators:
            recommendations.append(
                {
                    "priority": "high",
                    "category": "payment_security",
                    "action": "enhance_payment_monitoring",
                    "description": f"Enhanced payment monitoring - {len(payment_indicators)} payment fraud indicators",
                    "implementation": "Implement real-time payment verification and velocity checks",
                }
            )

        # Account takeover recommendations
        takeover_indicators = [
            ind for ind in high_risk_indicators if "takeover" in ind.get("type", "")
        ]
        if takeover_indicators:
            recommendations.append(
                {
                    "priority": "high",
                    "category": "account_security",
                    "action": "secure_account",
                    "description": f"Account security measures - {len(takeover_indicators)} takeover indicators",
                    "implementation": "Force password reset and enable 2FA",
                }
            )

        # Behavioral recommendations
        behavioral_indicators = [
            ind for ind in high_risk_indicators if "behavioral" in ind.get("type", "")
        ]
        if behavioral_indicators:
            recommendations.append(
                {
                    "priority": "medium",
                    "category": "behavioral_monitoring",
                    "action": "enhance_behavioral_analysis",
                    "description": f"Behavioral analysis - {len(behavioral_indicators)} behavioral anomalies",
                    "implementation": "Implement continuous behavioral monitoring and profiling",
                }
            )

        # General fraud prevention
        total_indicators = fraud_indicators.get("total_indicators", 0)
        if total_indicators > 10:
            recommendations.append(
                {
                    "priority": "medium",
                    "category": "fraud_prevention",
                    "action": "comprehensive_fraud_review",
                    "description": f"Comprehensive fraud review - {total_indicators} total indicators detected",
                    "implementation": "Conduct thorough fraud assessment and update detection rules",
                }
            )

        # Model improvement
        confidence_level = final_decision.get("confidence", 0)
        if confidence_level < 0.6:
            recommendations.append(
                {
                    "priority": "low",
                    "category": "model_improvement",
                    "action": "enhance_detection_models",
                    "description": f"Low confidence in decision ({confidence_level:.1%})",
                    "implementation": "Review and retrain fraud detection models with additional data",
                }
            )

        return recommendations
