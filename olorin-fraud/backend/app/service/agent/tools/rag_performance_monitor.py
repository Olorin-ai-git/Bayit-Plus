"""
RAG Tool Performance Monitor

Provides comprehensive performance monitoring for RAG-enhanced tool execution
with focus on meeting the <50ms overhead requirement.
"""

import asyncio
import statistics
import time
from collections import defaultdict, deque
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Any, Deque, Dict, List, Optional

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class PerformanceLevel(Enum):
    """Performance level classifications"""

    EXCELLENT = "excellent"  # <25ms
    GOOD = "good"  # 25-50ms
    ACCEPTABLE = "acceptable"  # 50-100ms
    POOR = "poor"  # >100ms


@dataclass
class PerformanceMetric:
    """Individual performance measurement"""

    timestamp: datetime
    tool_name: str
    execution_id: str

    # Timing metrics (all in milliseconds)
    rag_overhead_ms: float
    context_retrieval_ms: float
    parameter_enhancement_ms: float
    result_interpretation_ms: float
    total_enhancement_ms: float

    # Context metrics
    knowledge_chunks_used: int
    parameter_enhancements: int
    interpretation_applied: bool

    # Performance classification
    performance_level: PerformanceLevel
    meets_target: bool  # <50ms requirement

    @classmethod
    def from_execution_data(
        cls,
        tool_name: str,
        execution_id: str,
        timing_data: Dict[str, float],
        context_data: Dict[str, Any],
    ) -> "PerformanceMetric":
        """Create performance metric from execution data"""

        total_ms = timing_data.get("total_enhancement_ms", 0.0)

        # Classify performance level
        if total_ms < 25.0:
            perf_level = PerformanceLevel.EXCELLENT
        elif total_ms < 50.0:
            perf_level = PerformanceLevel.GOOD
        elif total_ms < 100.0:
            perf_level = PerformanceLevel.ACCEPTABLE
        else:
            perf_level = PerformanceLevel.POOR

        return cls(
            timestamp=datetime.now(),
            tool_name=tool_name,
            execution_id=execution_id,
            rag_overhead_ms=timing_data.get("rag_overhead_ms", 0.0),
            context_retrieval_ms=timing_data.get("context_retrieval_ms", 0.0),
            parameter_enhancement_ms=timing_data.get("parameter_enhancement_ms", 0.0),
            result_interpretation_ms=timing_data.get("result_interpretation_ms", 0.0),
            total_enhancement_ms=total_ms,
            knowledge_chunks_used=context_data.get("knowledge_chunks_used", 0),
            parameter_enhancements=context_data.get("parameter_enhancements", 0),
            interpretation_applied=context_data.get("interpretation_applied", False),
            performance_level=perf_level,
            meets_target=total_ms < 50.0,
        )


@dataclass
class PerformanceAlert:
    """Performance alert for degradation detection"""

    alert_id: str
    timestamp: datetime
    alert_type: str
    tool_name: str
    message: str
    metrics: Dict[str, float]
    severity: str  # "info", "warning", "error", "critical"


