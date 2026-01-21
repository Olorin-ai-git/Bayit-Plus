"""
Fraud Detection Data Preprocessor

Handles data preprocessing and feature extraction for fraud detection.
"""

from typing import Any, Dict, Optional


class FraudDataPreprocessor:
    """Preprocesses transaction and user data for fraud detection analysis."""

    @staticmethod
    def preprocess_fraud_data(
        transaction_data: Dict[str, Any],
        user_profile: Optional[Dict[str, Any]],
        historical_data: Optional[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """Preprocess data for fraud detection analysis."""
        processed: Dict[str, Any] = {
            "transaction_features": {},
            "user_features": {},
            "temporal_features": {},
            "risk_features": {},
            "network_features": {},
            "behavioral_features": {},
            "historical_features": {},
        }

        # Process transaction data
        for key, value in transaction_data.items():
            key_lower = key.lower()

            # Categorize features by type
            if any(
                money_key in key_lower
                for money_key in ["amount", "value", "price", "cost", "fee"]
            ):
                processed["transaction_features"][key] = (
                    float(value) if isinstance(value, (int, float)) else 0.0
                )

            elif any(
                time_key in key_lower for time_key in ["time", "date", "timestamp"]
            ):
                processed["temporal_features"][key] = value

            elif any(
                network_key in key_lower
                for network_key in ["ip", "location", "device", "browser", "agent"]
            ):
                processed["network_features"][key] = str(value)

            elif any(
                risk_key in key_lower
                for risk_key in ["failed", "attempt", "error", "velocity"]
            ):
                processed["risk_features"][key] = value

            else:
                # General transaction features
                if isinstance(value, (int, float)):
                    processed["transaction_features"][key] = float(value)
                else:
                    processed["transaction_features"][key] = str(value)

        # Process user profile if available
        if user_profile:
            for key, value in user_profile.items():
                key_lower = key.lower()

                if any(
                    behavior_key in key_lower
                    for behavior_key in ["habit", "pattern", "frequency", "preference"]
                ):
                    processed["behavioral_features"][key] = value
                else:
                    processed["user_features"][key] = value

        # Process historical data if available
        if historical_data:
            processed["historical_features"] = historical_data

        return processed

    @staticmethod
    def generate_fraud_data_summary(processed_data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate summary of data available for fraud detection."""
        summary: Dict[str, Any] = {
            "feature_categories": {},
            "data_completeness": {},
            "risk_indicators": 0,
        }

        for category, features in processed_data.items():
            if isinstance(features, dict):
                summary["feature_categories"][category] = len(features)

                # Calculate data completeness
                non_empty = sum(
                    1
                    for v in features.values()
                    if v is not None and str(v).strip() != ""
                )
                completeness = non_empty / len(features) if features else 0
                summary["data_completeness"][category] = completeness

                # Count potential risk indicators
                if category == "risk_features":
                    summary["risk_indicators"] = len(features)

        return summary
