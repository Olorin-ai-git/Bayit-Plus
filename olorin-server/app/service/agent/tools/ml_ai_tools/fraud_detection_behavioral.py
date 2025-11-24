"""
Fraud Detection Behavioral Analysis

Orchestrates behavioral analysis and deviation detection for fraud patterns.

@deprecated Direct usage. Use specialized processors for better modularity:
- fraud_detection_behavioral_transaction: Transaction behavior analysis
- fraud_detection_behavioral_temporal: Temporal behavior analysis
- fraud_detection_behavioral_deviation: Deviation and risk factor analysis
"""

from typing import Any, Dict, List, Optional

from .fraud_detection_behavioral_transaction import (
    FraudBehavioralTransactionAnalysis,
)
from .fraud_detection_behavioral_temporal import FraudBehavioralTemporalAnalysis
from .fraud_detection_behavioral_deviation import FraudBehavioralDeviationAnalysis


class FraudBehavioralAnalysis:
    """Behavioral analysis and pattern detection for fraud."""

    @staticmethod
    def apply_behavioral_fraud_detection(
        processed_data: Dict[str, Any],
        user_profile: Optional[Dict[str, Any]],
        historical_data: Optional[Dict[str, Any]],
        sensitivity_level: str,
    ) -> Dict[str, Any]:
        """Apply behavioral fraud detection."""
        behavioral_results: Dict[str, Any] = {
            "behavioral_anomalies": [],
            "deviation_scores": {},
            "behavioral_risk_factors": [],
            "overall_score": 0.0,
        }

        transaction_features = processed_data.get("transaction_features", {})
        temporal_features = processed_data.get("temporal_features", {})

        # Analyze transaction behavior
        transaction_behavior = (
            FraudBehavioralTransactionAnalysis.analyze_transaction_behavior(
                transaction_features, historical_data
            )
        )
        behavioral_results["behavioral_anomalies"].extend(transaction_behavior)

        # Analyze temporal behavior
        temporal_behavior = FraudBehavioralTemporalAnalysis.analyze_temporal_behavior(
            temporal_features, user_profile, historical_data
        )
        behavioral_results["behavioral_anomalies"].extend(temporal_behavior)

        # Analyze user behavior deviations
        if user_profile:
            behavior_deviations = (
                FraudBehavioralDeviationAnalysis.analyze_behavior_deviations(
                    processed_data, user_profile
                )
            )
            behavioral_results["behavioral_anomalies"].extend(behavior_deviations)

        # Calculate deviation scores
        if behavioral_results["behavioral_anomalies"]:
            for anomaly in behavioral_results["behavioral_anomalies"]:
                behavior_type = anomaly.get("type", "unknown")
                score = anomaly.get("severity_score", 0)

                if behavior_type not in behavioral_results["deviation_scores"]:
                    behavioral_results["deviation_scores"][behavior_type] = []
                behavioral_results["deviation_scores"][behavior_type].append(score)

        # Identify risk factors
        risk_factors = (
            FraudBehavioralDeviationAnalysis.identify_behavioral_risk_factors(
                behavioral_results["behavioral_anomalies"], sensitivity_level
            )
        )
        behavioral_results["behavioral_risk_factors"] = risk_factors

        # Calculate overall score
        all_scores = [
            anomaly.get("severity_score", 0)
            for anomaly in behavioral_results["behavioral_anomalies"]
        ]
        if all_scores:
            behavioral_results["overall_score"] = max(all_scores)

        return behavioral_results
