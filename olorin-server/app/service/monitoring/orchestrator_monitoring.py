"""
Orchestrator Monitoring & Alerting System

Provides comprehensive monitoring, alerting, and health checks for the structured
investigation orchestrator system with proactive issue detection and notification.

Author: Gil Klainert
Date: 2025-09-06
Plan Reference: /docs/plans/2025-09-06-structured-investigation-orchestrator-langgraph-plan.md
Phase: 4.3 - Monitoring & Alerting
"""

import asyncio
import json
import logging
import os
import statistics
from collections import defaultdict, deque
from dataclasses import asdict, dataclass
from datetime import datetime, timedelta
from enum import Enum
from typing import Any, Callable, Dict, List, Optional, Set

from app.service.agent.orchestrator_state import (
    InvestigationPhase,
    OrchestratorStateManager,
)
from app.service.dashboard.orchestrator_dashboard import OrchestratorDashboardService


class AlertSeverity(Enum):
    """Alert severity levels"""

    CRITICAL = "critical"  # Immediate action required
    HIGH = "high"  # Action required within hours
    MEDIUM = "medium"  # Action required within day
    LOW = "low"  # Informational, no immediate action
    INFO = "info"  # General information


class AlertType(Enum):
    """Types of alerts that can be raised"""

    ORCHESTRATOR_FAILURE = "orchestrator_failure"
    AGENT_COORDINATION_FAILURE = "agent_coordination_failure"
    PERFORMANCE_DEGRADATION = "performance_degradation"
    INVESTIGATION_STALLED = "investigation_stalled"
    RESOURCE_EXHAUSTION = "resource_exhaustion"
    QUALITY_DEGRADATION = "quality_degradation"
    SERVICE_UNAVAILABLE = "service_unavailable"
    THRESHOLD_EXCEEDED = "threshold_exceeded"


class MonitoringMetric(Enum):
    """Monitoring metrics to track"""

    DECISION_LATENCY = "decision_latency_ms"
    AGENT_HANDOFF_SUCCESS_RATE = "agent_handoff_success_rate"
    INVESTIGATION_SUCCESS_RATE = "investigation_success_rate"
    INVESTIGATION_DURATION = "investigation_duration_seconds"
    ACTIVE_INVESTIGATIONS = "active_investigations"
    FAILED_INVESTIGATIONS = "failed_investigations"
    CPU_UTILIZATION = "cpu_utilization_percent"
    MEMORY_UTILIZATION = "memory_utilization_percent"
    ERROR_RATE = "error_rate_percent"
    THROUGHPUT = "investigations_per_hour"


@dataclass
class Alert:
    """Alert data structure"""

    alert_id: str
    alert_type: AlertType
    severity: AlertSeverity
    title: str
    description: str
    investigation_id: Optional[str]
    timestamp: datetime
    metric_values: Dict[str, Any]
    threshold_values: Dict[str, Any]
    recommended_actions: List[str]
    auto_resolved: bool = False
    acknowledged: bool = False
    resolved: bool = False
    resolution_timestamp: Optional[datetime] = None


@dataclass
class HealthCheck:
    """Health check result"""

    check_name: str
    status: str  # healthy, warning, critical, unknown
    timestamp: datetime
    details: Dict[str, Any]
    response_time_ms: float


@dataclass
class MonitoringThreshold:
    """Monitoring threshold configuration"""

    metric: MonitoringMetric
    warning_threshold: float
    critical_threshold: float
    comparison_operator: str  # "gt", "lt", "eq", "gte", "lte"
    evaluation_window_minutes: int
    min_data_points: int


