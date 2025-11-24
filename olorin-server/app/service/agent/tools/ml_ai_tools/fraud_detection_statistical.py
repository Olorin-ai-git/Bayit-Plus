"""
Fraud Detection Statistical Analysis

Orchestrates statistical methods for fraud detection including Z-scores and outlier analysis.

@deprecated Direct usage. Use specialized processors for better modularity:
- fraud_detection_statistical_amount_frequency: Amount and frequency analysis
- fraud_detection_statistical_velocity: Velocity and Z-score analysis
- fraud_detection_statistical_outlier: Outlier detection and analysis
"""

from typing import Any, Dict, List, Optional

from .fraud_detection_statistical_amount_frequency import (
    FraudStatisticalAmountFrequencyAnalysis,
)
from .fraud_detection_statistical_velocity import (
    FraudStatisticalVelocityZScoreAnalysis,
)
from .fraud_detection_statistical_outlier import FraudStatisticalOutlierAnalysis


class FraudStatisticalAnalysis:
    """Statistical analysis methods for fraud detection."""

    @staticmethod
    def apply_statistical_fraud_detection(
        processed_data: Dict[str, Any],
        historical_data: Optional[Dict[str, Any]],
        sensitivity_level: str,
    ) -> Dict[str, Any]:
        """Apply statistical fraud detection methods."""
        statistical_results: Dict[str, Any] = {
            "statistical_anomalies": [],
            "z_scores": {},
            "outlier_analysis": {},
            "overall_score": 0.0,
        }

        transaction_features = processed_data.get("transaction_features", {})

        # Amount analysis
        amount_analysis = (
            FraudStatisticalAmountFrequencyAnalysis.perform_statistical_amount_analysis(
                transaction_features, historical_data, sensitivity_level
            )
        )
        statistical_results["statistical_anomalies"].extend(amount_analysis)

        # Frequency analysis
        frequency_analysis = (
            FraudStatisticalAmountFrequencyAnalysis.perform_frequency_analysis(
                processed_data, historical_data, sensitivity_level
            )
        )
        statistical_results["statistical_anomalies"].extend(frequency_analysis)

        # Velocity analysis
        velocity_analysis = (
            FraudStatisticalVelocityZScoreAnalysis.perform_velocity_analysis(
                processed_data, sensitivity_level
            )
        )
        statistical_results["statistical_anomalies"].extend(velocity_analysis)

        # Calculate Z-scores
        z_scores = (
            FraudStatisticalVelocityZScoreAnalysis.calculate_statistical_z_scores(
                transaction_features, historical_data
            )
        )
        statistical_results["z_scores"] = z_scores

        # Outlier analysis
        outlier_analysis = FraudStatisticalOutlierAnalysis.perform_outlier_analysis(
            transaction_features, z_scores, sensitivity_level
        )
        statistical_results["outlier_analysis"] = outlier_analysis

        # Calculate overall score
        all_scores = [
            anomaly.get("anomaly_score", 0)
            for anomaly in statistical_results["statistical_anomalies"]
        ]
        if all_scores:
            statistical_results["overall_score"] = max(all_scores)

        return statistical_results

    @staticmethod
    def perform_statistical_amount_analysis(
        transaction_features: Dict[str, Any],
        historical_data: Optional[Dict[str, Any]],
        sensitivity_level: str,
    ) -> List[Dict[str, Any]]:
        """Perform statistical analysis of transaction amounts."""
        return (
            FraudStatisticalAmountFrequencyAnalysis.perform_statistical_amount_analysis(
                transaction_features, historical_data, sensitivity_level
            )
        )

    @staticmethod
    def perform_frequency_analysis(
        processed_data: Dict[str, Any],
        historical_data: Optional[Dict[str, Any]],
        sensitivity_level: str,
    ) -> List[Dict[str, Any]]:
        """Perform frequency analysis of activities."""
        return FraudStatisticalAmountFrequencyAnalysis.perform_frequency_analysis(
            processed_data, historical_data, sensitivity_level
        )

    @staticmethod
    def perform_velocity_analysis(
        processed_data: Dict[str, Any], sensitivity_level: str
    ) -> List[Dict[str, Any]]:
        """Perform velocity analysis."""
        return FraudStatisticalVelocityZScoreAnalysis.perform_velocity_analysis(
            processed_data, sensitivity_level
        )

    @staticmethod
    def calculate_statistical_z_scores(
        transaction_features: Dict[str, Any], historical_data: Optional[Dict[str, Any]]
    ) -> Dict[str, float]:
        """Calculate Z-scores for numerical features."""
        return FraudStatisticalVelocityZScoreAnalysis.calculate_statistical_z_scores(
            transaction_features, historical_data
        )

    @staticmethod
    def perform_outlier_analysis(
        transaction_features: Dict[str, Any],
        z_scores: Dict[str, float],
        sensitivity_level: str,
    ) -> Dict[str, Any]:
        """Perform comprehensive outlier analysis."""
        return FraudStatisticalOutlierAnalysis.perform_outlier_analysis(
            transaction_features, z_scores, sensitivity_level
        )
