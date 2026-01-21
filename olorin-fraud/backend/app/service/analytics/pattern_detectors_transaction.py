"""
Transaction-Based Pattern Detectors (Patterns 1-3).

Card Testing, Geo-Impossibility, and BIN Attack detection.
"""

import os
from datetime import timedelta
from typing import Any, Dict, List, Optional

from app.service.analytics.pattern_helpers import (
    calculate_distance,
    extract_amount,
    extract_card_info,
    extract_location,
    extract_timestamp,
)

# Detection Thresholds (from environment variables)
def _get_float_env(key: str, default: str) -> float:
    return float(os.getenv(key, default))

def _get_int_env(key: str, default: str) -> int:
    return int(os.getenv(key, default))

CARD_TESTING_MIN_ATTEMPTS = _get_int_env("PATTERN_CARD_TESTING_MIN_ATTEMPTS", "3")
CARD_TESTING_MAX_AMOUNT = _get_float_env("PATTERN_CARD_TESTING_MAX_AMOUNT", "10.0")
CARD_TESTING_TIME_WINDOW_MINUTES = _get_int_env("PATTERN_CARD_TESTING_TIME_WINDOW_MINUTES", "10")
CARD_TESTING_ADJUSTMENT = _get_float_env("PATTERN_CARD_TESTING_ADJUSTMENT", "0.20")

GEO_IMPOSSIBILITY_MAX_SPEED_MPH = _get_int_env("PATTERN_GEO_IMPOSSIBILITY_MAX_SPEED_MPH", "600")
GEO_IMPOSSIBILITY_ADJUSTMENT = _get_float_env("PATTERN_GEO_IMPOSSIBILITY_ADJUSTMENT", "0.25")

BIN_ATTACK_MIN_CARDS = _get_int_env("PATTERN_BIN_ATTACK_MIN_CARDS", "4")
BIN_ATTACK_TIME_WINDOW_HOURS = _get_int_env("PATTERN_BIN_ATTACK_TIME_WINDOW_HOURS", "24")
BIN_ATTACK_ADJUSTMENT = _get_float_env("PATTERN_BIN_ATTACK_ADJUSTMENT", "0.15")


def detect_card_testing(
    transaction: Dict[str, Any], historical_transactions: Optional[List[Dict[str, Any]]]
) -> Optional[Dict[str, Any]]:
    """Detect card testing pattern."""
    if not historical_transactions:
        return None

    tx_amount = extract_amount(transaction)
    tx_timestamp = extract_timestamp(transaction)

    if not tx_timestamp or tx_amount is None or tx_amount > CARD_TESTING_MAX_AMOUNT:
        return None

    window_start = tx_timestamp - timedelta(minutes=CARD_TESTING_TIME_WINDOW_MINUTES)
    small_amount_count = 1

    for hist_tx in historical_transactions:
        hist_timestamp = extract_timestamp(hist_tx)
        hist_amount = extract_amount(hist_tx)

        if (
            hist_timestamp
            and hist_amount is not None
            and window_start <= hist_timestamp < tx_timestamp
            and hist_amount <= CARD_TESTING_MAX_AMOUNT
        ):
            small_amount_count += 1

    if small_amount_count >= CARD_TESTING_MIN_ATTEMPTS:
        return {
            "pattern_type": "card_testing",
            "pattern_name": "Card Testing Detection",
            "description": f"Multiple small-amount transactions ({small_amount_count}) in {CARD_TESTING_TIME_WINDOW_MINUTES} minutes",
            "risk_adjustment": CARD_TESTING_ADJUSTMENT,
            "confidence": min(
                0.95, 0.70 + (small_amount_count - CARD_TESTING_MIN_ATTEMPTS) * 0.05
            ),
            "evidence": {
                "attempt_count": small_amount_count,
                "time_window_minutes": CARD_TESTING_TIME_WINDOW_MINUTES,
                "max_amount": CARD_TESTING_MAX_AMOUNT,
            },
        }

    return None


def detect_geo_impossibility(
    transaction: Dict[str, Any], historical_transactions: Optional[List[Dict[str, Any]]]
) -> Optional[Dict[str, Any]]:
    """Detect geo-impossibility pattern."""
    if not historical_transactions:
        return None

    tx_location = extract_location(transaction)
    tx_timestamp = extract_timestamp(transaction)

    if not tx_location or not tx_timestamp:
        return None

    for hist_tx in historical_transactions:
        hist_location = extract_location(hist_tx)
        hist_timestamp = extract_timestamp(hist_tx)

        if not hist_location or not hist_timestamp or hist_timestamp >= tx_timestamp:
            continue

        time_diff_hours = (tx_timestamp - hist_timestamp).total_seconds() / 3600
        if time_diff_hours <= 0:
            continue

        distance_miles = calculate_distance(tx_location, hist_location)
        required_speed = distance_miles / time_diff_hours

        if required_speed > GEO_IMPOSSIBILITY_MAX_SPEED_MPH:
            return {
                "pattern_type": "geo_impossibility",
                "pattern_name": "Geo-Impossibility Detection",
                "description": f"Impossible travel speed: {required_speed:.0f} mph required",
                "risk_adjustment": GEO_IMPOSSIBILITY_ADJUSTMENT,
                "confidence": min(
                    0.98,
                    0.75
                    + (required_speed / GEO_IMPOSSIBILITY_MAX_SPEED_MPH - 1) * 0.10,
                ),
                "evidence": {
                    "required_speed_mph": round(required_speed, 1),
                    "distance_miles": round(distance_miles, 1),
                    "time_diff_hours": round(time_diff_hours, 2),
                    "max_feasible_speed_mph": GEO_IMPOSSIBILITY_MAX_SPEED_MPH,
                },
            }

    return None


def detect_bin_attack(
    transaction: Dict[str, Any], historical_transactions: Optional[List[Dict[str, Any]]]
) -> Optional[Dict[str, Any]]:
    """Detect BIN attack pattern."""
    if (
        not historical_transactions
        or len(historical_transactions) < BIN_ATTACK_MIN_CARDS - 1
    ):
        return None

    tx_card = extract_card_info(transaction)
    tx_timestamp = extract_timestamp(transaction)

    if not tx_card or not tx_timestamp:
        return None

    window_start = tx_timestamp - timedelta(hours=BIN_ATTACK_TIME_WINDOW_HOURS)
    bin_num = tx_card["bin"]
    card_last4s = {tx_card["last4"]}

    for hist_tx in historical_transactions:
        hist_timestamp = extract_timestamp(hist_tx)
        hist_card = extract_card_info(hist_tx)

        if (
            hist_timestamp
            and hist_card
            and window_start <= hist_timestamp < tx_timestamp
            and hist_card["bin"] == bin_num
        ):
            card_last4s.add(hist_card["last4"])

    if len(card_last4s) >= BIN_ATTACK_MIN_CARDS:
        return {
            "pattern_type": "bin_attack",
            "pattern_name": "BIN Attack Detection",
            "description": f"Same BIN ({bin_num}) with {len(card_last4s)} different card numbers",
            "risk_adjustment": BIN_ATTACK_ADJUSTMENT,
            "confidence": min(
                0.95, 0.75 + (len(card_last4s) - BIN_ATTACK_MIN_CARDS) * 0.05
            ),
            "evidence": {
                "bin": bin_num,
                "unique_card_count": len(card_last4s),
                "time_window_hours": BIN_ATTACK_TIME_WINDOW_HOURS,
                "sample_last4": list(card_last4s)[:5],
            },
        }

    return None
