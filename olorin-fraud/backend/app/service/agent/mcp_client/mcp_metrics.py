"""MCP Performance Metrics and Monitoring System."""

import asyncio
import json
import threading
import time
from collections import defaultdict, deque
from contextlib import contextmanager
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Counter, DefaultDict, Dict, List, Optional

import psutil

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class MetricType(Enum):
    """Types of metrics."""

    COUNTER = "counter"
    GAUGE = "gauge"
    HISTOGRAM = "histogram"
    TIMER = "timer"


@dataclass
class MetricValue:
    """Individual metric value."""

    value: float
    timestamp: float = field(default_factory=time.time)
    labels: Dict[str, str] = field(default_factory=dict)


@dataclass
class TimerContext:
    """Context for timing operations."""

    start_time: float
    metric_name: str
    labels: Dict[str, str]
    metrics_collector: "MCPMetricsCollector"


class MCPMetricsCollector:
    """Advanced metrics collection system for MCP operations."""

    def __init__(self, max_history_size: int = 1000):
        """Initialize metrics collector."""
        self.max_history_size = max_history_size

        # Metrics storage
        self.counters: DefaultDict[str, float] = defaultdict(float)
        self.gauges: Dict[str, float] = {}
        self.histograms: DefaultDict[str, deque] = defaultdict(
            lambda: deque(maxlen=max_history_size)
        )
        self.timers: DefaultDict[str, deque] = defaultdict(
            lambda: deque(maxlen=max_history_size)
        )

        # Labels for metrics
        self.metric_labels: Dict[str, Dict[str, str]] = {}

        # Performance tracking
        self.request_counts: DefaultDict[str, int] = defaultdict(int)
        self.error_counts: DefaultDict[str, int] = defaultdict(int)
        self.response_times: DefaultDict[str, deque] = defaultdict(
            lambda: deque(maxlen=max_history_size)
        )

        # System metrics
        self.system_metrics: Dict[str, Any] = {}

        # Thread safety
        self._lock = threading.Lock()

        # Background collection task
        self._collection_task: Optional[asyncio.Task] = None
        self._collecting = False

    async def start_collection(self, interval: float = 10.0) -> None:
        """Start background metrics collection."""
        if self._collecting:
            return

        logger.info("Starting MCP metrics collection")
        self._collecting = True
        self._collection_task = asyncio.create_task(self._collection_loop(interval))

    async def stop_collection(self) -> None:
        """Stop background metrics collection."""
        if not self._collecting:
            return

        logger.info("Stopping MCP metrics collection")
        self._collecting = False

        if self._collection_task:
            self._collection_task.cancel()
            try:
                await self._collection_task
            except asyncio.CancelledError:
                pass

    def increment_counter(
        self, name: str, value: float = 1.0, labels: Optional[Dict[str, str]] = None
    ) -> None:
        """Increment a counter metric."""
        with self._lock:
            metric_key = self._get_metric_key(name, labels)
            self.counters[metric_key] += value
            if labels:
                self.metric_labels[metric_key] = labels

    def set_gauge(
        self, name: str, value: float, labels: Optional[Dict[str, str]] = None
    ) -> None:
        """Set a gauge metric."""
        with self._lock:
            metric_key = self._get_metric_key(name, labels)
            self.gauges[metric_key] = value
            if labels:
                self.metric_labels[metric_key] = labels

    def record_histogram(
        self, name: str, value: float, labels: Optional[Dict[str, str]] = None
    ) -> None:
        """Record a value in a histogram."""
        with self._lock:
            metric_key = self._get_metric_key(name, labels)
            self.histograms[metric_key].append(MetricValue(value, labels=labels or {}))
            if labels:
                self.metric_labels[metric_key] = labels

    def record_timer(
        self, name: str, duration: float, labels: Optional[Dict[str, str]] = None
    ) -> None:
        """Record a timing measurement."""
        with self._lock:
            metric_key = self._get_metric_key(name, labels)
            self.timers[metric_key].append(MetricValue(duration, labels=labels or {}))
            if labels:
                self.metric_labels[metric_key] = labels

    @contextmanager
    def timer(self, name: str, labels: Optional[Dict[str, str]] = None):
        """Context manager for timing operations."""
        start_time = time.perf_counter()
        try:
            yield
        finally:
            duration = time.perf_counter() - start_time
            self.record_timer(name, duration, labels)

    def track_request(
        self,
        server_name: str,
        operation: str,
        success: bool = True,
        response_time: Optional[float] = None,
    ) -> None:
        """Track a request to an MCP server."""
        labels = {"server": server_name, "operation": operation}

        # Increment request counter
        self.increment_counter("mcp_requests_total", labels=labels)

        # Track success/failure
        if success:
            self.increment_counter("mcp_requests_success", labels=labels)
        else:
            self.increment_counter("mcp_requests_error", labels=labels)
            self.error_counts[server_name] += 1

        # Track response time
        if response_time is not None:
            self.record_timer("mcp_request_duration", response_time, labels)
            self.response_times[server_name].append(response_time)

        # Track per-server requests
        self.request_counts[server_name] += 1

    def track_connection(self, server_name: str, action: str) -> None:
        """Track connection events."""
        labels = {"server": server_name, "action": action}
        self.increment_counter("mcp_connections", labels=labels)

    def track_cache_operation(self, operation: str, hit: bool = False) -> None:
        """Track cache operations."""
        labels = {"operation": operation, "result": "hit" if hit else "miss"}
        self.increment_counter("mcp_cache_operations", labels=labels)

    def track_circuit_breaker(self, server_name: str, state: str) -> None:
        """Track circuit breaker state changes."""
        labels = {"server": server_name, "state": state}
        self.increment_counter("mcp_circuit_breaker_transitions", labels=labels)
        self.set_gauge(
            "mcp_circuit_breaker_state",
            1.0 if state == "open" else 0.0,
            {"server": server_name},
        )

    async def _collection_loop(self, interval: float) -> None:
        """Background loop for collecting system metrics."""
        while self._collecting:
            try:
                await self._collect_system_metrics()
                await asyncio.sleep(interval)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in metrics collection loop: {e}")
                await asyncio.sleep(5)

    async def _collect_system_metrics(self) -> None:
        """Collect system-level metrics."""
        try:
            # CPU usage
            cpu_percent = psutil.cpu_percent()
            self.set_gauge("system_cpu_usage_percent", cpu_percent)

            # Memory usage
            memory = psutil.virtual_memory()
            self.set_gauge("system_memory_usage_percent", memory.percent)
            self.set_gauge("system_memory_available_bytes", memory.available)

            # Disk usage
            disk = psutil.disk_usage("/")
            self.set_gauge("system_disk_usage_percent", disk.percent)
            self.set_gauge("system_disk_free_bytes", disk.free)

            # Network I/O
            network = psutil.net_io_counters()
            self.set_gauge("system_network_bytes_sent", network.bytes_sent)
            self.set_gauge("system_network_bytes_recv", network.bytes_recv)

            # Process info
            process = psutil.Process()
            self.set_gauge("process_memory_rss_bytes", process.memory_info().rss)
            self.set_gauge("process_cpu_percent", process.cpu_percent())
            self.set_gauge("process_num_threads", process.num_threads())

        except Exception as e:
            logger.error(f"Failed to collect system metrics: {e}")

    def _get_metric_key(self, name: str, labels: Optional[Dict[str, str]]) -> str:
        """Generate metric key with labels."""
        if not labels:
            return name

        label_str = ",".join(f"{k}={v}" for k, v in sorted(labels.items()))
        return f"{name}{{{label_str}}}"

    def get_counter_value(
        self, name: str, labels: Optional[Dict[str, str]] = None
    ) -> float:
        """Get counter value."""
        with self._lock:
            metric_key = self._get_metric_key(name, labels)
            return self.counters.get(metric_key, 0.0)

    def get_gauge_value(
        self, name: str, labels: Optional[Dict[str, str]] = None
    ) -> Optional[float]:
        """Get gauge value."""
        with self._lock:
            metric_key = self._get_metric_key(name, labels)
            return self.gauges.get(metric_key)

    def get_histogram_stats(
        self, name: str, labels: Optional[Dict[str, str]] = None
    ) -> Dict[str, float]:
        """Get histogram statistics."""
        with self._lock:
            metric_key = self._get_metric_key(name, labels)
            values = [v.value for v in self.histograms.get(metric_key, [])]

            if not values:
                return {}

            sorted_values = sorted(values)
            n = len(sorted_values)

            return {
                "count": n,
                "sum": sum(values),
                "mean": sum(values) / n,
                "min": min(values),
                "max": max(values),
                "p50": sorted_values[int(0.5 * n)] if n > 0 else 0,
                "p90": sorted_values[int(0.9 * n)] if n > 0 else 0,
                "p95": sorted_values[int(0.95 * n)] if n > 0 else 0,
                "p99": sorted_values[int(0.99 * n)] if n > 0 else 0,
            }

    def get_timer_stats(
        self, name: str, labels: Optional[Dict[str, str]] = None
    ) -> Dict[str, float]:
        """Get timer statistics."""
        with self._lock:
            metric_key = self._get_metric_key(name, labels)
            durations = [v.value for v in self.timers.get(metric_key, [])]

            if not durations:
                return {}

            sorted_durations = sorted(durations)
            n = len(sorted_durations)

            return {
                "count": n,
                "sum": sum(durations),
                "mean": sum(durations) / n,
                "min": min(durations),
                "max": max(durations),
                "p50": sorted_durations[int(0.5 * n)] if n > 0 else 0,
                "p90": sorted_durations[int(0.9 * n)] if n > 0 else 0,
                "p95": sorted_durations[int(0.95 * n)] if n > 0 else 0,
                "p99": sorted_durations[int(0.99 * n)] if n > 0 else 0,
            }

    def get_server_stats(self, server_name: str) -> Dict[str, Any]:
        """Get comprehensive statistics for a specific server."""
        with self._lock:
            total_requests = self.request_counts.get(server_name, 0)
            error_count = self.error_counts.get(server_name, 0)
            response_times = list(self.response_times.get(server_name, []))

            stats = {
                "total_requests": total_requests,
                "error_count": error_count,
                "success_rate": (
                    (total_requests - error_count) / total_requests
                    if total_requests > 0
                    else 0
                ),
                "error_rate": error_count / total_requests if total_requests > 0 else 0,
            }

            if response_times:
                sorted_times = sorted(response_times)
                n = len(sorted_times)
                stats.update(
                    {
                        "response_time_mean": sum(response_times) / n,
                        "response_time_min": min(response_times),
                        "response_time_max": max(response_times),
                        "response_time_p50": sorted_times[int(0.5 * n)],
                        "response_time_p95": sorted_times[int(0.95 * n)],
                        "response_time_p99": sorted_times[int(0.99 * n)],
                    }
                )

            return stats

    def get_all_metrics(self) -> Dict[str, Any]:
        """Get all collected metrics."""
        with self._lock:
            metrics = {
                "counters": dict(self.counters),
                "gauges": dict(self.gauges),
                "histograms": {},
                "timers": {},
                "server_stats": {},
                "timestamp": time.time(),
            }

            # Process histograms
            for name, values in self.histograms.items():
                metrics["histograms"][name] = self.get_histogram_stats(name)

            # Process timers
            for name, values in self.timers.items():
                metrics["timers"][name] = self.get_timer_stats(name)

            # Process server stats
            for server_name in set(
                list(self.request_counts.keys()) + list(self.error_counts.keys())
            ):
                metrics["server_stats"][server_name] = self.get_server_stats(
                    server_name
                )

            return metrics

    def export_prometheus_format(self) -> str:
        """Export metrics in Prometheus format."""
        lines = []

        with self._lock:
            # Export counters
            for metric_key, value in self.counters.items():
                if "{" in metric_key:
                    name = metric_key.split("{")[0]
                    labels = metric_key.split("{")[1].rstrip("}")
                    lines.append(f"# TYPE {name} counter")
                    lines.append(f"{name}{{{labels}}} {value}")
                else:
                    lines.append(f"# TYPE {metric_key} counter")
                    lines.append(f"{metric_key} {value}")

            # Export gauges
            for metric_key, value in self.gauges.items():
                if "{" in metric_key:
                    name = metric_key.split("{")[0]
                    labels = metric_key.split("{")[1].rstrip("}")
                    lines.append(f"# TYPE {name} gauge")
                    lines.append(f"{name}{{{labels}}} {value}")
                else:
                    lines.append(f"# TYPE {metric_key} gauge")
                    lines.append(f"{metric_key} {value}")

            # Export histograms (simplified)
            for metric_key, values in self.histograms.items():
                if values:
                    stats = self.get_histogram_stats(metric_key)
                    name = metric_key.split("{")[0] if "{" in metric_key else metric_key

                    lines.append(f"# TYPE {name} histogram")
                    for stat_name, stat_value in stats.items():
                        lines.append(f"{name}_{stat_name} {stat_value}")

        return "\n".join(lines)

    def reset_metrics(self) -> None:
        """Reset all metrics (for testing purposes)."""
        with self._lock:
            self.counters.clear()
            self.gauges.clear()
            self.histograms.clear()
            self.timers.clear()
            self.metric_labels.clear()
            self.request_counts.clear()
            self.error_counts.clear()
            self.response_times.clear()


# Global metrics collector instance
mcp_metrics = MCPMetricsCollector()
