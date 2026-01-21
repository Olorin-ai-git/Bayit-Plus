"""
Fraud Detection Statistical Amount and Frequency Analysis

Implements statistical analysis of transaction amounts and activity frequency.
"""

import math
from typing import Any, Dict, List, Optional


class FraudStatisticalAmountFrequencyAnalysis:
    """Statistical analysis of transaction amounts and frequency patterns."""

    @staticmethod
    def perform_statistical_amount_analysis(
        transaction_features: Dict[str, Any],
        historical_data: Optional[Dict[str, Any]],
        sensitivity_level: str,
    ) -> List[Dict[str, Any]]:
        """Perform statistical analysis of transaction amounts."""
        anomalies: List[Dict[str, Any]] = []

        # Collect amounts
        amounts: List[float] = []
        for field, value in transaction_features.items():
            if (
                "amount" in field.lower()
                and isinstance(value, (int, float))
                and value > 0
            ):
                amounts.append(value)

        if len(amounts) < 2:
            return anomalies

        # Calculate statistics
        mean_amount = sum(amounts) / len(amounts)
        variance = sum((x - mean_amount) ** 2 for x in amounts) / len(amounts)
        std_dev = math.sqrt(variance) if variance > 0 else 0

        # Find outliers
        if std_dev > 0:
            threshold = 2.0 if sensitivity_level == "aggressive" else 3.0

            for amount in amounts:
                z_score = abs(amount - mean_amount) / std_dev
                if z_score > threshold:
                    anomalies.append(
                        {
                            "type": "statistical_amount_outlier",
                            "amount": amount,
                            "z_score": z_score,
                            "anomaly_score": min(z_score / 5.0, 1.0),
                            "description": f"Statistical outlier: amount {amount} (Z-score: {z_score:.2f})",
                        }
                    )

        # Compare with historical
        if historical_data:
            historical_mean = historical_data.get("mean_transaction_amount", 0)
            if historical_mean > 0 and mean_amount > historical_mean * 5:
                anomalies.append(
                    {
                        "type": "statistical_historical_deviation",
                        "current_mean": mean_amount,
                        "historical_mean": historical_mean,
                        "deviation_ratio": mean_amount / historical_mean,
                        "anomaly_score": 0.7,
                        "description": f"Mean deviation from historical: {mean_amount:.2f} vs {historical_mean:.2f}",
                    }
                )

        return anomalies

    @staticmethod
    def perform_frequency_analysis(
        processed_data: Dict[str, Any],
        historical_data: Optional[Dict[str, Any]],
        sensitivity_level: str,
    ) -> List[Dict[str, Any]]:
        """Perform frequency analysis of activities."""
        from collections import Counter

        anomalies: List[Dict[str, Any]] = []

        # Count activity types
        activity_counts: Dict[str, int] = {}

        # Count transaction types
        transaction_features = processed_data.get("transaction_features", {})
        for field, value in transaction_features.items():
            if "type" in field.lower():
                key = f"transaction_{value}"
                activity_counts[key] = activity_counts.get(key, 0) + 1

        # Count network activities
        network_features = processed_data.get("network_features", {})
        for field, value in network_features.items():
            if "action" in field.lower() or "event" in field.lower():
                key = f"network_{value}"
                activity_counts[key] = activity_counts.get(key, 0) + 1

        # Analyze frequencies
        total_activities = sum(activity_counts.values())
        if total_activities > 0:
            for activity, count in activity_counts.items():
                frequency = count / total_activities

                # High frequency might indicate automation
                if frequency > 0.8 and count > 5:
                    anomalies.append(
                        {
                            "type": "statistical_high_frequency",
                            "activity": activity,
                            "count": count,
                            "frequency": frequency,
                            "anomaly_score": frequency,
                            "description": f"High frequency of {activity}: {frequency:.1%} ({count} times)",
                        }
                    )

        return anomalies
