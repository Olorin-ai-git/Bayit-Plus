"""MCP Health Monitoring and Failover System."""

import asyncio
import json
import time
from collections import defaultdict, deque
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable, Dict, List, Optional, Set

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class HealthStatus(Enum):
    """Health status enumeration."""

    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"
    UNKNOWN = "unknown"


class AlertSeverity(Enum):
    """Alert severity levels."""

    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


@dataclass
class HealthMetric:
    """Individual health metric."""

    name: str
    value: float
    threshold: float
    status: HealthStatus
    timestamp: float = field(default_factory=time.time)

    def is_healthy(self) -> bool:
        """Check if metric is healthy."""
        return self.status == HealthStatus.HEALTHY


@dataclass
class ServerHealthReport:
    """Comprehensive health report for an MCP server."""

    server_name: str
    overall_status: HealthStatus
    metrics: Dict[str, HealthMetric]
    last_check: float = field(default_factory=time.time)
    consecutive_failures: int = 0
    uptime_seconds: float = 0
    error_count: int = 0
    last_error: Optional[str] = None

    def get_health_score(self) -> float:
        """Calculate overall health score (0-1)."""
        if not self.metrics:
            return 0.0

        healthy_metrics = sum(1 for m in self.metrics.values() if m.is_healthy())
        return healthy_metrics / len(self.metrics)


@dataclass
class FailoverRule:
    """Failover rule configuration."""

    trigger_condition: str  # "consecutive_failures", "error_rate", "health_score"
    threshold: float
    action: str  # "switch_primary", "remove_from_pool", "alert_only"
    cooldown_seconds: float = 300.0  # 5 minutes
    last_triggered: float = 0