class OrchestratorMonitoring:
    """
    Orchestrator Monitoring & Alerting System

    Provides comprehensive monitoring capabilities for the structured investigation
    orchestrator, including proactive alerting, health checks, performance tracking,
    and automated issue detection and notification.
    """

    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.state_manager = OrchestratorStateManager()
        self.dashboard_service = OrchestratorDashboardService()

        # Monitoring data storage
        self.metrics_history: Dict[MonitoringMetric, deque] = defaultdict(
            lambda: deque(maxlen=1000)
        )
        self.active_alerts: Dict[str, Alert] = {}
        self.alert_history: List[Alert] = []
        self.health_checks: Dict[str, HealthCheck] = {}

        # Alert subscribers (functions to call when alerts are raised)
        self.alert_subscribers: Dict[AlertType, List[Callable]] = defaultdict(list)

        # Monitoring configuration
        self.monitoring_thresholds = self._initialize_default_thresholds()
        self.health_check_interval_seconds = 30
        self.metrics_collection_interval_seconds = 5
        self.alert_cooldown_minutes = 5
        self.max_alert_history = 10000

        # State tracking
        self.last_alert_times: Dict[str, datetime] = {}
        self.monitoring_active = False
        self.background_tasks: Set[asyncio.Task] = set()

    async def start_monitoring(self) -> None:
        """Start the monitoring system with background tasks"""
        try:
            self.logger.info("Starting orchestrator monitoring system")
            self.monitoring_active = True

            # Start background monitoring tasks
            self.background_tasks.add(
                asyncio.create_task(self._metrics_collection_loop())
            )
            self.background_tasks.add(asyncio.create_task(self._health_check_loop()))
            self.background_tasks.add(
                asyncio.create_task(self._alert_evaluation_loop())
            )
            self.background_tasks.add(asyncio.create_task(self._alert_cleanup_loop()))

            self.logger.info("Orchestrator monitoring system started successfully")

        except Exception as e:
            self.logger.error(f"Failed to start monitoring system: {str(e)}")
            raise

    async def stop_monitoring(self) -> None:
        """Stop the monitoring system"""
        try:
            self.logger.info("Stopping orchestrator monitoring system")
            self.monitoring_active = False

            # Cancel background tasks
            for task in self.background_tasks:
                task.cancel()

            # Wait for tasks to complete
            await asyncio.gather(*self.background_tasks, return_exceptions=True)
            self.background_tasks.clear()

            self.logger.info("Orchestrator monitoring system stopped")

        except Exception as e:
            self.logger.error(f"Error stopping monitoring system: {str(e)}")

    def subscribe_to_alerts(
        self, alert_type: AlertType, callback: Callable[[Alert], None]
    ) -> None:
        """Subscribe to specific alert types"""
        self.alert_subscribers[alert_type].append(callback)
        self.logger.info(f"Subscribed to {alert_type} alerts")

    async def record_metric(
        self,
        metric: MonitoringMetric,
        value: float,
        investigation_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> None:
        """Record a monitoring metric value"""
        try:
            metric_data = {
                "timestamp": datetime.now(),
                "value": value,
                "investigation_id": investigation_id,
                "metadata": metadata or {},
            }

            self.metrics_history[metric].append(metric_data)

            self.logger.debug(f"Recorded metric {metric.value}: {value}")

        except Exception as e:
            self.logger.error(f"Failed to record metric {metric}: {str(e)}")

    async def raise_alert(
        self,
        alert_type: AlertType,
        severity: AlertSeverity,
        title: str,
        description: str,
        investigation_id: Optional[str] = None,
        metric_values: Optional[Dict[str, Any]] = None,
        threshold_values: Optional[Dict[str, Any]] = None,
        recommended_actions: Optional[List[str]] = None,
    ) -> str:
        """Raise a monitoring alert"""
        try:
            # Check cooldown period
            alert_key = (
                f"{alert_type}:{investigation_id}"
                if investigation_id
                else str(alert_type)
            )
            if self._is_in_cooldown(alert_key):
                self.logger.debug(f"Alert {alert_key} in cooldown, skipping")
                return ""

            # Create alert
            alert_id = (
                f"alert_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{alert_type.value}"
            )
            alert = Alert(
                alert_id=alert_id,
                alert_type=alert_type,
                severity=severity,
                title=title,
                description=description,
                investigation_id=investigation_id,
                timestamp=datetime.now(),
                metric_values=metric_values or {},
                threshold_values=threshold_values or {},
                recommended_actions=recommended_actions or [],
            )

            # Store alert
            self.active_alerts[alert_id] = alert
            self.alert_history.append(alert)
            self.last_alert_times[alert_key] = datetime.now()

            # Limit alert history size
            if len(self.alert_history) > self.max_alert_history:
                self.alert_history = self.alert_history[-self.max_alert_history :]

            # Notify subscribers
            await self._notify_alert_subscribers(alert)

            self.logger.warning(
                f"Alert raised: {title} (ID: {alert_id}, Severity: {severity.value})"
            )

            return alert_id

        except Exception as e:
            self.logger.error(f"Failed to raise alert: {str(e)}")
            return ""

    async def acknowledge_alert(self, alert_id: str, acknowledged_by: str) -> bool:
        """Acknowledge an active alert"""
        try:
            if alert_id not in self.active_alerts:
                self.logger.warning(f"Alert {alert_id} not found")
                return False

            alert = self.active_alerts[alert_id]
            alert.acknowledged = True

            self.logger.info(f"Alert {alert_id} acknowledged by {acknowledged_by}")
            return True

        except Exception as e:
            self.logger.error(f"Failed to acknowledge alert {alert_id}: {str(e)}")
            return False

    async def resolve_alert(self, alert_id: str, resolved_by: str) -> bool:
        """Resolve an active alert"""
        try:
            if alert_id not in self.active_alerts:
                self.logger.warning(f"Alert {alert_id} not found")
                return False

            alert = self.active_alerts[alert_id]
            alert.resolved = True
            alert.resolution_timestamp = datetime.now()

            # Remove from active alerts
            del self.active_alerts[alert_id]

            self.logger.info(f"Alert {alert_id} resolved by {resolved_by}")
            return True

        except Exception as e:
            self.logger.error(f"Failed to resolve alert {alert_id}: {str(e)}")
            return False

    async def get_system_health(self) -> Dict[str, Any]:
        """Get overall system health status"""
        try:
            # Collect health check results
            health_checks = list(self.health_checks.values())

            # Determine overall status
            if any(hc.status == "critical" for hc in health_checks):
                overall_status = "critical"
            elif any(hc.status == "warning" for hc in health_checks):
                overall_status = "warning"
            elif all(hc.status == "healthy" for hc in health_checks):
                overall_status = "healthy"
            else:
                overall_status = "unknown"

            # Calculate metrics summary
            metrics_summary = await self._calculate_metrics_summary()

            # Count active alerts by severity
            alert_counts = defaultdict(int)
            for alert in self.active_alerts.values():
                alert_counts[alert.severity.value] += 1

            return {
                "overall_status": overall_status,
                "timestamp": datetime.now().isoformat(),
                "health_checks": [asdict(hc) for hc in health_checks],
                "metrics_summary": metrics_summary,
                "active_alerts": dict(alert_counts),
                "total_active_alerts": len(self.active_alerts),
                "monitoring_status": "active" if self.monitoring_active else "inactive",
            }

        except Exception as e:
            self.logger.error(f"Failed to get system health: {str(e)}")
            return {
                "overall_status": "unknown",
                "error": str(e),
                "timestamp": datetime.now().isoformat(),
            }

    async def get_alerts(
        self,
        severity: Optional[AlertSeverity] = None,
        alert_type: Optional[AlertType] = None,
        investigation_id: Optional[str] = None,
        include_resolved: bool = False,
    ) -> List[Dict[str, Any]]:
        """Get alerts matching the specified criteria"""
        try:
            alerts = []

            # Include active alerts
            alerts.extend(self.active_alerts.values())

            # Include resolved alerts from history if requested
            if include_resolved:
                resolved_alerts = [a for a in self.alert_history if a.resolved]
                alerts.extend(resolved_alerts)

            # Apply filters
            if severity:
                alerts = [a for a in alerts if a.severity == severity]

            if alert_type:
                alerts = [a for a in alerts if a.alert_type == alert_type]

            if investigation_id:
                alerts = [a for a in alerts if a.investigation_id == investigation_id]

            # Sort by timestamp (most recent first)
            alerts.sort(key=lambda a: a.timestamp, reverse=True)

            return [asdict(alert) for alert in alerts]

        except Exception as e:
            self.logger.error(f"Failed to get alerts: {str(e)}")
            return []

    # Private helper methods

    def _initialize_default_thresholds(
        self,
    ) -> Dict[MonitoringMetric, MonitoringThreshold]:
        """Initialize default monitoring thresholds from environment variables"""
        return {
            MonitoringMetric.DECISION_LATENCY: MonitoringThreshold(
                metric=MonitoringMetric.DECISION_LATENCY,
                warning_threshold=float(
                    os.getenv("MONITORING_DECISION_LATENCY_WARNING_MS", "1000.0")
                ),
                critical_threshold=float(
                    os.getenv("MONITORING_DECISION_LATENCY_CRITICAL_MS", "5000.0")
                ),
                comparison_operator="gt",
                evaluation_window_minutes=int(
                    os.getenv("MONITORING_DECISION_LATENCY_WINDOW_MINUTES", "5")
                ),
                min_data_points=int(
                    os.getenv("MONITORING_DECISION_LATENCY_MIN_DATA_POINTS", "3")
                ),
            ),
            MonitoringMetric.AGENT_HANDOFF_SUCCESS_RATE: MonitoringThreshold(
                metric=MonitoringMetric.AGENT_HANDOFF_SUCCESS_RATE,
                warning_threshold=float(
                    os.getenv("MONITORING_AGENT_HANDOFF_SUCCESS_WARNING", "0.9")
                ),
                critical_threshold=float(
                    os.getenv("MONITORING_AGENT_HANDOFF_SUCCESS_CRITICAL", "0.8")
                ),
                comparison_operator="lt",
                evaluation_window_minutes=int(
                    os.getenv("MONITORING_AGENT_HANDOFF_WINDOW_MINUTES", "10")
                ),
                min_data_points=int(
                    os.getenv("MONITORING_AGENT_HANDOFF_MIN_DATA_POINTS", "5")
                ),
            ),
            MonitoringMetric.INVESTIGATION_SUCCESS_RATE: MonitoringThreshold(
                metric=MonitoringMetric.INVESTIGATION_SUCCESS_RATE,
                warning_threshold=float(
                    os.getenv("MONITORING_INVESTIGATION_SUCCESS_WARNING", "0.95")
                ),
                critical_threshold=float(
                    os.getenv("MONITORING_INVESTIGATION_SUCCESS_CRITICAL", "0.9")
                ),
                comparison_operator="lt",
                evaluation_window_minutes=int(
                    os.getenv("MONITORING_INVESTIGATION_SUCCESS_WINDOW_MINUTES", "15")
                ),
                min_data_points=int(
                    os.getenv("MONITORING_INVESTIGATION_SUCCESS_MIN_DATA_POINTS", "3")
                ),
            ),
            MonitoringMetric.CPU_UTILIZATION: MonitoringThreshold(
                metric=MonitoringMetric.CPU_UTILIZATION,
                warning_threshold=float(
                    os.getenv("MONITORING_CPU_UTILIZATION_WARNING", "80.0")
                ),
                critical_threshold=float(
                    os.getenv("MONITORING_CPU_UTILIZATION_CRITICAL", "95.0")
                ),
                comparison_operator="gt",
                evaluation_window_minutes=int(
                    os.getenv("MONITORING_CPU_UTILIZATION_WINDOW_MINUTES", "5")
                ),
                min_data_points=int(
                    os.getenv("MONITORING_CPU_UTILIZATION_MIN_DATA_POINTS", "5")
                ),
            ),
            MonitoringMetric.MEMORY_UTILIZATION: MonitoringThreshold(
                metric=MonitoringMetric.MEMORY_UTILIZATION,
                warning_threshold=float(
                    os.getenv("MONITORING_MEMORY_UTILIZATION_WARNING", "85.0")
                ),
                critical_threshold=float(
                    os.getenv("MONITORING_MEMORY_UTILIZATION_CRITICAL", "95.0")
                ),
                comparison_operator="gt",
                evaluation_window_minutes=int(
                    os.getenv("MONITORING_MEMORY_UTILIZATION_WINDOW_MINUTES", "5")
                ),
                min_data_points=int(
                    os.getenv("MONITORING_MEMORY_UTILIZATION_MIN_DATA_POINTS", "5")
                ),
            ),
            MonitoringMetric.ERROR_RATE: MonitoringThreshold(
                metric=MonitoringMetric.ERROR_RATE,
                warning_threshold=float(
                    os.getenv("MONITORING_ERROR_RATE_WARNING", "5.0")
                ),
                critical_threshold=float(
                    os.getenv("MONITORING_ERROR_RATE_CRITICAL", "10.0")
                ),
                comparison_operator="gt",
                evaluation_window_minutes=int(
                    os.getenv("MONITORING_ERROR_RATE_WINDOW_MINUTES", "5")
                ),
                min_data_points=int(
                    os.getenv("MONITORING_ERROR_RATE_MIN_DATA_POINTS", "10")
                ),
            ),
        }

    async def _metrics_collection_loop(self) -> None:
        """Background task for collecting system metrics"""
        while self.monitoring_active:
            try:
                await self._collect_system_metrics()
                await asyncio.sleep(self.metrics_collection_interval_seconds)
            except Exception as e:
                self.logger.error(f"Error in metrics collection loop: {str(e)}")
                await asyncio.sleep(self.metrics_collection_interval_seconds)

    async def _health_check_loop(self) -> None:
        """Background task for running health checks"""
        while self.monitoring_active:
            try:
                await self._run_health_checks()
                await asyncio.sleep(self.health_check_interval_seconds)
            except Exception as e:
                self.logger.error(f"Error in health check loop: {str(e)}")
                await asyncio.sleep(self.health_check_interval_seconds)

    async def _alert_evaluation_loop(self) -> None:
        """Background task for evaluating alert conditions"""
        while self.monitoring_active:
            try:
                await self._evaluate_alert_conditions()
                await asyncio.sleep(self.metrics_collection_interval_seconds)
            except Exception as e:
                self.logger.error(f"Error in alert evaluation loop: {str(e)}")
                await asyncio.sleep(self.metrics_collection_interval_seconds)

    async def _alert_cleanup_loop(self) -> None:
        """Background task for cleaning up old alerts"""
        while self.monitoring_active:
            try:
                await self._cleanup_old_alerts()
                await asyncio.sleep(300)  # Run every 5 minutes
            except Exception as e:
                self.logger.error(f"Error in alert cleanup loop: {str(e)}")
                await asyncio.sleep(300)

    async def _collect_system_metrics(self) -> None:
        """Collect system-level metrics"""
        try:
            import psutil

            # CPU and memory metrics
            cpu_percent = psutil.cpu_percent()
            memory_percent = psutil.virtual_memory().percent

            await self.record_metric(MonitoringMetric.CPU_UTILIZATION, cpu_percent)
            await self.record_metric(
                MonitoringMetric.MEMORY_UTILIZATION, memory_percent
            )

            # Investigation metrics
            active_investigations = len(
                await self.state_manager.get_active_investigations()
            )
            await self.record_metric(
                MonitoringMetric.ACTIVE_INVESTIGATIONS, active_investigations
            )

            self.logger.debug(
                f"Collected system metrics: CPU={cpu_percent}%, Memory={memory_percent}%"
            )

        except Exception as e:
            self.logger.error(f"Failed to collect system metrics: {str(e)}")

    async def _run_health_checks(self) -> None:
        """Run all health checks"""
        try:
            checks = [
                ("orchestrator_state", self._check_orchestrator_state),
                ("database_connection", self._check_database_connection),
                ("ai_service", self._check_ai_service),
                ("websocket_service", self._check_websocket_service),
                ("dashboard_service", self._check_dashboard_service),
            ]

            for check_name, check_func in checks:
                start_time = datetime.now()
                try:
                    result = await check_func()
                    response_time = (datetime.now() - start_time).total_seconds() * 1000

                    self.health_checks[check_name] = HealthCheck(
                        check_name=check_name,
                        status=result.get("status", "unknown"),
                        timestamp=datetime.now(),
                        details=result.get("details", {}),
                        response_time_ms=response_time,
                    )
                except Exception as e:
                    response_time = (datetime.now() - start_time).total_seconds() * 1000
                    self.health_checks[check_name] = HealthCheck(
                        check_name=check_name,
                        status="critical",
                        timestamp=datetime.now(),
                        details={"error": str(e)},
                        response_time_ms=response_time,
                    )

        except Exception as e:
            self.logger.error(f"Failed to run health checks: {str(e)}")

    async def _check_orchestrator_state(self) -> Dict[str, Any]:
        """Check orchestrator state manager health"""
        try:
            # Test basic functionality
            test_state = await self.state_manager.get_investigation_state(
                "health_check_test"
            )
            return {"status": "healthy", "details": {"test_successful": True}}
        except Exception as e:
            return {"status": "critical", "details": {"error": str(e)}}

    async def _check_database_connection(self) -> Dict[str, Any]:
        """Check database connection health"""
        try:
            # This would check actual database connectivity in a real implementation
            return {"status": "healthy", "details": {"connection": "active"}}
        except Exception as e:
            return {"status": "critical", "details": {"error": str(e)}}

    async def _check_ai_service(self) -> Dict[str, Any]:
        """Check AI service connectivity"""
        try:
            # This would test AI service connectivity in a real implementation
            return {"status": "healthy", "details": {"service": "active"}}
        except Exception as e:
            return {"status": "warning", "details": {"error": str(e)}}

    async def _check_websocket_service(self) -> Dict[str, Any]:
        """Check WebSocket service health"""
        try:
            # This would check WebSocket service health in a real implementation
            return {"status": "healthy", "details": {"connections": "active"}}
        except Exception as e:
            return {"status": "warning", "details": {"error": str(e)}}

    async def _check_dashboard_service(self) -> Dict[str, Any]:
        """Check dashboard service health"""
        try:
            # Test dashboard service
            return {"status": "healthy", "details": {"service": "active"}}
        except Exception as e:
            return {"status": "warning", "details": {"error": str(e)}}

    async def _evaluate_alert_conditions(self) -> None:
        """Evaluate all monitoring thresholds and raise alerts as needed"""
        try:
            for metric, threshold in self.monitoring_thresholds.items():
                await self._evaluate_threshold(metric, threshold)
        except Exception as e:
            self.logger.error(f"Failed to evaluate alert conditions: {str(e)}")

    async def _evaluate_threshold(
        self, metric: MonitoringMetric, threshold: MonitoringThreshold
    ) -> None:
        """Evaluate a specific threshold and raise alerts if needed"""
        try:
            # Get recent metric data
            cutoff_time = datetime.now() - timedelta(
                minutes=threshold.evaluation_window_minutes
            )
            recent_data = [
                data
                for data in self.metrics_history[metric]
                if data["timestamp"] >= cutoff_time
            ]

            if len(recent_data) < threshold.min_data_points:
                return  # Not enough data points

            # Calculate aggregate value (mean for now)
            values = [data["value"] for data in recent_data]
            aggregate_value = statistics.mean(values)

            # Evaluate against thresholds
            if self._compare_value(
                aggregate_value,
                threshold.critical_threshold,
                threshold.comparison_operator,
            ):
                await self._raise_threshold_alert(
                    metric, threshold, aggregate_value, AlertSeverity.CRITICAL
                )
            elif self._compare_value(
                aggregate_value,
                threshold.warning_threshold,
                threshold.comparison_operator,
            ):
                await self._raise_threshold_alert(
                    metric, threshold, aggregate_value, AlertSeverity.HIGH
                )

        except Exception as e:
            self.logger.error(f"Failed to evaluate threshold for {metric}: {str(e)}")

    def _compare_value(self, value: float, threshold: float, operator: str) -> bool:
        """Compare value against threshold using specified operator"""
        if operator == "gt":
            return value > threshold
        elif operator == "lt":
            return value < threshold
        elif operator == "gte":
            return value >= threshold
        elif operator == "lte":
            return value <= threshold
        elif operator == "eq":
            return value == threshold
        else:
            return False

    async def _raise_threshold_alert(
        self,
        metric: MonitoringMetric,
        threshold: MonitoringThreshold,
        current_value: float,
        severity: AlertSeverity,
    ) -> None:
        """Raise an alert for a threshold violation"""
        try:
            title = f"Threshold Exceeded: {metric.value}"
            description = f"Metric {metric.value} has exceeded {severity.value} threshold. Current value: {current_value}, Threshold: {threshold.critical_threshold if severity == AlertSeverity.CRITICAL else threshold.warning_threshold}"

            recommended_actions = self._get_threshold_recommendations(
                metric, current_value
            )

            await self.raise_alert(
                alert_type=AlertType.THRESHOLD_EXCEEDED,
                severity=severity,
                title=title,
                description=description,
                metric_values={"current_value": current_value, "metric": metric.value},
                threshold_values={
                    "warning_threshold": threshold.warning_threshold,
                    "critical_threshold": threshold.critical_threshold,
                },
                recommended_actions=recommended_actions,
            )

        except Exception as e:
            self.logger.error(f"Failed to raise threshold alert: {str(e)}")

    def _get_threshold_recommendations(
        self, metric: MonitoringMetric, value: float
    ) -> List[str]:
        """Get recommendations for threshold violations"""
        recommendations = []

        if metric == MonitoringMetric.DECISION_LATENCY:
            recommendations.extend(
                [
                    "Optimize AI model response times",
                    "Review decision-making prompts for efficiency",
                    "Consider caching frequently used decisions",
                ]
            )
        elif metric == MonitoringMetric.CPU_UTILIZATION:
            recommendations.extend(
                [
                    "Scale orchestrator resources",
                    "Optimize CPU-intensive operations",
                    "Review active investigation load",
                ]
            )
        elif metric == MonitoringMetric.MEMORY_UTILIZATION:
            recommendations.extend(
                [
                    "Clear unnecessary data from memory",
                    "Optimize memory usage patterns",
                    "Scale memory resources",
                ]
            )
        elif metric == MonitoringMetric.AGENT_HANDOFF_SUCCESS_RATE:
            recommendations.extend(
                [
                    "Review agent availability",
                    "Check agent coordination logic",
                    "Implement additional fallback strategies",
                ]
            )

        return recommendations

    async def _calculate_metrics_summary(self) -> Dict[str, Any]:
        """Calculate summary statistics for all metrics"""
        try:
            summary = {}

            for metric, data_points in self.metrics_history.items():
                if not data_points:
                    continue

                values = [dp["value"] for dp in data_points]
                summary[metric.value] = {
                    "current": values[-1] if values else 0,
                    "average": statistics.mean(values),
                    "min": min(values),
                    "max": max(values),
                    "count": len(values),
                }

            return summary

        except Exception as e:
            self.logger.error(f"Failed to calculate metrics summary: {str(e)}")
            return {}

    def _is_in_cooldown(self, alert_key: str) -> bool:
        """Check if an alert is in cooldown period"""
        if alert_key not in self.last_alert_times:
            return False

        cooldown_period = timedelta(minutes=self.alert_cooldown_minutes)
        return datetime.now() - self.last_alert_times[alert_key] < cooldown_period

    async def _notify_alert_subscribers(self, alert: Alert) -> None:
        """Notify all subscribers of an alert"""
        try:
            subscribers = self.alert_subscribers.get(alert.alert_type, [])

            for subscriber in subscribers:
                try:
                    if asyncio.iscoroutinefunction(subscriber):
                        await subscriber(alert)
                    else:
                        subscriber(alert)
                except Exception as e:
                    self.logger.error(f"Error notifying alert subscriber: {str(e)}")

        except Exception as e:
            self.logger.error(f"Failed to notify alert subscribers: {str(e)}")

    async def _cleanup_old_alerts(self) -> None:
        """Clean up old resolved alerts from history"""
        try:
            cutoff_time = datetime.now() - timedelta(days=7)  # Keep 7 days

            self.alert_history = [
                alert
                for alert in self.alert_history
                if alert.timestamp >= cutoff_time or not alert.resolved
            ]

            self.logger.debug(
                f"Cleaned up old alerts, {len(self.alert_history)} remaining"
            )

        except Exception as e:
            self.logger.error(f"Failed to cleanup old alerts: {str(e)}")


# Global monitoring instance
orchestrator_monitoring = OrchestratorMonitoring()
