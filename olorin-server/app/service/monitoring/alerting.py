"""
Alerting System for Fraud Detection Monitoring.

Detects anomalies and sends alerts for system health issues.

Week 10 Phase 4 implementation.
"""

import logging
import os
from typing import Any, Callable, Dict, List, Optional

from app.service.monitoring.alert_models import Alert, AlertSeverity

logger = logging.getLogger(__name__)


class AlertingSystem:
    """
    Monitors metrics and generates alerts for anomalies.

    Supports configurable thresholds and custom alert handlers.
    """

    def __init__(self):
        """Initialize alerting system."""
        latency_threshold_env = os.getenv("ALERT_LATENCY_THRESHOLD_MS")
        if not latency_threshold_env:
            raise RuntimeError(
                "ALERT_LATENCY_THRESHOLD_MS environment variable is required"
            )
        self.latency_threshold_ms = float(latency_threshold_env)

        error_rate_threshold_env = os.getenv("ALERT_ERROR_RATE_THRESHOLD")
        if not error_rate_threshold_env:
            raise RuntimeError(
                "ALERT_ERROR_RATE_THRESHOLD environment variable is required"
            )
        self.error_rate_threshold = float(error_rate_threshold_env)

        score_drift_threshold_env = os.getenv("ALERT_SCORE_DRIFT_THRESHOLD")
        if not score_drift_threshold_env:
            raise RuntimeError(
                "ALERT_SCORE_DRIFT_THRESHOLD environment variable is required"
            )
        self.score_drift_threshold = float(score_drift_threshold_env)

        confidence_drop_threshold_env = os.getenv("ALERT_CONFIDENCE_DROP_THRESHOLD")
        if not confidence_drop_threshold_env:
            raise RuntimeError(
                "ALERT_CONFIDENCE_DROP_THRESHOLD environment variable is required"
            )
        self.confidence_drop_threshold = float(confidence_drop_threshold_env)

        self.active_alerts: List[Alert] = []
        self.alert_handlers: List[Callable[[Alert], None]] = []
        logger.info(
            f"🚨 AlertingSystem initialized (latency={self.latency_threshold_ms}ms, "
            f"error_rate={self.error_rate_threshold})"
        )

    def check_metrics(self, metrics: Dict[str, Any]) -> List[Alert]:
        """Check metrics and generate alerts if thresholds exceeded."""
        new_alerts: List[Alert] = []

        latency_alert = self._check_latency(metrics.get("latency_metrics", {}))
        if latency_alert:
            new_alerts.append(latency_alert)

        error_alert = self._check_error_rate(metrics.get("error_metrics", {}))
        if error_alert:
            new_alerts.append(error_alert)

        score_alert = self._check_score_drift(metrics.get("prediction_metrics", {}))
        if score_alert:
            new_alerts.append(score_alert)

        confidence_alert = self._check_confidence_drop(
            metrics.get("prediction_metrics", {})
        )
        if confidence_alert:
            new_alerts.append(confidence_alert)

        for alert in new_alerts:
            self._fire_alert(alert)

        return new_alerts

    def _check_latency(self, latency_metrics: Dict[str, float]) -> Optional[Alert]:
        """Check if latency exceeds threshold."""
        p95_latency = latency_metrics.get("p95_ms", 0.0)
        if p95_latency > self.latency_threshold_ms:
            severity = (
                AlertSeverity.CRITICAL
                if p95_latency > self.latency_threshold_ms * 2
                else AlertSeverity.HIGH
            )
            return Alert(
                alert_type="latency_threshold_exceeded",
                severity=severity,
                message=f"P95 latency ({p95_latency:.2f}ms) exceeds threshold ({self.latency_threshold_ms}ms)",
                metric_name="p95_latency_ms",
                metric_value=p95_latency,
                threshold=self.latency_threshold_ms,
            )
        return None

    def _check_error_rate(self, error_metrics: Dict[str, Any]) -> Optional[Alert]:
        """Check if error rate exceeds threshold."""
        error_rate = error_metrics.get("error_rate", 0.0)
        if error_rate > self.error_rate_threshold:
            severity = (
                AlertSeverity.CRITICAL
                if error_rate > self.error_rate_threshold * 2
                else AlertSeverity.HIGH
            )
            return Alert(
                alert_type="error_rate_threshold_exceeded",
                severity=severity,
                message=f"Error rate ({error_rate:.2%}) exceeds threshold ({self.error_rate_threshold:.2%})",
                metric_name="error_rate",
                metric_value=error_rate,
                threshold=self.error_rate_threshold,
                metadata=error_metrics.get("error_counts_by_type", {}),
            )
        return None

    def _check_score_drift(self, prediction_metrics: Dict[str, Any]) -> Optional[Alert]:
        """Check for significant score drift."""
        score_stats = prediction_metrics.get("score_stats", {})
        score_std = score_stats.get("std", 0.0)

        if score_std > self.score_drift_threshold:
            return Alert(
                alert_type="score_drift_detected",
                severity=AlertSeverity.MEDIUM,
                message=f"Score standard deviation ({score_std:.3f}) exceeds threshold ({self.score_drift_threshold})",
                metric_name="score_std",
                metric_value=score_std,
                threshold=self.score_drift_threshold,
            )
        return None

    def _check_confidence_drop(
        self, prediction_metrics: Dict[str, Any]
    ) -> Optional[Alert]:
        """Check for confidence drop."""
        confidence_stats = prediction_metrics.get("confidence_stats", {})
        mean_confidence = confidence_stats.get("mean", 1.0)

        if mean_confidence < self.confidence_drop_threshold:
            return Alert(
                alert_type="confidence_drop_detected",
                severity=AlertSeverity.MEDIUM,
                message=f"Mean confidence ({mean_confidence:.3f}) below threshold ({self.confidence_drop_threshold})",
                metric_name="mean_confidence",
                metric_value=mean_confidence,
                threshold=self.confidence_drop_threshold,
            )
        return None

    def register_handler(self, handler: Callable[[Alert], None]) -> None:
        """Register a custom alert handler."""
        self.alert_handlers.append(handler)
        logger.info(f"🚨 Alert handler registered: {handler.__name__}")

    def _fire_alert(self, alert: Alert) -> None:
        """Fire an alert to all registered handlers."""
        self.active_alerts.append(alert)
        logger.warning(f"🚨 ALERT: [{alert.severity.value.upper()}] {alert.message}")

        for handler in self.alert_handlers:
            try:
                handler(alert)
            except Exception as e:
                logger.error(f"Alert handler {handler.__name__} failed: {e}")

    def get_active_alerts(self) -> List[Dict[str, Any]]:
        """Get all active alerts."""
        return [alert.to_dict() for alert in self.active_alerts]

    def clear_alerts(self) -> None:
        """Clear all active alerts."""
        cleared_count = len(self.active_alerts)
        self.active_alerts.clear()
        logger.info(f"🚨 Cleared {cleared_count} alerts")
