"""
Feature Extraction Helper Functions.

Provides utility functions for extracting features from transactions.
"""

from typing import Any, Dict
from datetime import datetime


def extract_hour(transaction: Dict[str, Any]) -> int:
    """Extract hour from transaction timestamp."""
    timestamp_fields = ["TX_DATETIME", "timestamp", "created_at"]

    for field in timestamp_fields:
        if field in transaction:
            ts = transaction[field]
            if isinstance(ts, datetime):
                return ts.hour
            elif isinstance(ts, str):
                try:
                    dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
                    return dt.hour
                except ValueError:
                    continue

    return 12  # Default to noon if unknown


def extract_day_of_week(transaction: Dict[str, Any]) -> int:
    """Extract day of week (0=Monday, 6=Sunday)."""
    timestamp_fields = ["TX_DATETIME", "timestamp", "created_at"]

    for field in timestamp_fields:
        if field in transaction:
            ts = transaction[field]
            if isinstance(ts, datetime):
                return ts.weekday()
            elif isinstance(ts, str):
                try:
                    dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
                    return dt.weekday()
                except ValueError:
                    continue

    return 2  # Default to Wednesday if unknown


def safe_float(value: Any) -> float:
    """Safely convert value to float."""
    try:
        return float(value) if value is not None else 0.0
    except (ValueError, TypeError):
        return 0.0


def handle_missing_values(features: Dict[str, Any]) -> Dict[str, Any]:
    """Handle missing values in features."""
    for key, value in features.items():
        if value is None:
            if "score" in key.lower() or "ratio" in key.lower():
                features[key] = 0.0
            elif "count" in key.lower() or "velocity" in key.lower():
                features[key] = 0
            elif "flag" in key.lower():
                features[key] = 0.0
            else:
                features[key] = 0.0

    return features
