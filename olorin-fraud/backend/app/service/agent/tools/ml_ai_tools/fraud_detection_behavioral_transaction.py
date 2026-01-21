"""
Fraud Detection Behavioral Transaction Analysis

Implements transaction behavior pattern analysis and anomaly detection.
"""

from typing import Any, Dict, List, Optional


class FraudBehavioralTransactionAnalysis:
    """Transaction behavior pattern analysis for fraud detection."""

    @staticmethod
    def analyze_transaction_behavior(
        transaction_features: Dict[str, Any], historical_data: Optional[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Analyze transaction behavior patterns for anomalies."""
        anomalies = []

        # Analyze amounts
        amounts = []
        for field, value in transaction_features.items():
            if (
                "amount" in field.lower()
                and isinstance(value, (int, float))
                and value > 0
            ):
                amounts.append(value)

        if amounts:
            avg_amount = sum(amounts) / len(amounts)

            for amount in amounts:
                if amount > avg_amount * 10:
                    anomalies.append(
                        {
                            "type": "behavioral_amount_spike",
                            "amount": amount,
                            "average": avg_amount,
                            "severity_score": 0.7,
                            "description": f"Amount ({amount}) much higher than average ({avg_amount:.2f})",
                        }
                    )

        # Check frequency
        if historical_data:
            historical_frequency = historical_data.get("transaction_frequency", 0)
            current_frequency = len(amounts)

            if (
                historical_frequency > 0
                and current_frequency > historical_frequency * 5
            ):
                anomalies.append(
                    {
                        "type": "behavioral_frequency_spike",
                        "current_frequency": current_frequency,
                        "historical_frequency": historical_frequency,
                        "severity_score": 0.6,
                        "description": f"Frequency spike: {current_frequency} vs {historical_frequency}",
                    }
                )

        return anomalies
