"""
Fraud Detection Score Calculation

Calculates fraud scores for each fraud type and by model.
"""

from typing import Any, Dict, List


class FraudScoreCalculation:
    """Fraud score calculation for each fraud type and model."""

    @staticmethod
    def calculate_fraud_scores(
        model_results: Dict[str, Any], fraud_types: List[str], sensitivity_level: str
    ) -> Dict[str, Any]:
        """Calculate fraud scores for each fraud type."""
        fraud_scores: Dict[str, Any] = {
            "by_fraud_type": {},
            "by_model": {},
            "overall_fraud_score": 0.0,
            "confidence_interval": {},
        }

        # Calculate scores by fraud type
        for fraud_type in fraud_types:
            type_scores: List[float] = []

            # Collect scores from different models
            for model_name, results in model_results.items():
                if isinstance(results, dict):
                    # Rule-based model
                    if model_name == "rule_based" and "fraud_indicators" in results:
                        if fraud_type in results["fraud_indicators"]:
                            indicators = results["fraud_indicators"][fraud_type]
                            if indicators:
                                max_confidence = max(
                                    ind.get("confidence", 0) for ind in indicators
                                )
                                type_scores.append(max_confidence)

                    # Other models
                    elif "overall_score" in results:
                        type_scores.append(results["overall_score"])

            # Calculate fraud type score
            if type_scores:
                fraud_scores["by_fraud_type"][fraud_type] = {
                    "score": max(type_scores),
                    "average_score": sum(type_scores) / len(type_scores),
                    "model_count": len(type_scores),
                }

        # Calculate scores by model
        for model_name, results in model_results.items():
            if isinstance(results, dict) and "overall_score" in results:
                fraud_scores["by_model"][model_name] = results["overall_score"]

        # Calculate overall fraud score
        if fraud_scores["by_fraud_type"]:
            max_type_score = max(
                fraud_data["score"]
                for fraud_data in fraud_scores["by_fraud_type"].values()
            )
            fraud_scores["overall_fraud_score"] = max_type_score
        elif fraud_scores["by_model"]:
            fraud_scores["overall_fraud_score"] = max(fraud_scores["by_model"].values())

        return fraud_scores
