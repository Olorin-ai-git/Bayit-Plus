"""
Usage Metrics and Performance Reporting for Hybrid Intelligence System

Collects, aggregates, and reports metrics on hybrid system usage,
performance, and health for monitoring and optimization.
"""

import json
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class MetricsReporter:
    """
    Collects and reports comprehensive metrics for the hybrid intelligence system.

    Tracks usage patterns, performance metrics, feature flag effectiveness,
    and system health indicators.
    """

    def __init__(self):
        self.metrics_cache = defaultdict(list)
        self.aggregated_metrics = {}
        self.reporting_interval = timedelta(minutes=5)
        self.last_report_time = datetime.now()

    def record_graph_selection(
        self,
        investigation_id: str,
        graph_type: str,
        selection_reason: str,
        feature_flags: Dict[str, Any],
        duration_ms: Optional[float] = None,
    ):
        """
        Record graph selection metrics.

        Args:
            investigation_id: Investigation identifier
            graph_type: Type of graph selected
            selection_reason: Reason for selection
            feature_flags: Feature flag states at time of selection
            duration_ms: Selection duration in milliseconds
        """

        metric = {
            "type": "graph_selection",
            "investigation_id": investigation_id,
            "graph_type": graph_type,
            "selection_reason": selection_reason,
            "feature_flags": feature_flags,
            "duration_ms": duration_ms,
            "timestamp": datetime.now().isoformat(),
        }

        self.metrics_cache["graph_selection"].append(metric)
        logger.debug(
            f"📊 Graph selection metric recorded: {graph_type} ({selection_reason})"
        )

    def record_feature_flag_usage(
        self,
        flag_name: str,
        enabled: bool,
        investigation_id: str,
        rollout_percentage: int,
        hash_value: Optional[int] = None,
    ):
        """
        Record feature flag usage metrics.

        Args:
            flag_name: Name of the feature flag
            enabled: Whether flag was enabled for this investigation
            investigation_id: Investigation identifier
            rollout_percentage: Rollout percentage at time of check
            hash_value: Hash value used for rollout calculation
        """

        metric = {
            "type": "feature_flag_usage",
            "flag_name": flag_name,
            "enabled": enabled,
            "investigation_id": investigation_id,
            "rollout_percentage": rollout_percentage,
            "hash_value": hash_value,
            "timestamp": datetime.now().isoformat(),
        }

        self.metrics_cache["feature_flag_usage"].append(metric)
        logger.debug(f"📊 Feature flag usage recorded: {flag_name} = {enabled}")

    def record_ab_test_assignment(
        self,
        test_name: str,
        investigation_id: str,
        assignment: str,
        test_split: int,
        hash_value: int,
    ):
        """
        Record A/B test assignment metrics.

        Args:
            test_name: Name of the A/B test
            investigation_id: Investigation identifier
            assignment: Graph type assigned
            test_split: Test split percentage
            hash_value: Hash value used for assignment
        """

        metric = {
            "type": "ab_test_assignment",
            "test_name": test_name,
            "investigation_id": investigation_id,
            "assignment": assignment,
            "test_split": test_split,
            "hash_value": hash_value,
            "timestamp": datetime.now().isoformat(),
        }

        self.metrics_cache["ab_test_assignment"].append(metric)
        logger.debug(f"📊 A/B test assignment recorded: {test_name} → {assignment}")

    def record_rollback_event(
        self,
        event_type: str,
        reason: str,
        investigation_id: Optional[str] = None,
        metrics_context: Optional[Dict[str, Any]] = None,
    ):
        """
        Record rollback system events.

        Args:
            event_type: Type of rollback event (triggered, cleared, threshold_exceeded)
            reason: Reason for the event
            investigation_id: Investigation identifier (if applicable)
            metrics_context: Additional context metrics
        """

        metric = {
            "type": "rollback_event",
            "event_type": event_type,
            "reason": reason,
            "investigation_id": investigation_id,
            "metrics_context": metrics_context or {},
            "timestamp": datetime.now().isoformat(),
        }

        self.metrics_cache["rollback_event"].append(metric)
        logger.debug(f"📊 Rollback event recorded: {event_type} - {reason}")

    def record_performance_metric(
        self,
        metric_name: str,
        value: float,
        unit: str,
        investigation_id: Optional[str] = None,
        graph_type: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
    ):
        """
        Record performance metrics.

        Args:
            metric_name: Name of the metric
            value: Metric value
            unit: Unit of measurement
            investigation_id: Investigation identifier (if applicable)
            graph_type: Graph type being measured
            context: Additional context information
        """

        metric = {
            "type": "performance_metric",
            "metric_name": metric_name,
            "value": value,
            "unit": unit,
            "investigation_id": investigation_id,
            "graph_type": graph_type,
            "context": context or {},
            "timestamp": datetime.now().isoformat(),
        }

        self.metrics_cache["performance_metric"].append(metric)
        logger.debug(f"📊 Performance metric recorded: {metric_name} = {value} {unit}")

    def generate_usage_report(
        self, time_window: timedelta = timedelta(hours=1)
    ) -> Dict[str, Any]:
        """
        Generate comprehensive usage report.

        Args:
            time_window: Time window for the report

        Returns:
            Dictionary with usage statistics and insights
        """

        logger.info(f"📊 Generating usage report for {time_window}")

        cutoff_time = datetime.now() - time_window

        report = {
            "report_timestamp": datetime.now().isoformat(),
            "time_window_hours": time_window.total_seconds() / 3600,
            "graph_selection_stats": self._analyze_graph_selections(cutoff_time),
            "feature_flag_stats": self._analyze_feature_flags(cutoff_time),
            "ab_test_stats": self._analyze_ab_tests(cutoff_time),
            "performance_stats": self._analyze_performance(cutoff_time),
            "rollback_stats": self._analyze_rollbacks(cutoff_time),
            "system_health": self._calculate_system_health(cutoff_time),
        }

        logger.info(
            f"✅ Usage report generated with {self._count_metrics_in_window(cutoff_time)} metrics"
        )
        return report

    def _analyze_graph_selections(self, cutoff_time: datetime) -> Dict[str, Any]:
        """Analyze graph selection patterns"""

        selections = [
            m
            for m in self.metrics_cache["graph_selection"]
            if datetime.fromisoformat(m["timestamp"]) >= cutoff_time
        ]

        if not selections:
            return {"total_selections": 0}

        # Count by graph type
        graph_type_counts = defaultdict(int)
        reason_counts = defaultdict(int)

        for selection in selections:
            graph_type_counts[selection["graph_type"]] += 1
            reason_counts[selection["selection_reason"]] += 1

        # Calculate selection durations
        durations = [s["duration_ms"] for s in selections if s.get("duration_ms")]
        avg_duration = sum(durations) / len(durations) if durations else 0

        return {
            "total_selections": len(selections),
            "graph_type_distribution": dict(graph_type_counts),
            "selection_reason_distribution": dict(reason_counts),
            "average_selection_duration_ms": avg_duration,
            "hybrid_usage_percentage": graph_type_counts.get("hybrid", 0)
            / len(selections)
            * 100,
        }

    def _analyze_feature_flags(self, cutoff_time: datetime) -> Dict[str, Any]:
        """Analyze feature flag usage patterns"""

        flag_usages = [
            m
            for m in self.metrics_cache["feature_flag_usage"]
            if datetime.fromisoformat(m["timestamp"]) >= cutoff_time
        ]

        if not flag_usages:
            return {"total_flag_checks": 0}

        # Analyze by flag
        flag_stats = defaultdict(lambda: {"enabled": 0, "disabled": 0, "total": 0})

        for usage in flag_usages:
            flag_name = usage["flag_name"]
            flag_stats[flag_name]["total"] += 1
            if usage["enabled"]:
                flag_stats[flag_name]["enabled"] += 1
            else:
                flag_stats[flag_name]["disabled"] += 1

        # Calculate enablement rates
        flag_enablement_rates = {}
        for flag_name, stats in flag_stats.items():
            enablement_rate = (
                stats["enabled"] / stats["total"] * 100 if stats["total"] > 0 else 0
            )
            flag_enablement_rates[flag_name] = enablement_rate

        return {
            "total_flag_checks": len(flag_usages),
            "unique_flags_checked": len(flag_stats),
            "flag_usage_counts": {k: v["total"] for k, v in flag_stats.items()},
            "flag_enablement_rates": flag_enablement_rates,
        }

    def _analyze_ab_tests(self, cutoff_time: datetime) -> Dict[str, Any]:
        """Analyze A/B test assignments and performance"""

        assignments = [
            m
            for m in self.metrics_cache["ab_test_assignment"]
            if datetime.fromisoformat(m["timestamp"]) >= cutoff_time
        ]

        if not assignments:
            return {"total_assignments": 0}

        # Analyze by test
        test_stats = defaultdict(lambda: defaultdict(int))

        for assignment in assignments:
            test_name = assignment["test_name"]
            assigned_type = assignment["assignment"]
            test_stats[test_name][assigned_type] += 1
            test_stats[test_name]["total"] += 1

        return {
            "total_assignments": len(assignments),
            "active_tests": len(test_stats),
            "test_assignment_distribution": dict(test_stats),
        }

    def _analyze_performance(self, cutoff_time: datetime) -> Dict[str, Any]:
        """Analyze performance metrics"""

        performance_metrics = [
            m
            for m in self.metrics_cache["performance_metric"]
            if datetime.fromisoformat(m["timestamp"]) >= cutoff_time
        ]

        if not performance_metrics:
            return {"total_metrics": 0}

        # Group by metric name
        metric_groups = defaultdict(list)
        for metric in performance_metrics:
            metric_groups[metric["metric_name"]].append(metric["value"])

        # Calculate statistics for each metric
        metric_stats = {}
        for metric_name, values in metric_groups.items():
            metric_stats[metric_name] = {
                "count": len(values),
                "average": sum(values) / len(values),
                "min": min(values),
                "max": max(values),
            }

        return {
            "total_metrics": len(performance_metrics),
            "unique_metric_types": len(metric_groups),
            "metric_statistics": metric_stats,
        }

    def _analyze_rollbacks(self, cutoff_time: datetime) -> Dict[str, Any]:
        """Analyze rollback events"""

        rollback_events = [
            m
            for m in self.metrics_cache["rollback_event"]
            if datetime.fromisoformat(m["timestamp"]) >= cutoff_time
        ]

        if not rollback_events:
            return {"total_events": 0}

        # Count by event type
        event_type_counts = defaultdict(int)
        reason_counts = defaultdict(int)

        for event in rollback_events:
            event_type_counts[event["event_type"]] += 1
            reason_counts[event["reason"]] += 1

        return {
            "total_events": len(rollback_events),
            "event_type_distribution": dict(event_type_counts),
            "reason_distribution": dict(reason_counts),
            "rollback_triggers": event_type_counts.get("triggered", 0),
        }

    def _calculate_system_health(self, cutoff_time: datetime) -> Dict[str, Any]:
        """Calculate overall system health score"""

        # Simple health calculation based on rollback events and error rates
        rollback_events = len(
            [
                m
                for m in self.metrics_cache["rollback_event"]
                if (
                    datetime.fromisoformat(m["timestamp"]) >= cutoff_time
                    and m["event_type"] == "triggered"
                )
            ]
        )

        total_selections = len(
            [
                m
                for m in self.metrics_cache["graph_selection"]
                if datetime.fromisoformat(m["timestamp"]) >= cutoff_time
            ]
        )

        # Health score (0-100)
        health_score = 100
        if rollback_events > 0:
            health_score -= rollback_events * 20  # Penalize rollbacks

        health_score = max(0, min(100, health_score))

        return {
            "health_score": health_score,
            "rollback_events": rollback_events,
            "total_investigations": total_selections,
            "status": (
                "healthy"
                if health_score >= 80
                else "degraded" if health_score >= 60 else "unhealthy"
            ),
        }

    def _count_metrics_in_window(self, cutoff_time: datetime) -> int:
        """Count total metrics in time window"""

        total = 0
        for metric_list in self.metrics_cache.values():
            total += len(
                [
                    m
                    for m in metric_list
                    if datetime.fromisoformat(m["timestamp"]) >= cutoff_time
                ]
            )
        return total

    def export_metrics(
        self, time_window: timedelta = timedelta(hours=1), format: str = "json"
    ) -> str:
        """
        Export metrics in specified format.

        Args:
            time_window: Time window to export
            format: Export format ("json", "csv")

        Returns:
            Formatted metrics data
        """

        report = self.generate_usage_report(time_window)

        if format.lower() == "json":
            return json.dumps(report, indent=2)
        else:
            logger.warning(f"⚠️ Unsupported export format: {format}, using JSON")
            return json.dumps(report, indent=2)

    def clear_old_metrics(self, retention_period: timedelta = timedelta(hours=24)):
        """
        Clear metrics older than retention period.

        Args:
            retention_period: How long to retain metrics
        """

        cutoff_time = datetime.now() - retention_period

        for metric_type, metric_list in self.metrics_cache.items():
            filtered_metrics = [
                m
                for m in metric_list
                if datetime.fromisoformat(m["timestamp"]) >= cutoff_time
            ]
            self.metrics_cache[metric_type] = filtered_metrics

        logger.debug(f"📊 Cleared old metrics (retention: {retention_period})")
