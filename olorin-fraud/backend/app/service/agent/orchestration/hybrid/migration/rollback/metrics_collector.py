"""
Performance Metrics Collection for Rollback Monitoring

Collects and aggregates performance metrics to support
rollback decision making and system health monitoring.
"""

from collections import defaultdict, deque
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class MetricsCollector:
    """
    Collects and aggregates performance metrics for rollback monitoring.

    Tracks investigation performance, error rates, and system health
    metrics to support automated rollback decisions.
    """

    def __init__(self, max_history_size: int = 1000):
        self.max_history_size = max_history_size
        self.metrics_buffer = deque(maxlen=max_history_size)
        self.aggregated_metrics = defaultdict(list)
        self.collection_start_time = datetime.now()

    def record_investigation_start(self, investigation_id: str, graph_type: str):
        """
        Record the start of an investigation.

        Args:
            investigation_id: Investigation identifier
            graph_type: Type of graph being used
        """

        metric = {
            "type": "investigation_start",
            "investigation_id": investigation_id,
            "graph_type": graph_type,
            "timestamp": datetime.now(),
        }

        self.metrics_buffer.append(metric)
        logger.debug(
            f"📊 Investigation start recorded: {investigation_id} ({graph_type})"
        )

    def record_investigation_completion(
        self,
        investigation_id: str,
        success: bool,
        duration_seconds: float,
        error_message: Optional[str] = None,
    ):
        """
        Record the completion of an investigation.

        Args:
            investigation_id: Investigation identifier
            success: Whether investigation completed successfully
            duration_seconds: Investigation duration in seconds
            error_message: Error message if investigation failed
        """

        metric = {
            "type": "investigation_completion",
            "investigation_id": investigation_id,
            "success": success,
            "duration_seconds": duration_seconds,
            "error_message": error_message,
            "timestamp": datetime.now(),
        }

        self.metrics_buffer.append(metric)
        logger.debug(
            f"📊 Investigation completion recorded: {investigation_id} (success={success})"
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
            override_reason: Reason for the override
            original_action: Action that was overridden
            safe_action: Safe action that was taken instead
        """

        metric = {
            "type": "safety_override",
            "investigation_id": investigation_id,
            "override_reason": override_reason,
            "original_action": original_action,
            "safe_action": safe_action,
            "timestamp": datetime.now(),
        }

        self.metrics_buffer.append(metric)
        logger.debug(
            f"📊 Safety override recorded: {investigation_id} - {override_reason}"
        )

    def record_performance_metric(
        self,
        metric_name: str,
        value: float,
        investigation_id: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
    ):
        """
        Record a performance metric.

        Args:
            metric_name: Name of the metric (e.g., 'response_time', 'memory_usage')
            value: Metric value
            investigation_id: Associated investigation (optional)
            context: Additional context information
        """

        metric = {
            "type": "performance_metric",
            "metric_name": metric_name,
            "value": value,
            "investigation_id": investigation_id,
            "context": context or {},
            "timestamp": datetime.now(),
        }

        self.metrics_buffer.append(metric)
        logger.debug(f"📊 Performance metric recorded: {metric_name} = {value}")

    def get_error_rate(self, time_window: timedelta = timedelta(minutes=10)) -> float:
        """
        Calculate error rate over a time window.

        Args:
            time_window: Time window to calculate over

        Returns:
            Error rate (0.0 to 1.0)
        """

        cutoff_time = datetime.now() - time_window

        completions = [
            m
            for m in self.metrics_buffer
            if m["type"] == "investigation_completion" and m["timestamp"] >= cutoff_time
        ]

        if not completions:
            return 0.0

        failed_count = sum(1 for m in completions if not m["success"])
        return failed_count / len(completions)

    def get_average_duration(
        self, time_window: timedelta = timedelta(minutes=10)
    ) -> float:
        """
        Calculate average investigation duration over a time window.

        Args:
            time_window: Time window to calculate over

        Returns:
            Average duration in seconds
        """

        cutoff_time = datetime.now() - time_window

        completions = [
            m
            for m in self.metrics_buffer
            if (
                m["type"] == "investigation_completion"
                and m["timestamp"] >= cutoff_time
                and m["success"]
            )
        ]

        if not completions:
            return 0.0

        total_duration = sum(m["duration_seconds"] for m in completions)
        return total_duration / len(completions)

    def get_safety_override_rate(
        self, time_window: timedelta = timedelta(minutes=10)
    ) -> float:
        """
        Calculate safety override rate over a time window.

        Args:
            time_window: Time window to calculate over

        Returns:
            Safety override rate (0.0 to 1.0)
        """

        cutoff_time = datetime.now() - time_window

        starts = [
            m
            for m in self.metrics_buffer
            if m["type"] == "investigation_start" and m["timestamp"] >= cutoff_time
        ]

        overrides = [
            m
            for m in self.metrics_buffer
            if m["type"] == "safety_override" and m["timestamp"] >= cutoff_time
        ]

        if not starts:
            return 0.0

        return len(overrides) / len(starts)

    def get_performance_metrics(
        self, metric_name: str, time_window: timedelta = timedelta(minutes=10)
    ) -> List[float]:
        """
        Get performance metric values over a time window.

        Args:
            metric_name: Name of the metric to retrieve
            time_window: Time window to retrieve over

        Returns:
            List of metric values
        """

        cutoff_time = datetime.now() - time_window

        metrics = [
            m["value"]
            for m in self.metrics_buffer
            if (
                m["type"] == "performance_metric"
                and m["metric_name"] == metric_name
                and m["timestamp"] >= cutoff_time
            )
        ]

        return metrics

    def get_metrics_summary(
        self, time_window: timedelta = timedelta(minutes=10)
    ) -> Dict[str, Any]:
        """
        Get comprehensive metrics summary.

        Args:
            time_window: Time window to summarize over

        Returns:
            Dictionary with metrics summary
        """

        cutoff_time = datetime.now() - time_window

        # Filter metrics to time window
        window_metrics = [
            m for m in self.metrics_buffer if m["timestamp"] >= cutoff_time
        ]

        # Count metrics by type
        type_counts = defaultdict(int)
        for metric in window_metrics:
            type_counts[metric["type"]] += 1

        # Calculate rates
        error_rate = self.get_error_rate(time_window)
        override_rate = self.get_safety_override_rate(time_window)
        avg_duration = self.get_average_duration(time_window)

        # Get graph type distribution
        graph_types = defaultdict(int)
        for metric in window_metrics:
            if metric["type"] == "investigation_start":
                graph_types[metric["graph_type"]] += 1

        return {
            "time_window_minutes": time_window.total_seconds() / 60,
            "total_metrics": len(window_metrics),
            "metrics_by_type": dict(type_counts),
            "error_rate": error_rate,
            "safety_override_rate": override_rate,
            "average_duration_seconds": avg_duration,
            "graph_type_distribution": dict(graph_types),
            "collection_start_time": self.collection_start_time.isoformat(),
            "current_time": datetime.now().isoformat(),
        }

    def clear_old_metrics(self, retention_period: timedelta = timedelta(hours=1)):
        """
        Clear metrics older than retention period.

        Args:
            retention_period: How long to retain metrics
        """

        cutoff_time = datetime.now() - retention_period

        # Convert deque to list, filter, and create new deque
        filtered_metrics = [
            m for m in self.metrics_buffer if m["timestamp"] >= cutoff_time
        ]

        self.metrics_buffer.clear()
        self.metrics_buffer.extend(filtered_metrics)

        logger.debug(f"📊 Cleared old metrics: {len(filtered_metrics)} retained")

    def export_metrics(
        self, time_window: timedelta = timedelta(hours=1)
    ) -> List[Dict[str, Any]]:
        """
        Export metrics for external analysis.

        Args:
            time_window: Time window to export

        Returns:
            List of metric records
        """

        cutoff_time = datetime.now() - time_window

        exported_metrics = []
        for metric in self.metrics_buffer:
            if metric["timestamp"] >= cutoff_time:
                # Convert datetime to ISO string for serialization
                exported_metric = metric.copy()
                exported_metric["timestamp"] = metric["timestamp"].isoformat()
                exported_metrics.append(exported_metric)

        logger.info(f"📊 Exported {len(exported_metrics)} metrics")
        return exported_metrics