class RAGToolPerformanceMonitor:
    """
    Performance Monitor for RAG-Enhanced Tools

    Tracks and analyzes RAG tool execution performance with focus on:
    - <50ms overhead requirement compliance
    - Performance trend analysis
    - Degradation detection and alerting
    - Tool-specific performance optimization
    - System-wide performance health
    """

    def __init__(
        self,
        performance_target_ms: float = 50.0,
        history_retention_minutes: int = 60,
        alert_threshold_violations: int = 5,
        enable_alerts: bool = True,
    ):
        """Initialize RAG tool performance monitor"""

        self.performance_target_ms = performance_target_ms
        self.history_retention_minutes = history_retention_minutes
        self.alert_threshold_violations = alert_threshold_violations
        self.enable_alerts = enable_alerts

        # Performance data storage
        self.performance_history: Deque[PerformanceMetric] = deque(maxlen=10000)
        self.tool_metrics: Dict[str, Deque[PerformanceMetric]] = defaultdict(
            lambda: deque(maxlen=1000)
        )
        self.alerts_history: Deque[PerformanceAlert] = deque(maxlen=1000)

        # Real-time monitoring
        self.current_session_stats = {
            "session_start": datetime.now(),
            "total_executions": 0,
            "target_compliant_executions": 0,
            "target_violation_count": 0,
            "consecutive_violations": 0,
            "performance_levels": defaultdict(int),
        }

        # Tool-specific tracking
        self.tool_performance_summary: Dict[str, Dict[str, float]] = defaultdict(dict)

        logger.info(
            f"RAG Tool Performance Monitor initialized with {performance_target_ms}ms target"
        )

    def record_execution_performance(
        self,
        tool_name: str,
        execution_id: str,
        timing_data: Dict[str, float],
        context_data: Dict[str, Any],
    ) -> PerformanceMetric:
        """Record performance metrics for a tool execution"""

        # Create performance metric
        metric = PerformanceMetric.from_execution_data(
            tool_name, execution_id, timing_data, context_data
        )

        # Store in history
        self.performance_history.append(metric)
        self.tool_metrics[tool_name].append(metric)

        # Update session statistics
        self._update_session_stats(metric)

        # Update tool-specific summary
        self._update_tool_summary(tool_name, metric)

        # Check for performance issues and alerts
        if self.enable_alerts:
            self._check_performance_alerts(metric)

        # Clean old data
        self._cleanup_old_data()

        logger.debug(
            f"Performance recorded for {tool_name}: "
            f"{metric.total_enhancement_ms:.1f}ms "
            f"({'✓' if metric.meets_target else '✗'} target)"
        )

        return metric

    def _update_session_stats(self, metric: PerformanceMetric) -> None:
        """Update current session statistics"""

        stats = self.current_session_stats
        stats["total_executions"] += 1
        stats["performance_levels"][metric.performance_level.value] += 1

        if metric.meets_target:
            stats["target_compliant_executions"] += 1
            stats["consecutive_violations"] = 0
        else:
            stats["target_violation_count"] += 1
            stats["consecutive_violations"] += 1

    def _update_tool_summary(self, tool_name: str, metric: PerformanceMetric) -> None:
        """Update tool-specific performance summary"""

        tool_metrics = list(self.tool_metrics[tool_name])
        if not tool_metrics:
            return

        # Calculate summary statistics
        recent_metrics = tool_metrics[-50:]  # Last 50 executions

        overhead_times = [m.total_enhancement_ms for m in recent_metrics]
        target_compliance = [m.meets_target for m in recent_metrics]
        knowledge_chunks = [m.knowledge_chunks_used for m in recent_metrics]

        self.tool_performance_summary[tool_name] = {
            "avg_overhead_ms": (
                statistics.mean(overhead_times) if overhead_times else 0.0
            ),
            "median_overhead_ms": (
                statistics.median(overhead_times) if overhead_times else 0.0
            ),
            "p95_overhead_ms": (
                statistics.quantiles(overhead_times, n=20)[18]
                if len(overhead_times) >= 20
                else max(overhead_times, default=0.0)
            ),
            "target_compliance_rate": (
                sum(target_compliance) / len(target_compliance)
                if target_compliance
                else 0.0
            ),
            "avg_knowledge_chunks": (
                statistics.mean(knowledge_chunks) if knowledge_chunks else 0.0
            ),
            "total_executions": len(tool_metrics),
            "recent_executions": len(recent_metrics),
        }

    def _check_performance_alerts(self, metric: PerformanceMetric) -> None:
        """Check for performance issues and generate alerts"""

        # Critical: Single execution significantly over target
        if metric.total_enhancement_ms > self.performance_target_ms * 3:
            self._generate_alert(
                "critical_performance_violation",
                metric.tool_name,
                f"Tool execution took {metric.total_enhancement_ms:.1f}ms (3x over target)",
                {
                    "overhead_ms": metric.total_enhancement_ms,
                    "target_ms": self.performance_target_ms,
                },
                "critical",
            )

        # Warning: Consecutive violations of target
        if (
            self.current_session_stats["consecutive_violations"]
            >= self.alert_threshold_violations
        ):
            self._generate_alert(
                "consecutive_target_violations",
                metric.tool_name,
                f"{self.current_session_stats['consecutive_violations']} consecutive target violations",
                {
                    "consecutive_count": self.current_session_stats[
                        "consecutive_violations"
                    ]
                },
                "warning",
            )

        # Tool-specific degradation
        tool_summary = self.tool_performance_summary.get(metric.tool_name, {})
        if (
            tool_summary.get("target_compliance_rate", 1.0) < 0.7
        ):  # Less than 70% compliance
            self._generate_alert(
                "tool_performance_degradation",
                metric.tool_name,
                f"Tool compliance rate dropped to {tool_summary['target_compliance_rate']:.1%}",
                {"compliance_rate": tool_summary["target_compliance_rate"]},
                "warning",
            )

    def _generate_alert(
        self,
        alert_type: str,
        tool_name: str,
        message: str,
        metrics: Dict[str, float],
        severity: str,
    ) -> None:
        """Generate performance alert"""

        alert = PerformanceAlert(
            alert_id=f"{alert_type}_{tool_name}_{int(time.time())}",
            timestamp=datetime.now(),
            alert_type=alert_type,
            tool_name=tool_name,
            message=message,
            metrics=metrics,
            severity=severity,
        )

        self.alerts_history.append(alert)

        # Log alert based on severity
        if severity == "critical":
            logger.error(f"RAG Performance CRITICAL: {message}")
        elif severity == "error":
            logger.error(f"RAG Performance ERROR: {message}")
        elif severity == "warning":
            logger.warning(f"RAG Performance WARNING: {message}")
        else:
            logger.info(f"RAG Performance INFO: {message}")

    def _cleanup_old_data(self) -> None:
        """Clean up old performance data"""

        cutoff_time = datetime.now() - timedelta(minutes=self.history_retention_minutes)

        # Clean main history
        while (
            self.performance_history
            and self.performance_history[0].timestamp < cutoff_time
        ):
            self.performance_history.popleft()

        # Clean tool-specific metrics
        for tool_name in list(self.tool_metrics.keys()):
            tool_deque = self.tool_metrics[tool_name]
            while tool_deque and tool_deque[0].timestamp < cutoff_time:
                tool_deque.popleft()

            # Remove empty deques
            if not tool_deque:
                del self.tool_metrics[tool_name]

        # Clean alerts
        while self.alerts_history and self.alerts_history[0].timestamp < cutoff_time:
            self.alerts_history.popleft()

    def get_system_performance_summary(self) -> Dict[str, Any]:
        """Get system-wide performance summary"""

        session_stats = self.current_session_stats.copy()
        total_executions = session_stats["total_executions"]

        # Calculate rates
        target_compliance_rate = 0.0
        if total_executions > 0:
            target_compliance_rate = (
                session_stats["target_compliant_executions"] / total_executions
            )

        # Get recent performance metrics
        recent_metrics = list(self.performance_history)[-100:]  # Last 100 executions

        avg_overhead = 0.0
        p95_overhead = 0.0
        if recent_metrics:
            overhead_times = [m.total_enhancement_ms for m in recent_metrics]
            avg_overhead = statistics.mean(overhead_times)
            p95_overhead = (
                statistics.quantiles(overhead_times, n=20)[18]
                if len(overhead_times) >= 20
                else max(overhead_times)
            )

        return {
            "performance_summary": {
                "target_ms": self.performance_target_ms,
                "total_executions": total_executions,
                "target_compliance_rate": target_compliance_rate,
                "avg_overhead_ms": avg_overhead,
                "p95_overhead_ms": p95_overhead,
                "consecutive_violations": session_stats["consecutive_violations"],
            },
            "performance_distribution": dict(session_stats["performance_levels"]),
            "active_alerts": len(
                [
                    a
                    for a in self.alerts_history
                    if a.timestamp > datetime.now() - timedelta(minutes=5)
                ]
            ),
            "tools_monitored": len(self.tool_metrics),
            "session_duration_minutes": (
                datetime.now() - session_stats["session_start"]
            ).total_seconds()
            / 60,
            "system_health": self._calculate_system_health_score(),
        }

    def get_tool_performance_details(self, tool_name: str) -> Optional[Dict[str, Any]]:
        """Get detailed performance analysis for specific tool"""

        if tool_name not in self.tool_metrics:
            return None

        tool_metrics = list(self.tool_metrics[tool_name])
        if not tool_metrics:
            return None

        # Performance analysis
        overhead_times = [m.total_enhancement_ms for m in tool_metrics]
        compliance_rate = sum(1 for m in tool_metrics if m.meets_target) / len(
            tool_metrics
        )

        return {
            "tool_name": tool_name,
            "total_executions": len(tool_metrics),
            "performance_metrics": {
                "avg_overhead_ms": statistics.mean(overhead_times),
                "median_overhead_ms": statistics.median(overhead_times),
                "min_overhead_ms": min(overhead_times),
                "max_overhead_ms": max(overhead_times),
                "std_dev_ms": (
                    statistics.stdev(overhead_times) if len(overhead_times) > 1 else 0.0
                ),
            },
            "target_compliance": {
                "compliance_rate": compliance_rate,
                "target_ms": self.performance_target_ms,
                "violations": len(tool_metrics)
                - sum(1 for m in tool_metrics if m.meets_target),
            },
            "performance_distribution": {
                level.value: sum(
                    1 for m in tool_metrics if m.performance_level == level
                )
                for level in PerformanceLevel
            },
            "recent_trend": (
                self._calculate_performance_trend(tool_metrics[-20:])
                if len(tool_metrics) >= 10
                else "insufficient_data"
            ),
        }

    def _calculate_system_health_score(self) -> float:
        """Calculate overall system health score (0.0-1.0)"""

        total_executions = self.current_session_stats["total_executions"]
        if total_executions == 0:
            return 1.0

        # Base score from target compliance
        compliance_rate = (
            self.current_session_stats["target_compliant_executions"] / total_executions
        )
        health_score = compliance_rate

        # Penalty for consecutive violations
        consecutive_penalty = min(
            0.3, self.current_session_stats["consecutive_violations"] * 0.05
        )
        health_score -= consecutive_penalty

        # Penalty for critical alerts
        recent_critical_alerts = sum(
            1
            for alert in self.alerts_history
            if alert.severity == "critical"
            and alert.timestamp > datetime.now() - timedelta(minutes=10)
        )
        critical_penalty = min(0.2, recent_critical_alerts * 0.1)
        health_score -= critical_penalty

        return max(0.0, min(1.0, health_score))

    def _calculate_performance_trend(
        self, recent_metrics: List[PerformanceMetric]
    ) -> str:
        """Calculate performance trend for recent executions"""

        if len(recent_metrics) < 10:
            return "insufficient_data"

        # Simple trend analysis based on moving averages
        first_half = recent_metrics[: len(recent_metrics) // 2]
        second_half = recent_metrics[len(recent_metrics) // 2 :]

        first_avg = statistics.mean(m.total_enhancement_ms for m in first_half)
        second_avg = statistics.mean(m.total_enhancement_ms for m in second_half)

        change_percent = (second_avg - first_avg) / first_avg * 100

        if change_percent < -10:
            return "improving"
        elif change_percent > 10:
            return "degrading"
        else:
            return "stable"

    def get_recent_alerts(
        self, severity_filter: Optional[str] = None
    ) -> List[PerformanceAlert]:
        """Get recent performance alerts"""

        recent_alerts = [
            alert
            for alert in self.alerts_history
            if alert.timestamp > datetime.now() - timedelta(minutes=30)
        ]

        if severity_filter:
            recent_alerts = [
                alert for alert in recent_alerts if alert.severity == severity_filter
            ]

        return sorted(recent_alerts, key=lambda a: a.timestamp, reverse=True)

    def reset_session_stats(self) -> None:
        """Reset current session statistics"""

        self.current_session_stats = {
            "session_start": datetime.now(),
            "total_executions": 0,
            "target_compliant_executions": 0,
            "target_violation_count": 0,
            "consecutive_violations": 0,
            "performance_levels": defaultdict(int),
        }

        logger.info("RAG Tool Performance Monitor session statistics reset")


# Global monitor instance
_rag_performance_monitor: Optional[RAGToolPerformanceMonitor] = None


def get_rag_performance_monitor() -> RAGToolPerformanceMonitor:
    """Get global RAG performance monitor instance"""
    global _rag_performance_monitor

    if _rag_performance_monitor is None:
        _rag_performance_monitor = RAGToolPerformanceMonitor()

    return _rag_performance_monitor
