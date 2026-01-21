"""
Fraud Detection Synthetic Fraud Rules

Implements specific rules for synthetic identity fraud detection.
"""

from typing import Any, Dict, List


class FraudRulesSynthetic:
    """Specific synthetic identity fraud detection rules."""

    @staticmethod
    def apply_synthetic_fraud_rules(
        transaction_features: Dict[str, Any],
        network_features: Dict[str, str],
        thresholds: Dict[str, float],
    ) -> List[Dict[str, Any]]:
        """Apply synthetic identity fraud detection rules."""
        rules = []

        # New account with high-value transaction
        account_age = transaction_features.get(
            "account_age"
        ) or transaction_features.get("days_since_signup")
        transaction_amount: int | float = 0

        for field, value in transaction_features.items():
            if "amount" in field.lower() and isinstance(value, (int, float)):
                transaction_amount = max(transaction_amount, value)

        if account_age is not None and isinstance(account_age, (int, float)):
            if account_age < 30 and transaction_amount > 2000:
                rules.append(
                    {
                        "type": "new_account_large_transaction_synthetic",
                        "account_age": account_age,
                        "transaction_amount": transaction_amount,
                        "confidence": 0.7,
                        "description": f"New account ({account_age} days) with large transaction ({transaction_amount})",
                    }
                )

        # Perfect credit score
        credit_score = transaction_features.get("credit_score")
        if credit_score is not None and isinstance(credit_score, (int, float)):
            if credit_score >= 800 and account_age is not None and account_age < 90:
                rules.append(
                    {
                        "type": "perfect_credit_new_account_synthetic",
                        "credit_score": credit_score,
                        "account_age": account_age,
                        "confidence": 0.6,
                        "description": f"Perfect credit score ({credit_score}) for new account ({account_age} days)",
                    }
                )

        # Inconsistent information patterns
        email = transaction_features.get("email") or network_features.get("email")

        if email:
            if "temp" in str(email).lower() or "disposable" in str(email).lower():
                rules.append(
                    {
                        "type": "disposable_email_synthetic",
                        "email": email,
                        "confidence": 0.5,
                        "description": f"Disposable email detected: {email}",
                    }
                )

        return rules
