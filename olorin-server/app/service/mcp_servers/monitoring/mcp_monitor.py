"""
MCP Monitoring and Observability System

Enterprise-grade monitoring for MCP servers with real-time health checks,
performance metrics, alerting, and comprehensive observability features.
"""

import asyncio
import json
import statistics
import time
from collections import defaultdict, deque
from contextlib import asynccontextmanager
from dataclasses import asdict, dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Any, Dict, List, Optional, Set, Tuple

# Third-party imports
import aiohttp
from prometheus_client import (
    CONTENT_TYPE_LATEST,
    Counter,
    Gauge,
    Histogram,
    Summary,
    generate_latest,
)

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class HealthStatus(Enum):
    """MCP server health status levels."""

    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"
    CRITICAL = "critical"
    UNKNOWN = "unknown"


class MetricType(Enum):
    """Types of metrics collected."""

    COUNTER = "counter"
    GAUGE = "gauge"
    HISTOGRAM = "histogram"
    SUMMARY = "summary"


class AlertSeverity(Enum):
    """Alert severity levels."""

    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


@dataclass
class ServerMetrics:
    """Metrics for a single MCP server."""

    server_name: str
    timestamp: datetime
    response_times: deque = field(default_factory=lambda: deque(maxlen=1000))
    success_count: int = 0
    error_count: int = 0
    timeout_count: int = 0
    total_requests: int = 0
    avg_response_time: float = 0.0
    p95_response_time: float = 0.0
    p99_response_time: float = 0.0
    success_rate: float = 100.0
    error_rate: float = 0.0
    throughput: float = 0.0
    last_error: Optional[str] = None
    last_error_time: Optional[datetime] = None
    memory_usage_mb: float = 0.0
    cpu_usage_percent: float = 0.0
    active_connections: int = 0
    queue_depth: int = 0


@dataclass
class HealthCheck:
    """Health check result for an MCP server."""

    server_name: str
    status: HealthStatus
    timestamp: datetime
    response_time_ms: float
    checks_passed: Dict[str, bool]
    message: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class Alert:
    """Monitoring alert."""

    alert_id: str
    server_name: str
    severity: AlertSeverity
    title: str
    description: str
    timestamp: datetime
    resolved: bool = False
    resolved_at: Optional[datetime] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


