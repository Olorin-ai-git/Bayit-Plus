"""
Velocity Calculation Functions.

Provides core calculation logic for velocity analysis.
"""

from collections import defaultdict
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from app.service.analytics.velocity_utils import (
    extract_device_id,
    extract_email,
    extract_ip,
    extract_merchant_id,
    extract_timestamp,
)


def calculate_sliding_windows(
    transaction: Dict[str, Any],
    tx_timestamp: datetime,
    historical_transactions: Optional[List[Dict[str, Any]]],
    window_minutes_short: int,
    window_minutes_medium: int,
    window_hours_long: int,
    window_hours_daily: int,
) -> Dict[str, int]:
    """Calculate transaction counts across multiple sliding windows."""
    windows = {
        f"{window_minutes_short}min": timedelta(minutes=window_minutes_short),
        f"{window_minutes_medium}min": timedelta(minutes=window_minutes_medium),
        f"{window_hours_long}hr": timedelta(hours=window_hours_long),
        f"{window_hours_daily}hr": timedelta(hours=window_hours_daily),
    }

    result = {}

    if not historical_transactions:
        return {name: 1 for name in windows.keys()}

    email = extract_email(transaction)

    for window_name, window_delta in windows.items():
        window_start = tx_timestamp - window_delta
        count = 1

        for hist_tx in historical_transactions:
            hist_timestamp = extract_timestamp(hist_tx)
            hist_email = extract_email(hist_tx)

            if (
                hist_timestamp
                and hist_email == email
                and window_start <= hist_timestamp < tx_timestamp
            ):
                count += 1

        result[window_name] = count

    return result


def calculate_entity_velocities(
    transaction: Dict[str, Any],
    tx_timestamp: datetime,
    historical_transactions: Optional[List[Dict[str, Any]]],
    window_hours_daily: int,
) -> Dict[str, Dict[str, int]]:
    """Calculate velocity per entity type."""
    if not historical_transactions:
        return {
            "email": {"count": 1},
            "device": {"count": 1},
            "ip": {"count": 1},
            "merchant": {"count": 1},
        }

    window_start = tx_timestamp - timedelta(hours=window_hours_daily)

    email = extract_email(transaction)
    device_id = extract_device_id(transaction)
    ip_address = extract_ip(transaction)
    merchant_id = extract_merchant_id(transaction)

    entity_counts = {
        "email": defaultdict(int),
        "device": defaultdict(int),
        "ip": defaultdict(int),
        "merchant": defaultdict(int),
    }

    entity_counts["email"][email] = 1
    entity_counts["device"][device_id] = 1
    entity_counts["ip"][ip_address] = 1
    entity_counts["merchant"][merchant_id] = 1

    for hist_tx in historical_transactions:
        hist_timestamp = extract_timestamp(hist_tx)

        if hist_timestamp and window_start <= hist_timestamp < tx_timestamp:
            hist_email = extract_email(hist_tx)
            hist_device = extract_device_id(hist_tx)
            hist_ip = extract_ip(hist_tx)
            hist_merchant = extract_merchant_id(hist_tx)

            if hist_email == email:
                entity_counts["email"][hist_email] += 1
            if hist_device == device_id:
                entity_counts["device"][hist_device] += 1
            if hist_ip == ip_address:
                entity_counts["ip"][hist_ip] += 1
            if hist_merchant == merchant_id:
                entity_counts["merchant"][hist_merchant] += 1

    return {
        "email": {"count": entity_counts["email"].get(email, 1)},
        "device": {"count": entity_counts["device"].get(device_id, 1)},
        "ip": {"count": entity_counts["ip"].get(ip_address, 1)},
        "merchant": {"count": entity_counts["merchant"].get(merchant_id, 1)},
    }


def calculate_merchant_concentration(
    transaction: Dict[str, Any],
    historical_transactions: Optional[List[Dict[str, Any]]],
    concentration_threshold: float,
) -> Dict[str, Any]:
    """Calculate merchant concentration index."""
    if not historical_transactions:
        return {"concentration_ratio": 1.0, "merchant_count": 1}

    merchant_id = extract_merchant_id(transaction)
    merchant_counts = defaultdict(int)
    merchant_counts[merchant_id] = 1

    for hist_tx in historical_transactions:
        hist_merchant = extract_merchant_id(hist_tx)
        if hist_merchant:
            merchant_counts[hist_merchant] += 1

    total_transactions = sum(merchant_counts.values())
    current_merchant_count = merchant_counts[merchant_id]
    concentration_ratio = (
        current_merchant_count / total_transactions if total_transactions > 0 else 0.0
    )

    return {
        "concentration_ratio": round(concentration_ratio, 3),
        "merchant_count": len(merchant_counts),
        "transactions_at_merchant": current_merchant_count,
        "total_transactions": total_transactions,
        "is_concentrated": concentration_ratio >= concentration_threshold,
    }


def detect_cross_entity_correlation(
    transaction: Dict[str, Any], historical_transactions: Optional[List[Dict[str, Any]]]
) -> Dict[str, Any]:
    """Detect cross-entity velocity correlations."""
    if not historical_transactions:
        return {"correlated": False}

    email = extract_email(transaction)
    device_id = extract_device_id(transaction)
    ip_address = extract_ip(transaction)

    email_devices = set()
    email_ips = set()
    device_emails = set()

    for hist_tx in historical_transactions:
        hist_email = extract_email(hist_tx)
        hist_device = extract_device_id(hist_tx)
        hist_ip = extract_ip(hist_tx)

        if hist_email == email:
            if hist_device:
                email_devices.add(hist_device)
            if hist_ip:
                email_ips.add(hist_ip)

        if hist_device == device_id and hist_email:
            device_emails.add(hist_email)

    return {
        "correlated": len(email_devices) > 1
        or len(email_ips) > 1
        or len(device_emails) > 1,
        "unique_devices_per_email": len(email_devices),
        "unique_ips_per_email": len(email_ips),
        "unique_emails_per_device": len(device_emails),
    }
