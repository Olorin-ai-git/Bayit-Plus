"""
Fraud Detection Statistical Velocity and Z-Score Analysis

Implements velocity analysis and Z-score calculation for fraud detection.
"""

from typing import Any, Dict, List, Optional


class FraudStatisticalVelocityZScoreAnalysis:
    """Statistical velocity analysis and Z-score calculation."""

    @staticmethod
    def perform_velocity_analysis(
        processed_data: Dict[str, Any], sensitivity_level: str
    ) -> List[Dict[str, Any]]:
        """Perform velocity analysis."""
        anomalies = []

        transaction_features = processed_data.get("transaction_features", {})
        risk_features = processed_data.get("risk_features", {})

        # Check for velocity indicators
        velocity_indicators = {}
        for field, value in {**transaction_features, **risk_features}.items():
            if "velocity" in field.lower() and isinstance(value, (int, float)):
                velocity_indicators[field] = value

        # Analyze velocity
        threshold = 10 if sensitivity_level == "aggressive" else 20

        for field, value in velocity_indicators.items():
            if value > threshold:
                anomalies.append(
                    {
                        "type": "statistical_high_velocity",
                        "field": field,
                        "velocity": value,
                        "threshold": threshold,
                        "anomaly_score": min(value / (threshold * 2), 1.0),
                        "description": f"High velocity detected: {field} = {value}",
                    }
                )

        return anomalies

    @staticmethod
    def calculate_statistical_z_scores(
        transaction_features: Dict[str, Any], historical_data: Optional[Dict[str, Any]]
    ) -> Dict[str, float]:
        """Calculate Z-scores for numerical features."""
        z_scores: Dict[str, float] = {}

        if not historical_data:
            return z_scores

        # Calculate Z-scores against historical data
        for field, value in transaction_features.items():
            if isinstance(value, (int, float)):
                historical_mean = historical_data.get(f"{field}_mean", 0)
                historical_std = historical_data.get(f"{field}_std", 0)

                if historical_std > 0:
                    z_score = abs(value - historical_mean) / historical_std
                    z_scores[field] = z_score

        return z_scores
