"""
Behavioral Pattern Detectors (Patterns 4-6).

Time-of-Day Anomaly, New Device + High Amount, and Cross-Entity Linking detection.
"""

from typing import Any, Dict, List, Optional

from app.service.analytics.pattern_helpers import (
    extract_amount,
    extract_device_id,
    extract_timestamp,
)

# Detection Thresholds
SUSPICIOUS_HOURS_START = 1
SUSPICIOUS_HOURS_END = 5
TIME_OF_DAY_ANOMALY_ADJUSTMENT = 0.10

HIGH_AMOUNT_THRESHOLD = 500.0
DEVICE_AGE_THRESHOLD_HOURS = 24
NEW_DEVICE_HIGH_AMOUNT_ADJUSTMENT = 0.12

CROSS_ENTITY_THRESHOLD = 5
CROSS_ENTITY_LINKING_ADJUSTMENT = 0.18


def detect_time_of_day_anomaly(transaction: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Detect time-of-day anomaly pattern."""
    tx_timestamp = extract_timestamp(transaction)

    if not tx_timestamp:
        return None

    hour = tx_timestamp.hour

    if SUSPICIOUS_HOURS_START <= hour < SUSPICIOUS_HOURS_END:
        return {
            "pattern_type": "time_of_day_anomaly",
            "pattern_name": "Time-of-Day Anomaly",
            "description": f"Transaction at suspicious hour ({hour}:00)",
            "risk_adjustment": TIME_OF_DAY_ANOMALY_ADJUSTMENT,
            "confidence": 0.75,
            "evidence": {
                "transaction_hour": hour,
                "suspicious_hours": f"{SUSPICIOUS_HOURS_START}-{SUSPICIOUS_HOURS_END}",
                "timestamp": tx_timestamp.isoformat(),
            },
        }

    return None


def detect_new_device_high_amount(
    transaction: Dict[str, Any], historical_transactions: Optional[List[Dict[str, Any]]]
) -> Optional[Dict[str, Any]]:
    """Detect new device + high amount pattern."""
    tx_amount = extract_amount(transaction)
    tx_device = extract_device_id(transaction)
    tx_timestamp = extract_timestamp(transaction)

    if (
        not tx_device
        or not tx_amount
        or not tx_timestamp
        or tx_amount < HIGH_AMOUNT_THRESHOLD
    ):
        return None

    if not historical_transactions:
        return {
            "pattern_type": "new_device_high_amount",
            "pattern_name": "New Device + High Amount",
            "description": f"First transaction from new device with high amount (${tx_amount:.2f})",
            "risk_adjustment": NEW_DEVICE_HIGH_AMOUNT_ADJUSTMENT,
            "confidence": 0.85,
            "evidence": {
                "amount": tx_amount,
                "device_id": tx_device[:10] + "...",
                "high_amount_threshold": HIGH_AMOUNT_THRESHOLD,
                "device_age_hours": 0,
            },
        }

    device_first_seen = tx_timestamp

    for hist_tx in historical_transactions:
        hist_device = extract_device_id(hist_tx)
        hist_timestamp = extract_timestamp(hist_tx)

        if (
            hist_device == tx_device
            and hist_timestamp
            and hist_timestamp < device_first_seen
        ):
            device_first_seen = hist_timestamp

    device_age_hours = (tx_timestamp - device_first_seen).total_seconds() / 3600

    if device_age_hours <= DEVICE_AGE_THRESHOLD_HOURS:
        return {
            "pattern_type": "new_device_high_amount",
            "pattern_name": "New Device + High Amount",
            "description": f"New device (age: {device_age_hours:.1f}h) with high amount (${tx_amount:.2f})",
            "risk_adjustment": NEW_DEVICE_HIGH_AMOUNT_ADJUSTMENT,
            "confidence": min(0.90, 0.70 + (HIGH_AMOUNT_THRESHOLD / tx_amount) * 0.20),
            "evidence": {
                "amount": tx_amount,
                "device_id": tx_device[:10] + "...",
                "device_age_hours": round(device_age_hours, 1),
                "high_amount_threshold": HIGH_AMOUNT_THRESHOLD,
            },
        }

    return None


def detect_cross_entity_linking(
    transaction: Dict[str, Any],
    historical_transactions: Optional[List[Dict[str, Any]]],
    advanced_features: Optional[Dict[str, Any]],
) -> Optional[Dict[str, Any]]:
    """Detect cross-entity linking pattern."""
    if advanced_features and "cross_entity_correlation" in advanced_features:
        correlation = advanced_features["cross_entity_correlation"]

        unique_devices = correlation.get("unique_devices_per_email", 0)
        unique_ips = correlation.get("unique_ips_per_email", 0)
        unique_emails = correlation.get("unique_emails_per_device", 0)

        max_entities = max(unique_devices, unique_ips, unique_emails)

        if max_entities >= CROSS_ENTITY_THRESHOLD:
            entity_type = (
                "devices"
                if max_entities == unique_devices
                else ("IPs" if max_entities == unique_ips else "emails")
            )

            return {
                "pattern_type": "cross_entity_linking",
                "pattern_name": "Cross-Entity Linking",
                "description": f"High entity linkage: {max_entities} unique {entity_type}",
                "risk_adjustment": CROSS_ENTITY_LINKING_ADJUSTMENT,
                "confidence": min(
                    0.95, 0.65 + (max_entities / CROSS_ENTITY_THRESHOLD - 1) * 0.10
                ),
                "evidence": {
                    "unique_devices_per_email": unique_devices,
                    "unique_ips_per_email": unique_ips,
                    "unique_emails_per_device": unique_emails,
                    "max_entities": max_entities,
                    "threshold": CROSS_ENTITY_THRESHOLD,
                },
            }

    return None
