"""
Automatic Rollback Trigger System for Hybrid Intelligence

Monitors system health and triggers rollback to clean graph
when issues are detected.
"""

from datetime import datetime
from typing import Any, Dict, Optional

from app.service.logging import get_bridge_logger

from .health_monitor import HealthMonitor
from .metrics_collector import MetricsCollector

logger = get_bridge_logger(__name__)


class RollbackTriggers:
    """
    Automatic rollback trigger system.

    Monitors system health and triggers rollback to clean graph
    when issues are detected.
    """

    def __init__(self):
        self.rollback_active = False
        self.rollback_reason = None
        self.rollback_timestamp = None

        # Initialize monitoring components
        self.health_monitor = HealthMonitor()
        self.metrics_collector = MetricsCollector()

        # Rollback thresholds
        self.thresholds = {
            "error_rate": 0.1,  # 10% error rate triggers rollback
            "performance_degradation": 0.2,  # 20% slower triggers rollback
            "safety_override_rate": 0.3,  # 30% safety overrides triggers rollback
            "investigation_failure_rate": 0.15,  # 15% failures triggers rollback
            "consecutive_failures": 5,  # 5 consecutive failures triggers rollback
            "memory_threshold": 0.85,  # 85% memory usage triggers rollback
            "cpu_threshold": 0.90,  # 90% CPU usage triggers rollback
        }

        self.consecutive_failure_count = 0

    def should_rollback(self) -> bool:
        """
        Check if rollback should be triggered.

        Returns:
            True if rollback should be activated
        """

        # If rollback is already active, continue rollback
        if self.rollback_active:
            logger.debug(f"🔄 Rollback already active: {self.rollback_reason}")
            return True

        # Check all rollback conditions
        rollback_reasons = []

        if self._check_error_rate():
            rollback_reasons.append("high_error_rate")

        if self._check_performance_degradation():
            rollback_reasons.append("performance_degradation")

        if self._check_safety_override_rate():
            rollback_reasons.append("high_safety_override_rate")

        if self._check_consecutive_failures():
            rollback_reasons.append("consecutive_failures")

        if self._check_resource_usage():
            rollback_reasons.append("high_resource_usage")

        # Trigger rollback if any condition is met
        if rollback_reasons:
            reason = "; ".join(rollback_reasons)
            self.trigger_rollback(f"Automatic rollback: {reason}")
            return True

        return False

    def trigger_rollback(self, reason: str):
        """
        Manually trigger rollback.

        Args:
            reason: Reason for rollback
        """

        self.rollback_active = True
        self.rollback_reason = reason
        self.rollback_timestamp = datetime.now().isoformat()

        logger.error(f"🔄 ROLLBACK TRIGGERED: {reason}")
        logger.error(f"   All investigations will use clean graph")
        logger.error(f"   Timestamp: {self.rollback_timestamp}")

        # Record rollback event in metrics
        self.metrics_collector.record_performance_metric(
            metric_name="rollback_triggered", value=1.0, context={"reason": reason}
        )

    def clear_rollback(self):
        """Clear rollback state and resume normal operation."""

        previous_reason = self.rollback_reason

        self.rollback_active = False
        self.rollback_reason = None
        self.rollback_timestamp = None
        self.consecutive_failure_count = 0

        logger.info(f"✅ Rollback cleared - hybrid graph available")
        logger.info(f"   Previous reason: {previous_reason}")

        # Record rollback clearance in metrics
        self.metrics_collector.record_performance_metric(
            metric_name="rollback_cleared",
            value=1.0,
            context={"previous_reason": previous_reason},
        )

    def record_investigation_result(
        self,
        investigation_id: str,
        success: bool,
        duration_seconds: float = 0.0,
        error_message: Optional[str] = None,
    ):
        """
        Record an investigation result for monitoring.

        Args:
            investigation_id: Investigation identifier
            success: Whether investigation succeeded
            duration_seconds: Investigation duration
            error_message: Error message if failed
        """

        # Record in metrics collector
        self.metrics_collector.record_investigation_completion(
            investigation_id=investigation_id,
            success=success,
            duration_seconds=duration_seconds,
            error_message=error_message,
        )

        # Track consecutive failures
        if success:
            self.consecutive_failure_count = 0
        else:
            self.consecutive_failure_count += 1
            logger.warning(
                f"⚠️ Investigation failure #{self.consecutive_failure_count}: {investigation_id}"
            )

    def record_safety_override(
        self,
        investigation_id: str,
        override_reason: str,
        original_action: str,
        safe_action: str,
    ):
        """
        Record a safety override event.

        Args:
            investigation_id: Investigation identifier
            override_reason: Reason for override
            original_action: Original action that was overridden
            safe_action: Safe action taken instead
        """

        self.metrics_collector.record_safety_override(
            investigation_id=investigation_id,
            override_reason=override_reason,
            original_action=original_action,
            safe_action=safe_action,
        )

        logger.debug(f"🛡️ Safety override recorded: {investigation_id}")

    def _check_error_rate(self) -> bool:
        """Check if error rate exceeds threshold"""

        error_rate = self.metrics_collector.get_error_rate()
        threshold = self.thresholds["error_rate"]

        if error_rate > threshold:
            logger.warning(
                f"🚨 Error rate threshold exceeded: {error_rate:.2%} > {threshold:.2%}"
            )
            return True

        return False

    def _check_performance_degradation(self) -> bool:
        """Check if performance has degraded significantly"""

        return self.health_monitor.check_performance_degradation()

    def _check_safety_override_rate(self) -> bool:
        """Check if safety override rate is too high"""

        override_rate = self.metrics_collector.get_safety_override_rate()
        threshold = self.thresholds["safety_override_rate"]

        if override_rate > threshold:
            logger.warning(
                f"🚨 Safety override rate threshold exceeded: {override_rate:.2%} > {threshold:.2%}"
            )
            return True

        return False

    def _check_consecutive_failures(self) -> bool:
        """Check if too many consecutive failures occurred"""

        threshold = self.thresholds["consecutive_failures"]

        if self.consecutive_failure_count >= threshold:
            logger.warning(
                f"🚨 Consecutive failure threshold exceeded: {self.consecutive_failure_count} >= {threshold}"
            )
            return True

        return False

    def _check_resource_usage(self) -> bool:
        """Check if system resource usage is too high"""

        return self.health_monitor.check_resource_usage()

    def get_rollback_status(self) -> Dict[str, Any]:
        """
        Get current rollback status and health metrics.

        Returns:
            Dictionary with rollback status and health information
        """

        health_status = self.health_monitor.get_health_status()
        metrics_summary = self.metrics_collector.get_metrics_summary()

        return {
            "rollback_active": self.rollback_active,
            "rollback_reason": self.rollback_reason,
            "rollback_timestamp": self.rollback_timestamp,
            "consecutive_failure_count": self.consecutive_failure_count,
            "thresholds": self.thresholds,
            "health_status": health_status,
            "metrics_summary": metrics_summary,
        }

    def update_thresholds(self, new_thresholds: Dict[str, float]):
        """
        Update rollback thresholds.

        Args:
            new_thresholds: Dictionary of threshold updates
        """

        for key, value in new_thresholds.items():
            if key in self.thresholds:
                old_value = self.thresholds[key]
                self.thresholds[key] = value
                logger.info(f"🔧 Threshold updated: {key} {old_value} → {value}")
            else:
                logger.warning(f"⚠️ Unknown threshold: {key}")

        # Also update health monitor thresholds
        self.health_monitor.thresholds.update(new_thresholds)
