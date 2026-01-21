"""
Fraud Detection Identity Fraud Rules

Implements specific rules for identity fraud detection.
"""

from typing import Any, Dict, List


class FraudRulesIdentity:
    """Specific identity fraud detection rules."""

    @staticmethod
    def apply_identity_fraud_rules(
        network_features: Dict[str, str],
        transaction_features: Dict[str, Any],
        thresholds: Dict[str, float],
    ) -> List[Dict[str, Any]]:
        """Apply identity fraud detection rules."""
        rules = []

        # VPN/Proxy detection
        for field, value in network_features.items():
            if "ip" in field.lower() or "location" in field.lower():
                vpn_indicators = ["vpn", "proxy", "tor", "anonymous"]
                if any(indicator in str(value).lower() for indicator in vpn_indicators):
                    rules.append(
                        {
                            "type": "vpn_proxy_identity_fraud",
                            "field": field,
                            "value": value,
                            "confidence": 0.7,
                            "description": f"VPN/Proxy detected: {value}",
                        }
                    )

        # Geographic inconsistencies
        user_location = network_features.get("location") or network_features.get(
            "country"
        )
        ip_location = network_features.get("ip_location") or network_features.get(
            "ip_country"
        )

        if user_location and ip_location and user_location != ip_location:
            rules.append(
                {
                    "type": "geographic_inconsistency_fraud",
                    "user_location": user_location,
                    "ip_location": ip_location,
                    "confidence": 0.6,
                    "description": f"Geographic mismatch: User in {user_location}, IP from {ip_location}",
                }
            )

        # Device fingerprint inconsistencies
        device_info = network_features.get("device_id") or network_features.get(
            "user_agent"
        )
        if device_info and "unknown" in str(device_info).lower():
            rules.append(
                {
                    "type": "unknown_device_identity_fraud",
                    "field": "device",
                    "value": device_info,
                    "confidence": 0.5,
                    "description": f"Unknown or masked device: {device_info}",
                }
            )

        return rules
