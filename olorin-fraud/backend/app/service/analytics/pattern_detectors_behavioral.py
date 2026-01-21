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

# Cross-Entity Linking: Only trigger on TRUE cross-entity signals
# unique_emails_per_device >= 3 means multiple entities share the same device
# This is the real fraud signal, not "one entity uses multiple devices"
CROSS_ENTITY_EMAILS_PER_DEVICE_THRESHOLD = 3  # Multiple emails on same device
CROSS_ENTITY_LINKING_ADJUSTMENT = 0.12  # Reduced from 0.18


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
    """
    Detect cross-entity linking pattern.

    CRITICAL FIX: Only trigger on TRUE cross-entity signals:
    - unique_emails_per_device: Multiple DIFFERENT entities sharing the same device
      This is a real fraud indicator (device used by multiple accounts)

    DO NOT trigger on intra-entity patterns:
    - unique_devices_per_email: One entity using multiple devices (normal behavior)
    - unique_ips_per_email: One entity from multiple IPs (normal for mobile users)

    These intra-entity patterns were causing 100% false positive rates because
    an entity's transactions always share identifiers with itself.
    """
    if advanced_features and "cross_entity_correlation" in advanced_features:
        correlation = advanced_features["cross_entity_correlation"]

        # ONLY check unique_emails_per_device - the TRUE cross-entity signal
        # This means: "How many different email addresses have used this device?"
        # If > 1, multiple entities are sharing the same device = suspicious
        unique_emails_per_device = correlation.get("unique_emails_per_device", 0)

        # Ignore intra-entity patterns (these are NOT cross-entity)
        # unique_devices_per_email = one person using multiple devices (normal)
        # unique_ips_per_email = one person from multiple locations (normal)

        if unique_emails_per_device >= CROSS_ENTITY_EMAILS_PER_DEVICE_THRESHOLD:
            return {
                "pattern_type": "cross_entity_linking",
                "pattern_name": "Cross-Entity Linking",
                "description": (
                    f"Device shared by {unique_emails_per_device} different entities"
                ),
                "risk_adjustment": CROSS_ENTITY_LINKING_ADJUSTMENT,
                "confidence": min(
                    0.95,
                    0.70
                    + (unique_emails_per_device / CROSS_ENTITY_EMAILS_PER_DEVICE_THRESHOLD - 1)
                    * 0.10,
                ),
                "evidence": {
                    "unique_emails_per_device": unique_emails_per_device,
                    "threshold": CROSS_ENTITY_EMAILS_PER_DEVICE_THRESHOLD,
                    "pattern_explanation": (
                        "Multiple different entities using the same device"
                    ),
                },
            }

    return None
