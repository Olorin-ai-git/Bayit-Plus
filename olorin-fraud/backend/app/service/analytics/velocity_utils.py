"""
Velocity Analysis Utility Functions.

Provides extraction and helper functions for velocity analysis.
"""

from datetime import datetime
from typing import Any, Dict, Optional


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


def extract_email(event: Dict[str, Any]) -> Optional[str]:
    """Extract email from event."""
    email_fields = ["EMAIL_ADDRESS", "email", "user_email"]
    for field in email_fields:
        if field in event and event[field]:
            return str(event[field]).lower()
    return None


def extract_device_id(event: Dict[str, Any]) -> Optional[str]:
    """Extract device ID from event."""
    device_fields = ["DEVICE_ID", "device_id", "device_fingerprint"]
    for field in device_fields:
        if field in event and event[field]:
            return str(event[field])
    return None


def extract_ip(event: Dict[str, Any]) -> Optional[str]:
    """Extract IP address from event."""
    ip_fields = ["IP_ADDRESS", "ip_address", "ip"]
    for field in ip_fields:
        if field in event and event[field]:
            return str(event[field])
    return None


def extract_merchant_id(event: Dict[str, Any]) -> Optional[str]:
    """Extract merchant ID from event."""
    merchant_fields = ["MERCHANT_ID", "merchant_id", "merchant"]
    for field in merchant_fields:
        if field in event and event[field]:
            return str(event[field])
    return None
