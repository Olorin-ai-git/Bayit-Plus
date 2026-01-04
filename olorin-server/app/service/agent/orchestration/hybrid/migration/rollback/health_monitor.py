"""
System Health Monitoring for Rollback Triggers

Monitors key system metrics to detect when rollback
to clean graph should be triggered.
"""

from datetime import datetime, timedelta
from typing import Any, Dict, Optional

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class HealthMonitor:
    """
    Monitors system health metrics for rollback decisions.

    Tracks performance, error rates, and system stability
    to determine when automatic rollback should be triggered.
    """

    def __init__(self):
        self.metrics_window = timedelta(minutes=10)  # 10-minute rolling window
        self.metrics_history = []
        self.thresholds = self._initialize_thresholds()

    def _initialize_thresholds(self) -> Dict[str, float]:
        """Initialize health monitoring thresholds"""

        return {
            "error_rate": 0.10,  # 10% error rate triggers rollback
            "performance_degradation": 0.20,  # 20% slower triggers rollback
            "safety_override_rate": 0.30,  # 30% safety overrides triggers rollback
            "investigation_failure_rate": 0.15,  # 15% failures triggers rollback
            "memory_usage": 0.85,  # 85% memory usage triggers rollback
            "cpu_usage": 0.90,  # 90% CPU usage triggers rollback
            "response_time_p95": 5.0,  # 5 second P95 response time triggers rollback
        }

    def record_metric(
        self, metric_name: str, value: float, timestamp: Optional[datetime] = None
    ):
        """
        Record a health metric.

        Args:
            metric_name: Name of the metric
            value: Metric value
            timestamp: When the metric was recorded (defaults to now)
        """

        if timestamp is None:
            timestamp = datetime.now()

        metric_record = {
            "metric_name": metric_name,
            "value": value,
            "timestamp": timestamp,
        }

        self.metrics_history.append(metric_record)

        # Clean old metrics outside the window
        self._clean_old_metrics()

        logger.debug(f"📊 Health metric recorded: {metric_name} = {value}")

    def check_error_rate(self) -> bool:
        """
        Check if error rate exceeds threshold.

        Returns:
            True if error rate is above threshold
        """

        error_rate = self._calculate_error_rate()
        threshold = self.thresholds["error_rate"]

        if error_rate > threshold:
            logger.warning(
                f"🚨 Error rate threshold exceeded: {error_rate:.2%} > {threshold:.2%}"
            )
            return True

        logger.debug(f"✅ Error rate within limits: {error_rate:.2%}")
        return False

    def check_performance_degradation(self) -> bool:
        """
        Check if performance has degraded significantly.

        Returns:
            True if performance degradation exceeds threshold
        """

        degradation = self._calculate_performance_degradation()
        threshold = self.thresholds["performance_degradation"]

        if degradation > threshold:
            logger.warning(
                f"🚨 Performance degradation threshold exceeded: {degradation:.2%} > {threshold:.2%}"
            )
            return True

        logger.debug(f"✅ Performance within limits: degradation {degradation:.2%}")
        return False

    def check_safety_override_rate(self) -> bool:
        """
        Check if safety override rate is too high.

        Returns:
            True if safety override rate exceeds threshold
        """

        override_rate = self._calculate_safety_override_rate()
        threshold = self.thresholds["safety_override_rate"]

        if override_rate > threshold:
            logger.warning(
                f"🚨 Safety override rate threshold exceeded: {override_rate:.2%} > {threshold:.2%}"
            )
            return True

        logger.debug(f"✅ Safety override rate within limits: {override_rate:.2%}")
        return False

    def check_resource_usage(self) -> bool:
        """
        Check if system resource usage is too high.

        Returns:
            True if resource usage exceeds thresholds
        """

        memory_usage = self._get_latest_metric("memory_usage")
        cpu_usage = self._get_latest_metric("cpu_usage")

        memory_threshold = self.thresholds["memory_usage"]
        cpu_threshold = self.thresholds["cpu_usage"]

        if memory_usage and memory_usage > memory_threshold:
            logger.warning(
                f"🚨 Memory usage threshold exceeded: {memory_usage:.2%} > {memory_threshold:.2%}"
            )
            return True

        if cpu_usage and cpu_usage > cpu_threshold:
            logger.warning(
                f"🚨 CPU usage threshold exceeded: {cpu_usage:.2%} > {cpu_threshold:.2%}"
            )
            return True

        return False

    def _calculate_error_rate(self) -> float:
        """Calculate current error rate from metrics"""

        error_metrics = self._get_metrics_in_window("error_count")
        success_metrics = self._get_metrics_in_window("success_count")

        if not error_metrics and not success_metrics:
            return 0.0

        total_errors = sum(m["value"] for m in error_metrics)
        total_successes = sum(m["value"] for m in success_metrics)
        total_requests = total_errors + total_successes

        if total_requests == 0:
            return 0.0

        return total_errors / total_requests

    def _calculate_performance_degradation(self) -> float:
        """Calculate performance degradation percentage"""

        response_time_metrics = self._get_metrics_in_window("response_time")

        if len(response_time_metrics) < 2:
            return 0.0

        # Compare recent vs baseline performance
        recent_metrics = response_time_metrics[-10:]  # Last 10 measurements
        baseline_metrics = response_time_metrics[:10]  # First 10 measurements

        if not recent_metrics or not baseline_metrics:
            return 0.0

        recent_avg = sum(m["value"] for m in recent_metrics) / len(recent_metrics)
        baseline_avg = sum(m["value"] for m in baseline_metrics) / len(baseline_metrics)

        if baseline_avg == 0:
            return 0.0

        degradation = (recent_avg - baseline_avg) / baseline_avg
        return max(0.0, degradation)  # Only report degradation, not improvements

    def _calculate_safety_override_rate(self) -> float:
        """Calculate safety override rate from metrics"""

        override_metrics = self._get_metrics_in_window("safety_override_count")
        total_metrics = self._get_metrics_in_window("investigation_count")

        if not override_metrics or not total_metrics:
            return 0.0

        total_overrides = sum(m["value"] for m in override_metrics)
        total_investigations = sum(m["value"] for m in total_metrics)

        if total_investigations == 0:
            return 0.0

        return total_overrides / total_investigations

    def _get_metrics_in_window(self, metric_name: str) -> list:
        """Get metrics within the monitoring window"""

        cutoff_time = datetime.now() - self.metrics_window

        return [
            m
            for m in self.metrics_history
            if m["metric_name"] == metric_name and m["timestamp"] >= cutoff_time
        ]

    def _get_latest_metric(self, metric_name: str) -> Optional[float]:
        """Get the latest value for a specific metric"""

        metrics = self._get_metrics_in_window(metric_name)

        if not metrics:
            return None

        latest_metric = max(metrics, key=lambda m: m["timestamp"])
        return latest_metric["value"]

    def _clean_old_metrics(self):
        """Remove metrics outside the monitoring window"""

        cutoff_time = datetime.now() - self.metrics_window

        self.metrics_history = [
            m for m in self.metrics_history if m["timestamp"] >= cutoff_time
        ]

    def get_health_status(self) -> Dict[str, Any]:
        """
        Get comprehensive health status.

        Returns:
            Dictionary with health metrics and status
        """

        return {
            "error_rate": self._calculate_error_rate(),
            "performance_degradation": self._calculate_performance_degradation(),
            "safety_override_rate": self._calculate_safety_override_rate(),
            "memory_usage": self._get_latest_metric("memory_usage"),
            "cpu_usage": self._get_latest_metric("cpu_usage"),
            "response_time_p95": self._get_latest_metric("response_time_p95"),
            "metrics_count": len(self.metrics_history),
            "monitoring_window_minutes": self.metrics_window.total_seconds() / 60,
        }
