"""
Guardrails Check Functions

This module provides individual guardrail check functions.
"""

import random
from datetime import datetime, timedelta
from typing import Dict

from app.config.anomaly_config import get_anomaly_config
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


def get_cohort_key(cohort: Dict[str, str], metric: str) -> str:
    """
    Generate unique key for cohort/metric combination.

    Args:
        cohort: Cohort dimensions
        metric: Metric name

    Returns:
        Unique string key
    """
    cohort_str = "_".join(f"{k}:{v}" for k, v in sorted(cohort.items()))
    return f"{cohort_str}|{metric}"


def check_persistence_tracker(
    persistence_tracker: Dict[str, int],
    cohort: Dict[str, str],
    metric: str,
    score: float,
    k_threshold: float,
) -> int:
    """
    Check and update persistence for anomaly.

    Args:
        persistence_tracker: Dictionary tracking persistence counts
        cohort: Cohort dimensions
        metric: Metric name
        score: Anomaly score
        k_threshold: K threshold for this detector

    Returns:
        Current persistence count (number of consecutive windows)
    """
    key = get_cohort_key(cohort, metric)

    if score > k_threshold:
        # Increment persistence
        persistence_tracker[key] += 1
    else:
        # Reset persistence if score drops below threshold
        persistence_tracker[key] = 0

    return persistence_tracker[key]


def check_hysteresis(
    alert_states: Dict[str, bool], cohort: Dict[str, str], metric: str, score: float
) -> bool:
    """
    Check if anomaly should be raised based on hysteresis.

    Args:
        alert_states: Dictionary tracking alert states
        cohort: Cohort dimensions
        metric: Metric name
        score: Anomaly score

    Returns:
        True if anomaly should be raised, False otherwise
    """
    key = get_cohort_key(cohort, metric)
    is_currently_alerting = alert_states.get(key, False)
    config = get_anomaly_config()

    if is_currently_alerting:
        # Use clear threshold (lower)
        threshold = config.hysteresis_clear_k
        if score <= threshold:
            alert_states[key] = False
            logger.debug(f"Clearing alert for {key}: score={score} <= {threshold}")
            return False
        else:
            return True
    else:
        # Use raise threshold (higher)
        threshold = config.hysteresis_raise_k
        if score >= threshold:
            alert_states[key] = True
            logger.debug(f"Raising alert for {key}: score={score} >= {threshold}")
            return True
        else:
            return False


def check_cooldown(
    cooldown_tracker: Dict[str, datetime],
    cohort: Dict[str, str],
    metric: str,
    current_time: datetime,
) -> bool:
    """
    Check if cooldown period has passed.

    Args:
        cooldown_tracker: Dictionary tracking last alert times
        cohort: Cohort dimensions
        metric: Metric name
        current_time: Current timestamp

    Returns:
        True if cooldown has passed, False otherwise
    """
    key = get_cohort_key(cohort, metric)
    last_alert_time = cooldown_tracker.get(key)
    config = get_anomaly_config()

    if last_alert_time is None:
        return True

    # Calculate cooldown duration (randomized between min and max)
    cooldown_minutes = random.randint(
        config.cooldown_min_minutes, config.cooldown_max_minutes
    )
    cooldown_duration = timedelta(minutes=cooldown_minutes)

    if current_time - last_alert_time >= cooldown_duration:
        return True
    else:
        remaining = cooldown_duration - (current_time - last_alert_time)
        logger.debug(
            f"Cooldown active for {key}: {remaining.total_seconds()/60:.1f} "
            f"minutes remaining"
        )
        return False
