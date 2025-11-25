"""
Real-Time Cost Tracker

Provides real-time monitoring, alerting, and WebSocket broadcasting of
API costs and budget status for the Olorin investigation system.

Author: Gil Klainert
Date: 2025-09-07
Plan: /docs/plans/2025-09-07-api-cost-management-system-plan.md
"""

import asyncio
import json
import logging
import time
from dataclasses import asdict, dataclass
from datetime import datetime, timedelta
from enum import Enum
from typing import Any, Callable, Dict, List, Optional, Set

from ..logging.integration_bridge import get_bridge_logger
from .anthropic_credit_monitor import CreditStatus, get_credit_monitor
from .api_circuit_breaker import get_circuit_breaker_registry
from .cost_optimization_framework import (
    BudgetAlert,
    BudgetPeriod,
    get_cost_optimization,
)
from .model_tier_fallback import get_model_fallback


class AlertSeverity(Enum):
    """Alert severity levels"""

    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"
    EMERGENCY = "emergency"


class MetricType(Enum):
    """Types of metrics tracked"""

    COST = "cost"
    USAGE = "usage"
    PERFORMANCE = "performance"
    BUDGET = "budget"
    OPTIMIZATION = "optimization"


@dataclass
class CostAlert:
    """Real-time cost alert"""

    id: str
    severity: AlertSeverity
    metric_type: MetricType
    title: str
    message: str
    timestamp: datetime
    data: Dict[str, Any]
    resolved: bool = False
    resolution_time: Optional[datetime] = None


@dataclass
class CostMetric:
    """Real-time cost metric"""

    name: str
    type: MetricType
    value: float
    unit: str
    timestamp: datetime
    metadata: Dict[str, Any] = None


@dataclass
class PerformanceSummary:
    """Performance summary for cost tracking"""

    total_requests: int
    successful_requests: int
    failed_requests: int
    average_cost: float
    total_cost: float
    cost_savings: float
    optimization_rate: float
    cache_hit_rate: float
    fallback_rate: float


