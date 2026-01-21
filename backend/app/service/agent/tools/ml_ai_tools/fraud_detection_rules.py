"""
Fraud Detection Rule-Based Engine

Orchestrates rule-based fraud detection using specific rule implementations.
"""

from typing import Any, Dict, List

from .fraud_detection_rules_specific import FraudRulesSpecific


class FraudDetectionRules:
    """Rule-based fraud detection engine and orchestrator."""

    @staticmethod
    def get_sensitivity_thresholds(sensitivity_level: str) -> Dict[str, float]:
        """Get threshold values based on sensitivity level."""
        thresholds = {
            "aggressive": {
                "amount_threshold": 1000,
                "velocity_threshold": 5,
                "failed_attempts_threshold": 2,
                "confidence_threshold": 0.3,
            },
            "balanced": {
                "amount_threshold": 5000,
                "velocity_threshold": 10,
                "failed_attempts_threshold": 3,
                "confidence_threshold": 0.5,
            },
            "conservative": {
                "amount_threshold": 10000,
                "velocity_threshold": 20,
                "failed_attempts_threshold": 5,
                "confidence_threshold": 0.7,
            },
        }
        return thresholds.get(sensitivity_level, thresholds["balanced"])

    @staticmethod
    def apply_rule_based_detection(
        processed_data: Dict[str, Any], fraud_types: List[str], sensitivity_level: str
    ) -> Dict[str, Any]:
        """Apply rule-based fraud detection."""
        rule_results: Dict[str, Any] = {
            "triggered_rules": [],
            "fraud_indicators": {},
            "rule_scores": {},
            "overall_score": 0.0,
        }

        transaction_features = processed_data.get("transaction_features", {})
        risk_features = processed_data.get("risk_features", {})
        network_features = processed_data.get("network_features", {})

        # Get thresholds
        thresholds = FraudDetectionRules.get_sensitivity_thresholds(sensitivity_level)

        # Apply fraud-specific rules
        if "payment_fraud" in fraud_types:
            payment_rules = FraudRulesSpecific.apply_payment_fraud_rules(
                transaction_features, thresholds
            )
            rule_results["fraud_indicators"]["payment_fraud"] = payment_rules
            rule_results["triggered_rules"].extend(payment_rules)

        if "identity_fraud" in fraud_types:
            identity_rules = FraudRulesSpecific.apply_identity_fraud_rules(
                network_features, transaction_features, thresholds
            )
            rule_results["fraud_indicators"]["identity_fraud"] = identity_rules
            rule_results["triggered_rules"].extend(identity_rules)

        if "account_takeover" in fraud_types:
            takeover_rules = FraudRulesSpecific.apply_account_takeover_rules(
                risk_features, network_features, thresholds
            )
            rule_results["fraud_indicators"]["account_takeover"] = takeover_rules
            rule_results["triggered_rules"].extend(takeover_rules)

        if "synthetic_fraud" in fraud_types:
            synthetic_rules = FraudRulesSpecific.apply_synthetic_fraud_rules(
                transaction_features, network_features, thresholds
            )
            rule_results["fraud_indicators"]["synthetic_fraud"] = synthetic_rules
            rule_results["triggered_rules"].extend(synthetic_rules)

        # Calculate rule scores
        for fraud_type, indicators in rule_results["fraud_indicators"].items():
            if indicators:
                scores = [indicator.get("confidence", 0) for indicator in indicators]
                rule_results["rule_scores"][fraud_type] = max(scores) if scores else 0

        # Calculate overall rule score
        if rule_results["rule_scores"]:
            rule_results["overall_score"] = max(rule_results["rule_scores"].values())

        return rule_results
