"""
Fraud Detection Account Takeover Rules

Implements specific rules for account takeover detection.
"""

from typing import Any, Dict, List


class FraudRulesTakeover:
    """Specific account takeover detection rules."""

    @staticmethod
    def apply_account_takeover_rules(
        risk_features: Dict[str, Any],
        network_features: Dict[str, str],
        thresholds: Dict[str, float],
    ) -> List[Dict[str, Any]]:
        """Apply account takeover detection rules."""
        rules = []

        # Multiple failed login attempts
        failed_attempts: int | float = 0
        for field, value in risk_features.items():
            if "failed" in field.lower() and isinstance(value, (int, float)):
                failed_attempts += value

        if failed_attempts > thresholds["failed_attempts_threshold"]:
            rules.append(
                {
                    "type": "multiple_failed_attempts_takeover",
                    "failed_attempts": failed_attempts,
                    "threshold": thresholds["failed_attempts_threshold"],
                    "confidence": min(
                        failed_attempts / thresholds["failed_attempts_threshold"] / 3,
                        1.0,
                    ),
                    "description": f"Multiple failed attempts: {failed_attempts}",
                }
            )

        # Login from new location
        if (
            "new_location" in str(network_features).lower()
            or "unusual_location" in str(network_features).lower()
        ):
            rules.append(
                {
                    "type": "new_location_takeover",
                    "confidence": 0.5,
                    "description": "Login from new or unusual location",
                }
            )

        # Unusual login time
        for field, value in risk_features.items():
            if "time" in field.lower() or "hour" in field.lower():
                if isinstance(value, (int, float)) and (value < 6 or value > 22):
                    rules.append(
                        {
                            "type": "unusual_time_takeover",
                            "field": field,
                            "value": value,
                            "confidence": 0.4,
                            "description": f"Login at unusual time: {value}",
                        }
                    )

        return rules
