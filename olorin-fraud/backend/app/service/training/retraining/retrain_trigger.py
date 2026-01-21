"""
Retrain Trigger
Feature: 026-llm-training-pipeline

Manages event-driven retraining triggers based on drift and performance.
"""

import os
import uuid
from datetime import datetime, timedelta
from typing import List, Optional

from app.service.logging import get_bridge_logger
from app.service.training.retraining.retraining_models import RetrainEvent, RetrainReason
from app.service.training.temporal.drift_monitor import get_drift_monitor
from app.service.training.training_config_loader import get_training_config

logger = get_bridge_logger(__name__)


class RetrainTrigger:
    """Manages retraining triggers based on events."""

    def __init__(self):
        """Initialize retrain trigger from config."""
        self._config = get_training_config()
        self._drift_monitor = get_drift_monitor()
        self._init_from_config()
        self._events: List[RetrainEvent] = []
        self._last_retrain: Optional[datetime] = None

    def _init_from_config(self) -> None:
        """Initialize settings from configuration."""
        self._trigger_on_drift = os.getenv("LLM_TRIGGER_ON_DRIFT", "true").lower() == "true"
        self._trigger_on_degradation = (
            os.getenv("LLM_TRIGGER_ON_DEGRADATION", "true").lower() == "true"
        )
        self._degradation_threshold = float(
            os.getenv("LLM_DEGRADATION_THRESHOLD", "0.05")
        )
        self._cooldown_hours = int(os.getenv("LLM_RETRAIN_COOLDOWN_HOURS", "24"))

    def check_drift_trigger(self) -> Optional[RetrainEvent]:
        """
        Check if drift should trigger retraining.

        Returns:
            RetrainEvent if triggered, None otherwise
        """
        if not self._trigger_on_drift:
            return None

        if self._is_in_cooldown():
            return None

        if self._drift_monitor.has_actionable_alerts():
            alerts = self._drift_monitor.get_recent_alerts(severity="high")
            event = self._create_event(
                reason=RetrainReason.DRIFT_DETECTED,
                details={
                    "alert_count": len(alerts),
                    "features": [a.feature_name for a in alerts],
                },
            )
            logger.info(f"Drift-triggered retraining event: {event.event_id}")
            return event

        return None

    def check_performance_trigger(
        self,
        current_pr_auc: float,
        baseline_pr_auc: float,
    ) -> Optional[RetrainEvent]:
        """
        Check if performance degradation should trigger retraining.

        Args:
            current_pr_auc: Current model PR-AUC
            baseline_pr_auc: Baseline PR-AUC to compare against

        Returns:
            RetrainEvent if triggered, None otherwise
        """
        if not self._trigger_on_degradation:
            return None

        if self._is_in_cooldown():
            return None

        degradation = baseline_pr_auc - current_pr_auc
        if degradation > self._degradation_threshold:
            event = self._create_event(
                reason=RetrainReason.PERFORMANCE_DEGRADATION,
                details={
                    "current_pr_auc": current_pr_auc,
                    "baseline_pr_auc": baseline_pr_auc,
                    "degradation": degradation,
                    "threshold": self._degradation_threshold,
                },
            )
            logger.info(f"Performance-triggered retraining event: {event.event_id}")
            return event

        return None

    def create_manual_trigger(self, reason: str = "") -> RetrainEvent:
        """Create a manual retraining trigger."""
        event = self._create_event(
            reason=RetrainReason.MANUAL,
            details={"manual_reason": reason},
        )
        logger.info(f"Manual retraining event: {event.event_id}")
        return event

    def _create_event(
        self,
        reason: RetrainReason,
        details: dict,
    ) -> RetrainEvent:
        """Create a new retrain event."""
        cooldown_expires = datetime.utcnow() + timedelta(hours=self._cooldown_hours)

        event = RetrainEvent(
            event_id=str(uuid.uuid4()),
            reason=reason,
            triggered_at=datetime.utcnow(),
            details=details,
            cooldown_expires=cooldown_expires,
        )
        self._events.append(event)
        return event

    def _is_in_cooldown(self) -> bool:
        """Check if we're in cooldown period."""
        if self._last_retrain is None:
            return False

        cooldown_end = self._last_retrain + timedelta(hours=self._cooldown_hours)
        return datetime.utcnow() < cooldown_end

    def mark_retrain_complete(self) -> None:
        """Mark that retraining has been completed."""
        self._last_retrain = datetime.utcnow()
        for event in self._events:
            if not event.is_processed:
                event.is_processed = True
        logger.info("Retraining marked complete")

    def get_pending_events(self) -> List[RetrainEvent]:
        """Get unprocessed retrain events."""
        return [e for e in self._events if not e.is_processed]

    def get_recent_events(self, limit: int = 10) -> List[RetrainEvent]:
        """Get recent retrain events."""
        return self._events[-limit:]

    def clear_events(self) -> None:
        """Clear all events."""
        self._events = []


_retrain_trigger: Optional[RetrainTrigger] = None


def get_retrain_trigger() -> RetrainTrigger:
    """Get cached retrain trigger instance."""
    global _retrain_trigger
    if _retrain_trigger is None:
        _retrain_trigger = RetrainTrigger()
    return _retrain_trigger
