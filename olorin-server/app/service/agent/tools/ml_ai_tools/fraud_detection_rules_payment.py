"""
Fraud Detection Payment Fraud Rules

Implements specific rules for payment fraud detection.
"""

from typing import Any, Dict, List


class FraudRulesPayment:
    """Specific payment fraud detection rules."""

    @staticmethod
    def apply_payment_fraud_rules(
        transaction_features: Dict[str, Any], thresholds: Dict[str, float]
    ) -> List[Dict[str, Any]]:
        """Apply payment fraud detection rules."""
        rules = []

        # Large amount rule
        for field, value in transaction_features.items():
            if "amount" in field.lower() and isinstance(value, (int, float)):
                if value > thresholds["amount_threshold"]:
                    rules.append(
                        {
                            "type": "large_amount_payment_fraud",
                            "field": field,
                            "value": value,
                            "threshold": thresholds["amount_threshold"],
                            "confidence": min(
                                value / thresholds["amount_threshold"] / 10, 1.0
                            ),
                            "description": f"Large payment amount: {value} exceeds threshold {thresholds['amount_threshold']}",
                        }
                    )

        # Round amount rule
        for field, value in transaction_features.items():
            if "amount" in field.lower() and isinstance(value, (int, float)):
                if value > 0 and value % 100 == 0 and value >= 1000:
                    rules.append(
                        {
                            "type": "round_amount_payment_fraud",
                            "field": field,
                            "value": value,
                            "confidence": 0.4,
                            "description": f"Suspicious round amount: {value}",
                        }
                    )

        # Unusual currency or payment method
        currency_field = transaction_features.get(
            "currency"
        ) or transaction_features.get("payment_method")
        if currency_field:
            unusual_methods = ["crypto", "bitcoin", "gift_card", "prepaid"]
            if any(method in str(currency_field).lower() for method in unusual_methods):
                rules.append(
                    {
                        "type": "unusual_payment_method_fraud",
                        "field": "payment_method",
                        "value": currency_field,
                        "confidence": 0.6,
                        "description": f"Unusual payment method: {currency_field}",
                    }
                )

        return rules
