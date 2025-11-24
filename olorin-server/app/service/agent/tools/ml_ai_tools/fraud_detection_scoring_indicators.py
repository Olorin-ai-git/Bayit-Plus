"""
Fraud Detection Indicator Identification

Identifies specific fraud indicators from all models.
"""

from typing import Any, Dict, List
from collections import Counter


class FraudIndicatorIdentification:
    """Fraud indicator identification and categorization."""

    @staticmethod
    def identify_fraud_indicators(
        model_results: Dict[str, Any], processed_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Identify specific fraud indicators from all models."""
        indicators: Dict[str, Any] = {
            "high_risk_indicators": [],
            "medium_risk_indicators": [],
            "low_risk_indicators": [],
            "indicator_categories": {},
            "total_indicators": 0,
        }

        # Collect indicators from all models
        all_indicators: List[Dict[str, Any]] = []

        for model_name, results in model_results.items():
            if isinstance(results, dict):
                if "triggered_rules" in results:
                    for rule in results["triggered_rules"]:
                        rule["source_model"] = model_name
                        all_indicators.append(rule)

                if "behavioral_anomalies" in results:
                    for anomaly in results["behavioral_anomalies"]:
                        anomaly["source_model"] = model_name
                        all_indicators.append(anomaly)

                if "statistical_anomalies" in results:
                    for anomaly in results["statistical_anomalies"]:
                        anomaly["source_model"] = model_name
                        all_indicators.append(anomaly)

                if "consensus_indicators" in results:
                    for consensus in results["consensus_indicators"]:
                        consensus["source_model"] = model_name
                        all_indicators.append(consensus)

        # Categorize indicators by risk level
        for indicator in all_indicators:
            confidence = indicator.get("confidence", 0)
            severity_score = indicator.get("severity_score", 0)
            risk_score = max(confidence, severity_score)

            if risk_score >= 0.7:
                indicators["high_risk_indicators"].append(indicator)
            elif risk_score >= 0.4:
                indicators["medium_risk_indicators"].append(indicator)
            else:
                indicators["low_risk_indicators"].append(indicator)

        # Group indicators by category
        category_counts: Counter[str] = Counter()
        for indicator in all_indicators:
            category = indicator.get("type", "unknown")
            category_counts[category] += 1

        indicators["indicator_categories"] = dict(category_counts)
        indicators["total_indicators"] = len(all_indicators)

        return indicators
