"""
Guardrails Logic

This module implements guardrails for anomaly detection:
- Persistence: Anomaly must persist across multiple windows
- Hysteresis: Different thresholds for raising vs clearing alerts
- Cooldowns: Minimum time between alerts for same cohort/metric
"""

from typing import Dict
from datetime import datetime
from collections import defaultdict

from app.service.logging import get_bridge_logger
from app.service.anomaly.guardrails_checks import (
    get_cohort_key,
    check_persistence_tracker,
    check_hysteresis,
    check_cooldown
)

logger = get_bridge_logger(__name__)


class Guardrails:
    """
    Guardrails manager for anomaly detection.

    Tracks persistence, applies hysteresis, and enforces cooldowns.
    """

    def __init__(self):
        """Initialize guardrails with configuration."""
        # Track persistence: (cohort_key, metric) -> persisted_n
        self.persistence_tracker: Dict[str, int] = defaultdict(int)
        
        # Track cooldowns: (cohort_key, metric) -> last_alert_time
        self.cooldown_tracker: Dict[str, datetime] = {}
        
        # Track alert states: (cohort_key, metric) -> is_alerting
        self.alert_states: Dict[str, bool] = {}

    def check_persistence(
        self,
        cohort: Dict[str, str],
        metric: str,
        score: float,
        k_threshold: float
    ) -> int:
        """
        Check and update persistence for anomaly.

        Args:
            cohort: Cohort dimensions
            metric: Metric name
            score: Anomaly score
            k_threshold: K threshold for this detector

        Returns:
            Current persistence count (number of consecutive windows)
        """
        return check_persistence_tracker(
            self.persistence_tracker,
            cohort,
            metric,
            score,
            k_threshold
        )

    def check_hysteresis(
        self,
        cohort: Dict[str, str],
        metric: str,
        score: float
    ) -> bool:
        """
        Check if anomaly should be raised based on hysteresis.

        Args:
            cohort: Cohort dimensions
            metric: Metric name
            score: Anomaly score

        Returns:
            True if anomaly should be raised, False otherwise
        """
        return check_hysteresis(
            self.alert_states,
            cohort,
            metric,
            score
        )

    def check_cooldown(
        self,
        cohort: Dict[str, str],
        metric: str,
        current_time: datetime
    ) -> bool:
        """
        Check if cooldown period has passed.

        Args:
            cohort: Cohort dimensions
            metric: Metric name
            current_time: Current timestamp

        Returns:
            True if cooldown has passed, False otherwise
        """
        return check_cooldown(
            self.cooldown_tracker,
            cohort,
            metric,
            current_time
        )

    def update_cooldown(
        self,
        cohort: Dict[str, str],
        metric: str,
        alert_time: datetime
    ) -> None:
        """
        Update cooldown tracker after alert is raised.

        Args:
            cohort: Cohort dimensions
            metric: Metric name
            alert_time: Time when alert was raised
        """
        key = get_cohort_key(cohort, metric)
        self.cooldown_tracker[key] = alert_time
        logger.debug(f"Updated cooldown for {key} at {alert_time}")

    def should_raise_anomaly(
        self,
        cohort: Dict[str, str],
        metric: str,
        score: float,
        persisted_n: int,
        k_threshold: float,
        persistence_required: int,
        current_time: datetime
    ) -> bool:
        """
        Check if anomaly should be raised considering all guardrails.

        Args:
            cohort: Cohort dimensions
            metric: Metric name
            score: Anomaly score
            persisted_n: Current persistence count
            k_threshold: K threshold for detector
            persistence_required: Required persistence (from detector params)
            current_time: Current timestamp

        Returns:
            True if anomaly should be raised, False otherwise
        """
        # Check persistence requirement
        if persisted_n < persistence_required:
            return False

        # Check hysteresis
        if not self.check_hysteresis(cohort, metric, score):
            return False

        # Check cooldown
        if not self.check_cooldown(cohort, metric, current_time):
            return False

        # All guardrails passed
        self.update_cooldown(cohort, metric, current_time)
        return True


def get_guardrails() -> Guardrails:
    """
    Get global guardrails instance.

    Returns:
        Guardrails instance
    """
    return Guardrails()