class RealTimeCostTracker:
    """
    Real-time cost tracking system with WebSocket broadcasting,
    alerting, and performance monitoring.
    """

    def __init__(self):
        self.logger = get_bridge_logger("real_time_cost_tracker", structured=True)

        # Component integrations
        self.credit_monitor = get_credit_monitor()
        self.model_fallback = get_model_fallback()
        self.cost_optimization = get_cost_optimization()
        self.circuit_registry = get_circuit_breaker_registry()

        # Configuration
        self.tracking_enabled = True
        self.websocket_enabled = True
        self.alert_enabled = True

        # Update intervals (seconds)
        self.update_intervals = {
            "credit_balance": 300,  # 5 minutes
            "usage_summary": 60,  # 1 minute
            "budget_alerts": 30,  # 30 seconds
            "performance": 120,  # 2 minutes
            "optimization_stats": 180,  # 3 minutes
        }

        # Real-time data
        self.current_metrics: Dict[str, CostMetric] = {}
        self.active_alerts: Dict[str, CostAlert] = {}
        self.performance_history: List[PerformanceSummary] = []
        self.max_history_size = 100

        # WebSocket connections
        self.websocket_connections: Set[Any] = set()  # WebSocket connections
        self.broadcast_channels = {
            "cost_alerts",
            "budget_status",
            "optimization_stats",
            "performance_metrics",
        }

        # Monitoring tasks
        self._monitoring_tasks: List[asyncio.Task] = []
        self._shutdown_event = asyncio.Event()

        # Statistics
        self.stats = {
            "alerts_sent": 0,
            "metrics_updated": 0,
            "websocket_broadcasts": 0,
            "performance_snapshots": 0,
        }

        self.logger.info("Real-Time Cost Tracker initialized")

    async def start_monitoring(self):
        """Start real-time monitoring tasks"""
        if self._monitoring_tasks:
            self.logger.warning("Monitoring already started")
            return

        self.logger.info("Starting real-time cost monitoring")

        # Start monitoring tasks
        self._monitoring_tasks = [
            asyncio.create_task(self._monitor_credit_balance()),
            asyncio.create_task(self._monitor_usage_summary()),
            asyncio.create_task(self._monitor_budget_alerts()),
            asyncio.create_task(self._monitor_performance()),
            asyncio.create_task(self._monitor_optimization_stats()),
            asyncio.create_task(self._cleanup_old_data()),
        ]

        await asyncio.sleep(0.1)  # Allow tasks to start
        self.logger.info(f"Started {len(self._monitoring_tasks)} monitoring tasks")

    async def stop_monitoring(self):
        """Stop real-time monitoring tasks"""
        self.logger.info("Stopping real-time cost monitoring")

        # Signal shutdown
        self._shutdown_event.set()

        # Cancel monitoring tasks
        for task in self._monitoring_tasks:
            if not task.done():
                task.cancel()

        # Wait for tasks to complete
        if self._monitoring_tasks:
            await asyncio.gather(*self._monitoring_tasks, return_exceptions=True)

        self._monitoring_tasks.clear()
        self.logger.info("Real-time cost monitoring stopped")

    async def _monitor_credit_balance(self):
        """Monitor API credit balance"""
        while not self._shutdown_event.is_set():
            try:
                balance = await self.credit_monitor.get_credit_balance()

                # Update metrics
                metric = CostMetric(
                    name="api_credit_balance",
                    type=MetricType.COST,
                    value=balance.balance,
                    unit="USD",
                    timestamp=datetime.now(),
                    metadata={
                        "status": balance.status.value,
                        "currency": balance.currency,
                        "daily_usage": balance.daily_usage,
                        "weekly_usage": balance.weekly_usage,
                        "monthly_usage": balance.monthly_usage,
                    },
                )

                await self._update_metric(metric)

                # Check for balance alerts
                await self._check_balance_alerts(balance)

                # Broadcast update
                await self._broadcast_update(
                    "budget_status",
                    {
                        "balance": balance.balance,
                        "status": balance.status.value,
                        "daily_usage": balance.daily_usage,
                        "weekly_usage": balance.weekly_usage,
                        "monthly_usage": balance.monthly_usage,
                        "timestamp": datetime.now().isoformat(),
                    },
                )

                await asyncio.sleep(self.update_intervals["credit_balance"])

            except Exception as e:
                self.logger.error(f"Error monitoring credit balance: {e}")
                await asyncio.sleep(60)  # Wait before retrying

    async def _monitor_usage_summary(self):
        """Monitor overall usage summary"""
        while not self._shutdown_event.is_set():
            try:
                # Get usage summary from credit monitor
                usage_summary = await self.credit_monitor.get_usage_summary()

                # Update metrics
                for period, usage in usage_summary["balance"].__dict__.items():
                    if isinstance(usage, (int, float)):
                        metric = CostMetric(
                            name=f"usage_{period}",
                            type=MetricType.USAGE,
                            value=float(usage),
                            unit="USD" if "usage" in period else "count",
                            timestamp=datetime.now(),
                        )
                        await self._update_metric(metric)

                await asyncio.sleep(self.update_intervals["usage_summary"])

            except Exception as e:
                self.logger.error(f"Error monitoring usage summary: {e}")
                await asyncio.sleep(60)

    async def _monitor_budget_alerts(self):
        """Monitor budget thresholds and generate alerts"""
        while not self._shutdown_event.is_set():
            try:
                # Check budget status across all periods
                for period in BudgetPeriod:
                    await self._check_budget_threshold(period)

                await asyncio.sleep(self.update_intervals["budget_alerts"])

            except Exception as e:
                self.logger.error(f"Error monitoring budget alerts: {e}")
                await asyncio.sleep(30)

    async def _monitor_performance(self):
        """Monitor performance metrics"""
        while not self._shutdown_event.is_set():
            try:
                # Get optimization statistics
                opt_stats = self.cost_optimization.get_optimization_stats()

                # Get model fallback statistics
                fallback_stats = self.model_fallback.get_fallback_statistics()

                # Get circuit breaker health
                circuit_health = self.circuit_registry.get_health_summary()

                # Create performance summary
                total_requests = opt_stats["optimization"]["total_requests"]
                successful_requests = total_requests - circuit_health.get(
                    "open_breakers", 0
                )

                summary = PerformanceSummary(
                    total_requests=total_requests,
                    successful_requests=successful_requests,
                    failed_requests=total_requests - successful_requests,
                    average_cost=(
                        opt_stats["optimization"]["total_savings"] / total_requests
                        if total_requests > 0
                        else 0
                    ),
                    total_cost=sum(self.cost_optimization.usage_by_period.values()),
                    cost_savings=opt_stats["optimization"]["total_savings"],
                    optimization_rate=opt_stats["optimization"][
                        "optimization_rate_percent"
                    ],
                    cache_hit_rate=opt_stats["cache"]["hit_rate_percent"],
                    fallback_rate=fallback_stats.get("fallback_rate_percent", 0),
                )

                # Store performance history
                self.performance_history.append(summary)
                if len(self.performance_history) > self.max_history_size:
                    self.performance_history.pop(0)

                self.stats["performance_snapshots"] += 1

                # Update metrics
                perf_metrics = [
                    CostMetric(
                        "total_requests",
                        MetricType.PERFORMANCE,
                        summary.total_requests,
                        "count",
                        datetime.now(),
                    ),
                    CostMetric(
                        "success_rate",
                        MetricType.PERFORMANCE,
                        summary.successful_requests
                        / max(summary.total_requests, 1)
                        * 100,
                        "percent",
                        datetime.now(),
                    ),
                    CostMetric(
                        "average_cost",
                        MetricType.COST,
                        summary.average_cost,
                        "USD",
                        datetime.now(),
                    ),
                    CostMetric(
                        "optimization_rate",
                        MetricType.OPTIMIZATION,
                        summary.optimization_rate,
                        "percent",
                        datetime.now(),
                    ),
                    CostMetric(
                        "cache_hit_rate",
                        MetricType.OPTIMIZATION,
                        summary.cache_hit_rate,
                        "percent",
                        datetime.now(),
                    ),
                ]

                for metric in perf_metrics:
                    await self._update_metric(metric)

                # Broadcast performance update
                await self._broadcast_update("performance_metrics", asdict(summary))

                await asyncio.sleep(self.update_intervals["performance"])

            except Exception as e:
                self.logger.error(f"Error monitoring performance: {e}")
                await asyncio.sleep(120)

    async def _monitor_optimization_stats(self):
        """Monitor optimization statistics"""
        while not self._shutdown_event.is_set():
            try:
                stats = self.cost_optimization.get_optimization_stats()

                # Broadcast optimization stats
                await self._broadcast_update("optimization_stats", stats)

                await asyncio.sleep(self.update_intervals["optimization_stats"])

            except Exception as e:
                self.logger.error(f"Error monitoring optimization stats: {e}")
                await asyncio.sleep(180)

    async def _cleanup_old_data(self):
        """Clean up old data periodically"""
        while not self._shutdown_event.is_set():
            try:
                # Clean up old alerts (resolved alerts older than 24 hours)
                cutoff_time = datetime.now() - timedelta(hours=24)
                old_alert_ids = [
                    alert_id
                    for alert_id, alert in self.active_alerts.items()
                    if alert.resolved
                    and alert.resolution_time
                    and alert.resolution_time < cutoff_time
                ]

                for alert_id in old_alert_ids:
                    del self.active_alerts[alert_id]

                if old_alert_ids:
                    self.logger.debug(f"Cleaned up {len(old_alert_ids)} old alerts")

                # Clean up old metrics (older than 1 hour)
                cutoff_time = datetime.now() - timedelta(hours=1)
                old_metric_names = [
                    name
                    for name, metric in self.current_metrics.items()
                    if metric.timestamp < cutoff_time
                ]

                for name in old_metric_names:
                    del self.current_metrics[name]

                await asyncio.sleep(3600)  # Clean up every hour

            except Exception as e:
                self.logger.error(f"Error during cleanup: {e}")
                await asyncio.sleep(3600)

    async def _update_metric(self, metric: CostMetric):
        """Update a real-time metric"""
        self.current_metrics[metric.name] = metric
        self.stats["metrics_updated"] += 1

        self.logger.debug(f"Updated metric {metric.name}: {metric.value} {metric.unit}")

    async def _check_balance_alerts(self, balance):
        """Check and generate balance-related alerts"""
        alert_id = f"balance_{balance.status.value}"

        if balance.status == CreditStatus.CRITICAL:
            await self._create_alert(
                alert_id=alert_id,
                severity=AlertSeverity.CRITICAL,
                metric_type=MetricType.COST,
                title="API Credit Balance Critical",
                message=f"API credit balance is critically low: ${balance.balance:.2f}",
                data={"balance": balance.balance, "status": balance.status.value},
            )
        elif balance.status == CreditStatus.WARNING:
            await self._create_alert(
                alert_id=alert_id,
                severity=AlertSeverity.WARNING,
                metric_type=MetricType.COST,
                title="API Credit Balance Warning",
                message=f"API credit balance is low: ${balance.balance:.2f}",
                data={"balance": balance.balance, "status": balance.status.value},
            )
        elif balance.status == CreditStatus.EXHAUSTED:
            await self._create_alert(
                alert_id=alert_id,
                severity=AlertSeverity.EMERGENCY,
                metric_type=MetricType.COST,
                title="API Credits Exhausted",
                message="API credits have been exhausted - service degraded",
                data={"balance": balance.balance, "status": balance.status.value},
            )
        else:
            # Resolve any existing balance alerts
            if alert_id in self.active_alerts:
                await self._resolve_alert(alert_id)

    async def _check_budget_threshold(self, period: BudgetPeriod):
        """Check budget threshold for a specific period"""
        try:
            # This would integrate with the cost optimization framework
            # to get current usage vs budget for the period

            # Placeholder implementation
            pass

        except Exception as e:
            self.logger.error(
                f"Error checking budget threshold for {period.value}: {e}"
            )

    async def _create_alert(
        self,
        alert_id: str,
        severity: AlertSeverity,
        metric_type: MetricType,
        title: str,
        message: str,
        data: Dict[str, Any],
    ):
        """Create a new alert"""
        # Check if alert already exists and is unresolved
        if alert_id in self.active_alerts and not self.active_alerts[alert_id].resolved:
            return  # Don't create duplicate alerts

        alert = CostAlert(
            id=alert_id,
            severity=severity,
            metric_type=metric_type,
            title=title,
            message=message,
            timestamp=datetime.now(),
            data=data,
        )

        self.active_alerts[alert_id] = alert
        self.stats["alerts_sent"] += 1

        # Log alert
        log_level = {
            AlertSeverity.INFO: logging.INFO,
            AlertSeverity.WARNING: logging.WARNING,
            AlertSeverity.CRITICAL: logging.ERROR,
            AlertSeverity.EMERGENCY: logging.CRITICAL,
        }[severity]

        self.logger.log(
            log_level,
            f"Cost Alert: {title}",
            extra={
                "alert_id": alert_id,
                "severity": severity.value,
                "message": message,
                "data": data,
            },
        )

        # Broadcast alert
        await self._broadcast_update("cost_alerts", asdict(alert))

    async def _resolve_alert(self, alert_id: str):
        """Resolve an existing alert"""
        if alert_id in self.active_alerts:
            alert = self.active_alerts[alert_id]
            alert.resolved = True
            alert.resolution_time = datetime.now()

            self.logger.info(f"Resolved cost alert: {alert.title}")

            # Broadcast resolution
            await self._broadcast_update("cost_alerts", asdict(alert))

    async def _broadcast_update(self, channel: str, data: Dict[str, Any]):
        """Broadcast update to WebSocket connections"""
        if not self.websocket_enabled or channel not in self.broadcast_channels:
            return

        message = {
            "channel": channel,
            "timestamp": datetime.now().isoformat(),
            "data": data,
        }

        # Remove closed connections
        closed_connections = set()
        for connection in self.websocket_connections:
            try:
                await connection.send_text(json.dumps(message, default=str))
                self.stats["websocket_broadcasts"] += 1
            except:
                closed_connections.add(connection)

        # Clean up closed connections
        self.websocket_connections -= closed_connections

    def add_websocket_connection(self, websocket):
        """Add WebSocket connection for real-time updates"""
        self.websocket_connections.add(websocket)
        self.logger.debug(
            f"Added WebSocket connection. Total: {len(self.websocket_connections)}"
        )

    def remove_websocket_connection(self, websocket):
        """Remove WebSocket connection"""
        self.websocket_connections.discard(websocket)
        self.logger.debug(
            f"Removed WebSocket connection. Total: {len(self.websocket_connections)}"
        )

    def get_current_dashboard_data(self) -> Dict[str, Any]:
        """Get current dashboard data for new WebSocket connections"""
        return {
            "metrics": {
                name: asdict(metric) for name, metric in self.current_metrics.items()
            },
            "alerts": {
                alert_id: asdict(alert)
                for alert_id, alert in self.active_alerts.items()
            },
            "performance_history": [
                asdict(p) for p in self.performance_history[-10:]
            ],  # Last 10
            "stats": self.stats,
            "status": {
                "tracking_enabled": self.tracking_enabled,
                "websocket_enabled": self.websocket_enabled,
                "alert_enabled": self.alert_enabled,
                "active_connections": len(self.websocket_connections),
                "monitoring_tasks": len(self._monitoring_tasks),
            },
        }

    async def health_check(self) -> Dict[str, Any]:
        """Perform health check of the cost tracker"""
        try:
            return {
                "status": "healthy",
                "tracking_enabled": self.tracking_enabled,
                "monitoring_tasks_running": len(self._monitoring_tasks),
                "websocket_connections": len(self.websocket_connections),
                "active_alerts": len(
                    [a for a in self.active_alerts.values() if not a.resolved]
                ),
                "metrics_count": len(self.current_metrics),
                "performance_history_size": len(self.performance_history),
                "statistics": self.stats,
            }
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e),
                "tracking_enabled": self.tracking_enabled,
            }


# Global instance
_cost_tracker: Optional[RealTimeCostTracker] = None


def get_cost_tracker() -> RealTimeCostTracker:
    """Get global cost tracker instance"""
    global _cost_tracker
    if _cost_tracker is None:
        _cost_tracker = RealTimeCostTracker()
    return _cost_tracker


async def start_cost_tracking():
    """Start global cost tracking"""
    tracker = get_cost_tracker()
    await tracker.start_monitoring()


async def stop_cost_tracking():
    """Stop global cost tracking"""
    global _cost_tracker
    if _cost_tracker:
        await _cost_tracker.stop_monitoring()
        _cost_tracker = None