class MCPMonitor:
    """
    Comprehensive monitoring system for MCP servers.

    Features:
    - Real-time health monitoring
    - Performance metrics collection
    - Automated alerting
    - SLA tracking
    - Integration with enterprise monitoring systems
    """

    def __init__(
        self,
        check_interval: int = 30,
        metrics_window: int = 3600,
        alert_cooldown: int = 300,
        enable_prometheus: bool = True,
    ):
        """
        Initialize the MCP monitoring system.

        Args:
            check_interval: Health check interval in seconds
            metrics_window: Metrics retention window in seconds
            alert_cooldown: Alert cooldown period in seconds
            enable_prometheus: Enable Prometheus metrics export
        """
        self.check_interval = check_interval
        self.metrics_window = metrics_window
        self.alert_cooldown = alert_cooldown
        self.enable_prometheus = enable_prometheus

        # Server tracking
        self.servers: Dict[str, ServerMetrics] = {}
        self.health_history: Dict[str, deque] = defaultdict(lambda: deque(maxlen=100))

        # Alerting
        self.active_alerts: Dict[str, Alert] = {}
        self.alert_history: deque = deque(maxlen=1000)
        self.alert_cooldowns: Dict[str, datetime] = {}

        # Performance tracking
        self.performance_baselines: Dict[str, Dict[str, float]] = {}
        self.sla_targets = {
            "availability": 99.99,  # 99.99% uptime
            "response_time_p95": 1000,  # 1 second
            "response_time_p99": 2000,  # 2 seconds
            "error_rate": 0.1,  # 0.1% error rate
        }

        # Monitoring tasks
        self._monitoring_tasks: List[asyncio.Task] = []
        self._shutdown = False

        # Initialize Prometheus metrics if enabled
        if self.enable_prometheus:
            self._init_prometheus_metrics()

    def _init_prometheus_metrics(self):
        """Initialize Prometheus metrics collectors."""
        self.prom_request_total = Counter(
            "mcp_requests_total", "Total MCP server requests", ["server", "status"]
        )

        self.prom_request_duration = Histogram(
            "mcp_request_duration_seconds",
            "MCP request duration",
            ["server", "operation"],
        )

        self.prom_health_status = Gauge(
            "mcp_health_status",
            "MCP server health status (1=healthy, 0=unhealthy)",
            ["server"],
        )

        self.prom_active_alerts = Gauge(
            "mcp_active_alerts", "Number of active MCP alerts", ["severity"]
        )

        self.prom_success_rate = Gauge(
            "mcp_success_rate", "MCP server success rate", ["server"]
        )

    async def start_monitoring(self, servers: List[str]):
        """
        Start monitoring for specified MCP servers.

        Args:
            servers: List of server names to monitor
        """
        logger.info(f"Starting MCP monitoring for {len(servers)} servers")

        # Initialize server metrics
        for server in servers:
            if server not in self.servers:
                self.servers[server] = ServerMetrics(
                    server_name=server, timestamp=datetime.now()
                )

        # Start monitoring tasks
        self._monitoring_tasks = [
            asyncio.create_task(self._health_check_loop()),
            asyncio.create_task(self._metrics_aggregation_loop()),
            asyncio.create_task(self._alert_evaluation_loop()),
            asyncio.create_task(self._sla_tracking_loop()),
        ]

        logger.info("MCP monitoring started successfully")

    async def stop_monitoring(self):
        """Stop all monitoring tasks gracefully."""
        logger.info("Stopping MCP monitoring...")
        self._shutdown = True

        # Cancel all monitoring tasks
        for task in self._monitoring_tasks:
            task.cancel()

        # Wait for tasks to complete
        await asyncio.gather(*self._monitoring_tasks, return_exceptions=True)

        logger.info("MCP monitoring stopped")

    async def _health_check_loop(self):
        """Continuous health check loop for all servers."""
        while not self._shutdown:
            try:
                # Check health of all servers
                tasks = [
                    self._check_server_health(server) for server in self.servers.keys()
                ]

                results = await asyncio.gather(*tasks, return_exceptions=True)

                # Process health check results
                for result in results:
                    if isinstance(result, HealthCheck):
                        await self._process_health_check(result)

                await asyncio.sleep(self.check_interval)

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in health check loop: {e}")
                await asyncio.sleep(5)

    async def _check_server_health(self, server_name: str) -> HealthCheck:
        """
        Perform health check for a single server.

        Args:
            server_name: Name of the server to check

        Returns:
            HealthCheck result
        """
        start_time = time.time()
        checks_passed = {}

        try:
            # Connectivity check
            checks_passed["connectivity"] = await self._check_connectivity(server_name)

            # Response time check
            response_time = (time.time() - start_time) * 1000
            checks_passed["response_time"] = (
                response_time < self.sla_targets["response_time_p95"]
            )

            # Resource usage check
            checks_passed["resources"] = await self._check_resources(server_name)

            # Error rate check
            metrics = self.servers.get(server_name)
            if metrics:
                checks_passed["error_rate"] = (
                    metrics.error_rate <= self.sla_targets["error_rate"]
                )

            # Determine overall status
            if all(checks_passed.values()):
                status = HealthStatus.HEALTHY
            elif sum(checks_passed.values()) >= len(checks_passed) * 0.7:
                status = HealthStatus.DEGRADED
            else:
                status = HealthStatus.UNHEALTHY

            return HealthCheck(
                server_name=server_name,
                status=status,
                timestamp=datetime.now(),
                response_time_ms=response_time,
                checks_passed=checks_passed,
                metadata={
                    "uptime_seconds": self._calculate_uptime(server_name),
                    "last_error": metrics.last_error if metrics else None,
                },
            )

        except Exception as e:
            logger.error(f"Health check failed for {server_name}: {e}")
            return HealthCheck(
                server_name=server_name,
                status=HealthStatus.CRITICAL,
                timestamp=datetime.now(),
                response_time_ms=-1,
                checks_passed=checks_passed,
                message=str(e),
            )

    async def _check_connectivity(self, server_name: str) -> bool:
        """Check if server is reachable."""
        # This would be implemented based on actual MCP server connectivity
        # For now, return True as placeholder
        return True

    async def _check_resources(self, server_name: str) -> bool:
        """Check server resource usage."""
        metrics = self.servers.get(server_name)
        if not metrics:
            return True

        # Check resource thresholds
        return (
            metrics.memory_usage_mb < 1000  # 1GB threshold
            and metrics.cpu_usage_percent < 80
            and metrics.queue_depth < 100
        )

    def _calculate_uptime(self, server_name: str) -> float:
        """Calculate server uptime in seconds."""
        metrics = self.servers.get(server_name)
        if not metrics:
            return 0

        return (datetime.now() - metrics.timestamp).total_seconds()

    async def _process_health_check(self, health_check: HealthCheck):
        """Process health check result and update metrics."""
        server_name = health_check.server_name

        # Update health history
        self.health_history[server_name].append(health_check)

        # Update Prometheus metrics if enabled
        if self.enable_prometheus:
            health_value = 1 if health_check.status == HealthStatus.HEALTHY else 0
            self.prom_health_status.labels(server=server_name).set(health_value)

        # Generate alerts if needed
        if health_check.status in [HealthStatus.UNHEALTHY, HealthStatus.CRITICAL]:
            await self._create_alert(
                server_name=server_name,
                severity=(
                    AlertSeverity.CRITICAL
                    if health_check.status == HealthStatus.CRITICAL
                    else AlertSeverity.ERROR
                ),
                title=f"MCP Server {server_name} is {health_check.status.value}",
                description=f"Health check failed: {health_check.message or 'Multiple checks failed'}",
                metadata={"health_check": asdict(health_check)},
            )

    async def _metrics_aggregation_loop(self):
        """Aggregate and calculate metrics periodically."""
        while not self._shutdown:
            try:
                for server_name, metrics in self.servers.items():
                    await self._aggregate_metrics(metrics)

                await asyncio.sleep(10)  # Aggregate every 10 seconds

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in metrics aggregation: {e}")
                await asyncio.sleep(5)

    async def _aggregate_metrics(self, metrics: ServerMetrics):
        """Aggregate metrics for a server."""
        if not metrics.response_times:
            return

        # Calculate response time percentiles
        sorted_times = sorted(metrics.response_times)
        metrics.avg_response_time = statistics.mean(sorted_times)
        metrics.p95_response_time = sorted_times[int(len(sorted_times) * 0.95)]
        metrics.p99_response_time = sorted_times[int(len(sorted_times) * 0.99)]

        # Calculate rates
        if metrics.total_requests > 0:
            metrics.success_rate = (
                metrics.success_count / metrics.total_requests
            ) * 100
            metrics.error_rate = (metrics.error_count / metrics.total_requests) * 100

        # Update Prometheus metrics
        if self.enable_prometheus:
            self.prom_success_rate.labels(server=metrics.server_name).set(
                metrics.success_rate
            )

    async def _alert_evaluation_loop(self):
        """Evaluate conditions and generate alerts."""
        while not self._shutdown:
            try:
                await self._evaluate_alerts()
                await asyncio.sleep(30)  # Evaluate every 30 seconds

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in alert evaluation: {e}")
                await asyncio.sleep(5)

    async def _evaluate_alerts(self):
        """Evaluate alert conditions for all servers."""
        for server_name, metrics in self.servers.items():
            # Check success rate
            if metrics.success_rate < 95:
                await self._create_alert(
                    server_name=server_name,
                    severity=AlertSeverity.WARNING,
                    title=f"Low success rate for {server_name}",
                    description=f"Success rate: {metrics.success_rate:.2f}%",
                )

            # Check response time
            if metrics.p95_response_time > self.sla_targets["response_time_p95"]:
                await self._create_alert(
                    server_name=server_name,
                    severity=AlertSeverity.WARNING,
                    title=f"High response time for {server_name}",
                    description=f"P95 response time: {metrics.p95_response_time:.2f}ms",
                )

            # Check error rate
            if metrics.error_rate > self.sla_targets["error_rate"]:
                await self._create_alert(
                    server_name=server_name,
                    severity=AlertSeverity.ERROR,
                    title=f"High error rate for {server_name}",
                    description=f"Error rate: {metrics.error_rate:.2f}%",
                )

    async def _create_alert(
        self,
        server_name: str,
        severity: AlertSeverity,
        title: str,
        description: str,
        metadata: Optional[Dict[str, Any]] = None,
    ):
        """Create and manage alerts with cooldown."""
        alert_key = f"{server_name}:{title}"

        # Check cooldown
        if alert_key in self.alert_cooldowns:
            if datetime.now() < self.alert_cooldowns[alert_key]:
                return

        # Create alert
        alert = Alert(
            alert_id=f"alert_{int(time.time()*1000)}",
            server_name=server_name,
            severity=severity,
            title=title,
            description=description,
            timestamp=datetime.now(),
            metadata=metadata or {},
        )

        # Store alert
        self.active_alerts[alert.alert_id] = alert
        self.alert_history.append(alert)

        # Set cooldown
        self.alert_cooldowns[alert_key] = datetime.now() + timedelta(
            seconds=self.alert_cooldown
        )

        # Update Prometheus metrics
        if self.enable_prometheus:
            active_by_severity = defaultdict(int)
            for a in self.active_alerts.values():
                if not a.resolved:
                    active_by_severity[a.severity.value] += 1

            for sev in AlertSeverity:
                self.prom_active_alerts.labels(severity=sev.value).set(
                    active_by_severity[sev.value]
                )

        # Send alert notification
        await self._send_alert_notification(alert)

        logger.warning(f"Alert created: {alert.title}")

    async def _send_alert_notification(self, alert: Alert):
        """Send alert notifications to configured channels."""
        # This would integrate with enterprise alerting systems
        # (PagerDuty, Slack, email, etc.)
        pass

    async def _sla_tracking_loop(self):
        """Track SLA compliance."""
        while not self._shutdown:
            try:
                sla_report = await self._generate_sla_report()
                logger.info(f"SLA Report: {json.dumps(sla_report, indent=2)}")

                await asyncio.sleep(300)  # Report every 5 minutes

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in SLA tracking: {e}")
                await asyncio.sleep(30)

    async def _generate_sla_report(self) -> Dict[str, Any]:
        """Generate SLA compliance report."""
        report = {
            "timestamp": datetime.now().isoformat(),
            "servers": {},
            "overall": {"availability": 0, "avg_response_time": 0, "error_rate": 0},
        }

        total_availability = 0
        total_response_time = 0
        total_error_rate = 0
        server_count = len(self.servers)

        for server_name, metrics in self.servers.items():
            # Calculate availability
            health_checks = list(self.health_history[server_name])
            if health_checks:
                healthy_checks = sum(
                    1 for hc in health_checks if hc.status == HealthStatus.HEALTHY
                )
                availability = (healthy_checks / len(health_checks)) * 100
            else:
                availability = 0

            server_report = {
                "availability": availability,
                "avg_response_time": metrics.avg_response_time,
                "p95_response_time": metrics.p95_response_time,
                "p99_response_time": metrics.p99_response_time,
                "success_rate": metrics.success_rate,
                "error_rate": metrics.error_rate,
                "sla_compliance": {
                    "availability": availability >= self.sla_targets["availability"],
                    "response_time": metrics.p95_response_time
                    <= self.sla_targets["response_time_p95"],
                    "error_rate": metrics.error_rate <= self.sla_targets["error_rate"],
                },
            }

            report["servers"][server_name] = server_report

            total_availability += availability
            total_response_time += metrics.avg_response_time
            total_error_rate += metrics.error_rate

        if server_count > 0:
            report["overall"]["availability"] = total_availability / server_count
            report["overall"]["avg_response_time"] = total_response_time / server_count
            report["overall"]["error_rate"] = total_error_rate / server_count

        return report

    async def record_request(
        self,
        server_name: str,
        operation: str,
        success: bool,
        response_time_ms: float,
        error: Optional[str] = None,
    ):
        """
        Record a request metric.

        Args:
            server_name: Name of the server
            operation: Operation performed
            success: Whether request was successful
            response_time_ms: Response time in milliseconds
            error: Error message if failed
        """
        if server_name not in self.servers:
            self.servers[server_name] = ServerMetrics(
                server_name=server_name, timestamp=datetime.now()
            )

        metrics = self.servers[server_name]

        # Update metrics
        metrics.total_requests += 1
        metrics.response_times.append(response_time_ms)

        if success:
            metrics.success_count += 1
        else:
            metrics.error_count += 1
            metrics.last_error = error
            metrics.last_error_time = datetime.now()

        # Update Prometheus metrics
        if self.enable_prometheus:
            status = "success" if success else "error"
            self.prom_request_total.labels(server=server_name, status=status).inc()
            self.prom_request_duration.labels(
                server=server_name, operation=operation
            ).observe(response_time_ms / 1000)

    def get_server_status(self, server_name: str) -> Optional[HealthStatus]:
        """Get current health status of a server."""
        health_checks = list(self.health_history[server_name])
        if not health_checks:
            return HealthStatus.UNKNOWN

        return health_checks[-1].status

    def get_metrics_summary(self) -> Dict[str, Any]:
        """Get summary of all server metrics."""
        summary = {"timestamp": datetime.now().isoformat(), "servers": {}}

        for server_name, metrics in self.servers.items():
            summary["servers"][server_name] = {
                "status": self.get_server_status(server_name).value,
                "success_rate": metrics.success_rate,
                "avg_response_time": metrics.avg_response_time,
                "p95_response_time": metrics.p95_response_time,
                "error_rate": metrics.error_rate,
                "total_requests": metrics.total_requests,
            }

        return summary

    def get_active_alerts(self) -> List[Alert]:
        """Get all active (unresolved) alerts."""
        return [alert for alert in self.active_alerts.values() if not alert.resolved]

    async def resolve_alert(self, alert_id: str):
        """Mark an alert as resolved."""
        if alert_id in self.active_alerts:
            alert = self.active_alerts[alert_id]
            alert.resolved = True
            alert.resolved_at = datetime.now()
            logger.info(f"Alert resolved: {alert.title}")

    def export_prometheus_metrics(self) -> bytes:
        """Export metrics in Prometheus format."""
        if not self.enable_prometheus:
            return b""

        return generate_latest()


# Monitoring context manager for automatic metric recording
@asynccontextmanager
async def monitor_operation(monitor: MCPMonitor, server_name: str, operation: str):
    """
    Context manager for monitoring MCP operations.

    Usage:
        async with monitor_operation(monitor, "fraud_database", "query"):
            # Perform operation
            result = await query_database()
    """
    start_time = time.time()
    error = None
    success = True

    try:
        yield
    except Exception as e:
        error = str(e)
        success = False
        raise
    finally:
        response_time = (time.time() - start_time) * 1000
        await monitor.record_request(
            server_name=server_name,
            operation=operation,
            success=success,
            response_time_ms=response_time,
            error=error,
        )


# Global monitor instance
_monitor: Optional[MCPMonitor] = None


def get_mcp_monitor() -> MCPMonitor:
    """Get the global MCP monitor instance."""
    global _monitor
    if _monitor is None:
        _monitor = MCPMonitor()
    return _monitor
