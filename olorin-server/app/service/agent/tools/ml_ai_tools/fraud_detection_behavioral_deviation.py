"""
Fraud Detection Behavioral Deviation Analysis

Implements behavior deviation detection and risk factor identification.
"""

import math
from collections import Counter
from typing import Any, Dict, List


class FraudBehavioralDeviationAnalysis:
    """Behavior deviation and risk factor analysis for fraud detection."""

    @staticmethod
    def analyze_behavior_deviations(
        processed_data: Dict[str, Any], user_profile: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Analyze deviations from established user behavior."""
        deviations = []

        transaction_features = processed_data.get("transaction_features", {})

        # Compare amounts with profile
        profile_avg_amount = user_profile.get("average_transaction_amount", 0)
        current_amounts = []

        for field, value in transaction_features.items():
            if "amount" in field.lower() and isinstance(value, (int, float)):
                current_amounts.append(value)

        if current_amounts and profile_avg_amount > 0:
            current_avg = sum(current_amounts) / len(current_amounts)
            deviation_ratio = current_avg / profile_avg_amount

            if deviation_ratio > 3 or deviation_ratio < 0.33:
                deviations.append(
                    {
                        "type": "behavioral_amount_deviation",
                        "current_average": current_avg,
                        "profile_average": profile_avg_amount,
                        "deviation_ratio": deviation_ratio,
                        "severity_score": min(abs(math.log(deviation_ratio)) / 2, 1.0),
                        "description": f"Amount deviation: {deviation_ratio:.2f}x normal",
                    }
                )

        # Compare frequency
        profile_frequency = user_profile.get("typical_daily_transactions", 1)
        current_frequency = len(current_amounts)

        if profile_frequency > 0 and current_frequency > profile_frequency * 10:
            deviations.append(
                {
                    "type": "behavioral_frequency_deviation",
                    "current_frequency": current_frequency,
                    "profile_frequency": profile_frequency,
                    "severity_score": 0.6,
                    "description": f"Frequency deviation: {current_frequency} vs typical {profile_frequency}",
                }
            )

        return deviations

    @staticmethod
    def identify_behavioral_risk_factors(
        behavioral_anomalies: List[Dict[str, Any]], sensitivity_level: str
    ) -> List[Dict[str, Any]]:
        """Identify behavioral risk factors from anomalies."""
        risk_factors = []

        # Group anomalies by type
        anomaly_types = Counter(
            anomaly.get("type", "unknown") for anomaly in behavioral_anomalies
        )

        # High-frequency anomaly types are risk factors
        for anomaly_type, count in anomaly_types.items():
            if count >= 2:
                risk_factors.append(
                    {
                        "risk_factor": f"multiple_{anomaly_type}",
                        "count": count,
                        "risk_level": "high" if count >= 3 else "medium",
                        "description": f"Multiple {anomaly_type} anomalies detected ({count})",
                    }
                )

        # High-severity anomalies
        high_severity_anomalies = [
            anomaly
            for anomaly in behavioral_anomalies
            if anomaly.get("severity_score", 0) > 0.7
        ]

        if high_severity_anomalies:
            risk_factors.append(
                {
                    "risk_factor": "high_severity_behavioral_anomalies",
                    "count": len(high_severity_anomalies),
                    "risk_level": "high",
                    "description": f"{len(high_severity_anomalies)} high-severity behavioral anomalies",
                }
            )

        return risk_factors
