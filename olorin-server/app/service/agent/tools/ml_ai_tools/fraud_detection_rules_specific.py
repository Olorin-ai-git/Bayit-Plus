"""
Fraud Detection Specific Rules

Orchestrates specific rules for payment, identity, account takeover, and synthetic fraud.

@deprecated Direct usage. Use specialized processors for better modularity:
- fraud_detection_rules_payment: Payment fraud rules
- fraud_detection_rules_identity: Identity fraud rules
- fraud_detection_rules_takeover: Account takeover rules
- fraud_detection_rules_synthetic: Synthetic fraud rules
"""

from typing import Any, Dict, List

from .fraud_detection_rules_identity import FraudRulesIdentity
from .fraud_detection_rules_payment import FraudRulesPayment
from .fraud_detection_rules_synthetic import FraudRulesSynthetic
from .fraud_detection_rules_takeover import FraudRulesTakeover


class FraudRulesSpecific:
    """Specific fraud detection rules for different fraud types."""

    @staticmethod
    def apply_payment_fraud_rules(
        transaction_features: Dict[str, Any], thresholds: Dict[str, float]
    ) -> List[Dict[str, Any]]:
        """Apply payment fraud detection rules."""
        return FraudRulesPayment.apply_payment_fraud_rules(
            transaction_features, thresholds
        )

    @staticmethod
    def apply_identity_fraud_rules(
        network_features: Dict[str, str],
        transaction_features: Dict[str, Any],
        thresholds: Dict[str, float],
    ) -> List[Dict[str, Any]]:
        """Apply identity fraud detection rules."""
        return FraudRulesIdentity.apply_identity_fraud_rules(
            network_features, transaction_features, thresholds
        )

    @staticmethod
    def apply_account_takeover_rules(
        risk_features: Dict[str, Any],
        network_features: Dict[str, str],
        thresholds: Dict[str, float],
    ) -> List[Dict[str, Any]]:
        """Apply account takeover detection rules."""
        return FraudRulesTakeover.apply_account_takeover_rules(
            risk_features, network_features, thresholds
        )

    @staticmethod
    def apply_synthetic_fraud_rules(
        transaction_features: Dict[str, Any],
        network_features: Dict[str, str],
        thresholds: Dict[str, float],
    ) -> List[Dict[str, Any]]:
        """Apply synthetic identity fraud detection rules."""
        return FraudRulesSynthetic.apply_synthetic_fraud_rules(
            transaction_features, network_features, thresholds
        )
