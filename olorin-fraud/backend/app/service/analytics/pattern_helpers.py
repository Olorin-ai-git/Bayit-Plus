"""
Helper Functions for Pattern Detection.

Provides extraction and calculation utilities for pattern-based risk adjustments.
"""

import math
from datetime import datetime
from typing import Any, Dict, Optional, Tuple

EARTH_RADIUS_MILES = 3959.0


def extract_timestamp(event: Dict[str, Any]) -> Optional[datetime]:
    """Extract timestamp from event."""
    timestamp_fields = ["TX_DATETIME", "timestamp", "created_at", "transaction_time"]

    for field in timestamp_fields:
        if field in event:
            ts = event[field]
            if isinstance(ts, datetime):
                return ts
            elif isinstance(ts, str):
                try:
                    return datetime.fromisoformat(ts.replace("Z", "+00:00"))
                except ValueError:
                    continue
    return None


def extract_amount(event: Dict[str, Any]) -> Optional[float]:
    """Extract transaction amount from event."""
    amount_fields = ["PAID_AMOUNT_VALUE_IN_CURRENCY", "TX_AMOUNT", "amount", "transaction_amount", "AMOUNT"]

    for field in amount_fields:
        if field in event and event[field] is not None:
            try:
                return float(event[field])
            except (ValueError, TypeError):
                continue
    return None


def extract_location(event: Dict[str, Any]) -> Optional[Dict[str, float]]:
    """Extract location (latitude, longitude) from event."""
    lat_fields = ["LATITUDE", "latitude", "lat"]
    lon_fields = ["LONGITUDE", "longitude", "lon", "lng"]

    latitude = None
    longitude = None

    for field in lat_fields:
        if field in event and event[field] is not None:
            try:
                latitude = float(event[field])
                break
            except (ValueError, TypeError):
                continue

    for field in lon_fields:
        if field in event and event[field] is not None:
            try:
                longitude = float(event[field])
                break
            except (ValueError, TypeError):
                continue

    if latitude is not None and longitude is not None:
        return {"latitude": latitude, "longitude": longitude}

    return None


def extract_card_info(event: Dict[str, Any]) -> Optional[Dict[str, str]]:
    """Extract card BIN and last4 from event."""
    bin_fields = ["CARD_BIN", "card_bin", "bin", "BIN"]
    last4_fields = ["CARD_LAST4", "card_last4", "last4", "last_four"]

    bin_num = None
    last4 = None

    for field in bin_fields:
        if field in event and event[field]:
            bin_num = str(event[field])
            break

    for field in last4_fields:
        if field in event and event[field]:
            last4 = str(event[field])
            break

    if bin_num and last4:
        return {"bin": bin_num, "last4": last4}

    return None


def extract_device_id(event: Dict[str, Any]) -> Optional[str]:
    """Extract device ID from event."""
    device_fields = ["DEVICE_ID", "device_id", "device_fingerprint"]

    for field in device_fields:
        if field in event and event[field]:
            return str(event[field])

    return None


def extract_email(event: Dict[str, Any]) -> Optional[str]:
    """Extract email from event."""
    email_fields = ["EMAIL_ADDRESS", "email", "user_email", "EMAIL"]

    for field in email_fields:
        if field in event and event[field]:
            return str(event[field]).lower()

    return None


def extract_ip(event: Dict[str, Any]) -> Optional[str]:
    """Extract IP address from event."""
    ip_fields = ["IP_ADDRESS", "ip_address", "ip", "IP"]

    for field in ip_fields:
        if field in event and event[field]:
            return str(event[field])

    return None


def calculate_distance(loc1: Dict[str, float], loc2: Dict[str, float]) -> float:
    """
    Calculate great circle distance between two locations (miles).
    Uses Haversine formula.
    """
    lat1 = math.radians(loc1.get("latitude", 0))
    lon1 = math.radians(loc1.get("longitude", 0))
    lat2 = math.radians(loc2.get("latitude", 0))
    lon2 = math.radians(loc2.get("longitude", 0))

    dlat = lat2 - lat1
    dlon = lon2 - lon1

    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    distance = EARTH_RADIUS_MILES * c

    return distance