class MCPHealthMonitor:
    """Advanced health monitoring system for MCP servers."""

    def __init__(
        self,
        check_interval: float = 30.0,
        history_size: int = 100,
        alert_cooldown: float = 300.0,
    ):
        """Initialize health monitor."""
        self.check_interval = check_interval
        self.history_size = history_size
        self.alert_cooldown = alert_cooldown

        self.server_health: Dict[str, ServerHealthReport] = {}
        self.health_history: Dict[str, deque] = defaultdict(
            lambda: deque(maxlen=history_size)
        )
        self.failover_rules: Dict[str, List[FailoverRule]] = {}
        self.alert_handlers: List[Callable] = []
        self.primary_servers: Dict[str, str] = {}  # service -> primary server
        self.server_priorities: Dict[str, Dict[str, int]] = (
            {}
        )  # service -> {server: priority}

        self._monitor_task: Optional[asyncio.Task] = None
        self._running = False

    async def start_monitoring(self) -> None:
        """Start the health monitoring system."""
        if self._running:
            return

        logger.info("Starting MCP health monitoring")
        self._running = True
        self._monitor_task = asyncio.create_task(self._monitoring_loop())

    async def stop_monitoring(self) -> None:
        """Stop the health monitoring system."""
        if not self._running:
            return

        logger.info("Stopping MCP health monitoring")
        self._running = False

        if self._monitor_task:
            self._monitor_task.cancel()
            try:
                await self._monitor_task
            except asyncio.CancelledError:
                pass

    def register_server(
        self,
        server_name: str,
        service_type: str,
        priority: int = 0,
        failover_rules: Optional[List[FailoverRule]] = None,
    ) -> None:
        """Register a server for health monitoring."""
        logger.info(f"Registering server for health monitoring: {server_name}")

        # Initialize health report
        self.server_health[server_name] = ServerHealthReport(
            server_name=server_name, overall_status=HealthStatus.UNKNOWN, metrics={}
        )

        # Set up service mapping and priorities
        if service_type not in self.server_priorities:
            self.server_priorities[service_type] = {}

        self.server_priorities[service_type][server_name] = priority

        # Set primary server if not set or if higher priority
        if service_type not in self.primary_servers:
            self.primary_servers[service_type] = server_name
        else:
            current_primary = self.primary_servers[service_type]
            current_priority = self.server_priorities[service_type].get(
                current_primary, -1
            )
            if priority > current_priority:
                self.primary_servers[service_type] = server_name

        # Register failover rules
        if failover_rules:
            self.failover_rules[server_name] = failover_rules
        else:
            self.failover_rules[server_name] = self._default_failover_rules()

    def _default_failover_rules(self) -> List[FailoverRule]:
        """Create default failover rules."""
        return [
            FailoverRule(
                trigger_condition="consecutive_failures",
                threshold=3,
                action="switch_primary",
            ),
            FailoverRule(
                trigger_condition="health_score", threshold=0.5, action="alert_only"
            ),
            FailoverRule(
                trigger_condition="error_rate",
                threshold=0.1,  # 10% error rate
                action="remove_from_pool",
            ),
        ]

    def add_alert_handler(self, handler: Callable) -> None:
        """Add an alert handler function."""
        self.alert_handlers.append(handler)

    async def check_server_health(self, server_name: str) -> ServerHealthReport:
        """Perform comprehensive health check on a server."""
        if server_name not in self.server_health:
            raise ValueError(f"Server not registered: {server_name}")

        report = self.server_health[server_name]
        start_time = time.time()

        try:
            # Perform various health checks
            metrics = {}

            # Response time check
            response_time = await self._check_response_time(server_name)
            metrics["response_time"] = HealthMetric(
                name="response_time",
                value=response_time,
                threshold=5.0,  # 5 seconds
                status=(
                    HealthStatus.HEALTHY
                    if response_time < 5.0
                    else HealthStatus.UNHEALTHY
                ),
            )

            # Error rate check
            error_rate = await self._check_error_rate(server_name)
            metrics["error_rate"] = HealthMetric(
                name="error_rate",
                value=error_rate,
                threshold=0.1,  # 10%
                status=(
                    HealthStatus.HEALTHY if error_rate < 0.1 else HealthStatus.UNHEALTHY
                ),
            )

            # Memory usage check
            memory_usage = await self._check_memory_usage(server_name)
            metrics["memory_usage"] = HealthMetric(
                name="memory_usage",
                value=memory_usage,
                threshold=0.8,  # 80%
                status=(
                    HealthStatus.HEALTHY
                    if memory_usage < 0.8
                    else HealthStatus.DEGRADED
                ),
            )

            # Connection count check
            connection_count = await self._check_connection_count(server_name)
            metrics["connection_count"] = HealthMetric(
                name="connection_count",
                value=connection_count,
                threshold=100,
                status=(
                    HealthStatus.HEALTHY
                    if connection_count < 100
                    else HealthStatus.DEGRADED
                ),
            )

            # Update report
            report.metrics = metrics
            report.last_check = time.time()
            report.uptime_seconds += time.time() - start_time

            # Determine overall status
            health_score = report.get_health_score()
            if health_score >= 0.8:
                report.overall_status = HealthStatus.HEALTHY
                report.consecutive_failures = 0
            elif health_score >= 0.5:
                report.overall_status = HealthStatus.DEGRADED
            else:
                report.overall_status = HealthStatus.UNHEALTHY
                report.consecutive_failures += 1

            # Store in history
            self.health_history[server_name].append(
                {
                    "timestamp": time.time(),
                    "status": report.overall_status.value,
                    "health_score": health_score,
                    "metrics": {k: v.value for k, v in metrics.items()},
                }
            )

            # Check failover conditions
            await self._check_failover_conditions(server_name, report)

            return report

        except Exception as e:
            logger.error(f"Health check failed for {server_name}: {e}")
            report.consecutive_failures += 1
            report.last_error = str(e)
            report.error_count += 1
            report.overall_status = HealthStatus.UNHEALTHY

            await self._trigger_alert(
                server_name, AlertSeverity.CRITICAL, f"Health check failed: {e}"
            )

            return report

    async def _check_response_time(self, server_name: str) -> float:
        """Check server response time."""
        try:
            start = time.time()
            # TODO: Implement actual MCP ping
            await asyncio.sleep(0.01)  # Simulate ping
            return time.time() - start
        except Exception:
            return float("inf")

    async def _check_error_rate(self, server_name: str) -> float:
        """Check server error rate."""
        # TODO: Implement actual error rate calculation from metrics
        return 0.05  # Mock 5% error rate

    async def _check_memory_usage(self, server_name: str) -> float:
        """Check server memory usage."""
        # TODO: Implement actual memory usage check
        return 0.6  # Mock 60% memory usage

    async def _check_connection_count(self, server_name: str) -> int:
        """Check active connection count."""
        # TODO: Implement actual connection count check
        return 25  # Mock 25 connections

    async def _check_failover_conditions(
        self, server_name: str, report: ServerHealthReport
    ) -> None:
        """Check if any failover rules are triggered."""
        rules = self.failover_rules.get(server_name, [])

        for rule in rules:
            # Check cooldown
            if time.time() - rule.last_triggered < rule.cooldown_seconds:
                continue

            triggered = False

            if rule.trigger_condition == "consecutive_failures":
                triggered = report.consecutive_failures >= rule.threshold
            elif rule.trigger_condition == "health_score":
                triggered = report.get_health_score() < rule.threshold
            elif rule.trigger_condition == "error_rate":
                error_metric = report.metrics.get("error_rate")
                if error_metric:
                    triggered = error_metric.value >= rule.threshold

            if triggered:
                await self._execute_failover_action(server_name, rule)
                rule.last_triggered = time.time()

    async def _execute_failover_action(
        self, server_name: str, rule: FailoverRule
    ) -> None:
        """Execute failover action."""
        logger.warning(f"Executing failover action '{rule.action}' for {server_name}")

        if rule.action == "switch_primary":
            await self._switch_primary_server(server_name)
        elif rule.action == "remove_from_pool":
            await self._remove_from_pool(server_name)
        elif rule.action == "alert_only":
            await self._trigger_alert(
                server_name,
                AlertSeverity.WARNING,
                f"Failover condition triggered: {rule.trigger_condition} >= {rule.threshold}",
            )

    async def _switch_primary_server(self, failed_server: str) -> None:
        """Switch to backup server as primary."""
        # Find service type for this server
        service_type = None
        for svc, primary in self.primary_servers.items():
            if primary == failed_server:
                service_type = svc
                break

        if not service_type:
            return

        # Find next best server
        available_servers = self.server_priorities[service_type]
        healthy_servers = [
            (server, priority)
            for server, priority in available_servers.items()
            if server != failed_server
            and self.server_health.get(server, {}).get("overall_status")
            == HealthStatus.HEALTHY
        ]

        if healthy_servers:
            # Sort by priority (highest first)
            healthy_servers.sort(key=lambda x: x[1], reverse=True)
            new_primary = healthy_servers[0][0]

            old_primary = self.primary_servers[service_type]
            self.primary_servers[service_type] = new_primary

            logger.info(
                f"Switched primary server for {service_type}: {old_primary} -> {new_primary}"
            )

            await self._trigger_alert(
                failed_server,
                AlertSeverity.CRITICAL,
                f"Primary server switched from {old_primary} to {new_primary}",
            )

    async def _remove_from_pool(self, server_name: str) -> None:
        """Remove server from connection pool."""
        logger.warning(f"Removing {server_name} from connection pool")
        # TODO: Integration with connection pool to remove server

        await self._trigger_alert(
            server_name,
            AlertSeverity.CRITICAL,
            f"Server removed from pool due to health issues",
        )

    async def _trigger_alert(
        self, server_name: str, severity: AlertSeverity, message: str
    ) -> None:
        """Trigger alert to all registered handlers."""
        alert = {
            "timestamp": time.time(),
            "server_name": server_name,
            "severity": severity.value,
            "message": message,
            "health_status": self.server_health.get(
                server_name, {}
            ).overall_status.value,
        }

        logger.log(
            40 if severity == AlertSeverity.CRITICAL else 30,  # ERROR or WARNING level
            f"MCP Alert [{severity.value}] {server_name}: {message}",
        )

        # Call all alert handlers
        for handler in self.alert_handlers:
            try:
                if asyncio.iscoroutinefunction(handler):
                    await handler(alert)
                else:
                    handler(alert)
            except Exception as e:
                logger.error(f"Alert handler failed: {e}")

    async def _monitoring_loop(self) -> None:
        """Main monitoring loop."""
        while self._running:
            try:
                # Check health of all registered servers
                for server_name in list(self.server_health.keys()):
                    await self.check_server_health(server_name)

                await asyncio.sleep(self.check_interval)

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in monitoring loop: {e}")
                await asyncio.sleep(5)  # Brief pause before continuing

    def get_primary_server(self, service_type: str) -> Optional[str]:
        """Get current primary server for a service."""
        return self.primary_servers.get(service_type)

    def get_health_summary(self) -> Dict[str, Any]:
        """Get comprehensive health summary."""
        summary = {
            "total_servers": len(self.server_health),
            "healthy_servers": 0,
            "degraded_servers": 0,
            "unhealthy_servers": 0,
            "primary_servers": self.primary_servers.copy(),
            "servers": {},
        }

        for server_name, report in self.server_health.items():
            status = report.overall_status
            if status == HealthStatus.HEALTHY:
                summary["healthy_servers"] += 1
            elif status == HealthStatus.DEGRADED:
                summary["degraded_servers"] += 1
            else:
                summary["unhealthy_servers"] += 1

            summary["servers"][server_name] = {
                "status": status.value,
                "health_score": report.get_health_score(),
                "consecutive_failures": report.consecutive_failures,
                "uptime_seconds": report.uptime_seconds,
                "error_count": report.error_count,
                "last_check": report.last_check,
                "metrics": {k: v.value for k, v in report.metrics.items()},
            }

        return summary


# Global health monitor instance
mcp_health_monitor = MCPHealthMonitor()
