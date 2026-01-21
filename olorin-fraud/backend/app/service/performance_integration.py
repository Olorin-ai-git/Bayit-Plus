import asyncio
import time
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Union

from app.service.logging import get_bridge_logger

try:
    import redis.asyncio as redis
except ImportError:
    # Fallback for older Redis versions
    import aioredis as redis

import threading
import weakref
from contextlib import asynccontextmanager

import psutil

logger = get_bridge_logger(__name__)


@dataclass
class PerformanceOptimizationConfig:
    database_url: str = "sqlite:///olorin_fraud_detection.db"
    redis_host: str = "localhost"
    redis_port: int = 6379
    max_parallel_agents: int = 8
    enable_alerts: bool = False
    cache_ttl_seconds: int = 300
    max_memory_mb: int = 256
    connection_pool_size: int = 20
    enable_compression: bool = True
    monitoring_interval_seconds: int = 30


@dataclass
class PerformanceMetrics:
    timestamp: datetime = field(default_factory=datetime.now)
    cpu_usage_percent: float = 0.0
    memory_usage_mb: float = 0.0
    memory_usage_percent: float = 0.0
    active_connections: int = 0
    cache_hit_rate: float = 0.0
    cache_size_mb: float = 0.0
    avg_response_time_ms: float = 0.0
    requests_per_minute: int = 0
    active_agents: int = 0
    agent_queue_size: int = 0
    database_connections: int = 0
    websocket_connections: int = 0


class PerformanceMonitor:
    """Real-time performance monitoring and alerting system."""

    def __init__(self, config: PerformanceOptimizationConfig):
        self.config = config
        self.metrics_history: List[PerformanceMetrics] = []
        self.running = False
        self.monitor_task: Optional[asyncio.Task] = None
        self.alert_callbacks: List[callable] = []

    async def start_monitoring(self):
        """Start performance monitoring."""
        if self.running:
            return

        self.running = True
        self.monitor_task = asyncio.create_task(self._monitoring_loop())
        logger.debug("Performance monitoring started")

    async def stop_monitoring(self):
        """Stop performance monitoring."""
        self.running = False
        if self.monitor_task:
            self.monitor_task.cancel()
            try:
                await self.monitor_task
            except asyncio.CancelledError:
                pass
        logger.debug("Performance monitoring stopped")

    async def _monitoring_loop(self):
        """Main monitoring loop."""
        while self.running:
            try:
                metrics = await self.collect_metrics()
                self.metrics_history.append(metrics)

                # Keep only last 100 metrics (roughly 50 minutes at 30s intervals)
                if len(self.metrics_history) > 100:
                    self.metrics_history = self.metrics_history[-100:]

                # Check for performance alerts
                if self.config.enable_alerts:
                    await self._check_alerts(metrics)

                await asyncio.sleep(self.config.monitoring_interval_seconds)

            except Exception as e:
                logger.error(f"Performance monitoring error: {e}")
                await asyncio.sleep(self.config.monitoring_interval_seconds)

    async def collect_metrics(self) -> PerformanceMetrics:
        """Collect current performance metrics."""
        try:
            process = psutil.Process()
            system = psutil.virtual_memory()

            metrics = PerformanceMetrics(
                cpu_usage_percent=process.cpu_percent(),
                memory_usage_mb=process.memory_info().rss / 1024 / 1024,
                memory_usage_percent=(process.memory_info().rss / system.total) * 100,
                active_connections=len(process.net_connections()),
            )

            # Get cache metrics if available
            cache_manager = getattr(_perf_manager, "cache_manager", None)
            if cache_manager:
                cache_stats = cache_manager.get_statistics()
                metrics.cache_hit_rate = cache_stats.get("performance", {}).get(
                    "hit_rate", 0.0
                )
                metrics.cache_size_mb = (
                    cache_stats.get("capacity", {}).get("total_size_bytes", 0)
                    / 1024
                    / 1024
                )

            return metrics

        except Exception as e:
            logger.error(f"Failed to collect performance metrics: {e}")
            return PerformanceMetrics()

    async def _check_alerts(self, metrics: PerformanceMetrics):
        """Check for performance alerts."""
        alerts = []

        if metrics.memory_usage_percent > 80:
            alerts.append(f"High memory usage: {metrics.memory_usage_percent:.1f}%")

        if metrics.cpu_usage_percent > 85:
            alerts.append(f"High CPU usage: {metrics.cpu_usage_percent:.1f}%")

        if metrics.cache_hit_rate < 0.7 and metrics.cache_hit_rate > 0:
            alerts.append(f"Low cache hit rate: {metrics.cache_hit_rate:.1%}")

        if metrics.avg_response_time_ms > 1000:
            alerts.append(f"High response time: {metrics.avg_response_time_ms:.0f}ms")

        for alert in alerts:
            logger.warning(f"Performance Alert: {alert}")
            for callback in self.alert_callbacks:
                try:
                    await callback(alert, metrics)
                except Exception as e:
                    logger.error(f"Alert callback error: {e}")

    def add_alert_callback(self, callback: callable):
        """Add performance alert callback."""
        self.alert_callbacks.append(callback)

    def get_current_metrics(self) -> Optional[PerformanceMetrics]:
        """Get most recent performance metrics."""
        return self.metrics_history[-1] if self.metrics_history else None

    def get_metrics_history(self, minutes: int = 30) -> List[PerformanceMetrics]:
        """Get performance metrics history."""
        cutoff = datetime.now() - timedelta(minutes=minutes)
        return [m for m in self.metrics_history if m.timestamp >= cutoff]


class ConnectionPoolManager:
    """Manages database and Redis connection pools for optimal performance."""

    def __init__(self, config: PerformanceOptimizationConfig):
        self.config = config
        self.redis_pool: Optional[redis.ConnectionPool] = None
        self.db_connections: weakref.WeakSet = weakref.WeakSet()

    async def initialize_redis_pool(self) -> bool:
        """Initialize Redis connection pool."""
        try:
            logger.debug(
                f"Attempting to connect to Redis at {self.config.redis_host}:{self.config.redis_port}..."
            )

            self.redis_pool = redis.ConnectionPool(
                host=self.config.redis_host,
                port=self.config.redis_port,
                max_connections=self.config.connection_pool_size,
                decode_responses=True,
                socket_timeout=2,  # Reduced timeout for faster failure
                socket_connect_timeout=2,  # Reduced timeout for faster failure
                retry_on_timeout=False,  # Don't retry to avoid hanging
                health_check_interval=30,
            )

            # Test connection with timeout protection
            redis_client = redis.Redis(connection_pool=self.redis_pool)

            # Use asyncio.wait_for to enforce absolute timeout
            await asyncio.wait_for(redis_client.ping(), timeout=3.0)
            await redis_client.aclose()

            logger.debug(
                f"✅ Redis connection pool initialized ({self.config.connection_pool_size} connections)"
            )
            return True

        except asyncio.TimeoutError:
            logger.debug(
                "⏰ Redis connection timeout - continuing without Redis caching"
            )
            self.redis_pool = None
            return False
        except Exception as e:
            logger.debug(
                f"❌ Redis not available, continuing without Redis caching: {e}"
            )
            self.redis_pool = None
            return False

    async def get_redis_client(self) -> Optional[redis.Redis]:
        """Get Redis client from pool."""
        if not self.redis_pool:
            return None
        return redis.Redis(connection_pool=self.redis_pool)

    async def close_redis_pool(self):
        """Close Redis connection pool."""
        if self.redis_pool:
            await self.redis_pool.disconnect()
            self.redis_pool = None
            logger.debug("Redis connection pool closed")


class PerformanceOptimizationManager:
    """Main performance optimization manager with comprehensive features."""

    def __init__(self, config: PerformanceOptimizationConfig):
        self.config = config
        self.initialized = False
        self.start_time = datetime.now()

        # Initialize components
        self.monitor = PerformanceMonitor(config)
        self.connection_manager = ConnectionPoolManager(config)
        self.cache_manager = None  # Will be initialized from enhanced_cache

        # Performance tracking
        self.request_times: List[float] = []
        self.request_count = 0
        self.error_count = 0

    async def initialize(self) -> Dict[str, Any]:
        """Initialize performance optimization system."""
        try:
            logger.debug("Initializing performance optimization system...")

            # Initialize Redis connection pool
            redis_initialized = await self.connection_manager.initialize_redis_pool()

            # Initialize cache manager with Redis if available
            await self._initialize_cache_system(redis_initialized)

            # Start performance monitoring
            if self.config.enable_alerts:
                await self.monitor.start_monitoring()

            self.initialized = True

            result = {
                "status": "success",
                "components": {
                    "redis_pool": redis_initialized,
                    "cache_system": self.cache_manager is not None,
                    "performance_monitoring": self.config.enable_alerts,
                    "connection_pooling": True,
                },
                "target_improvements": {
                    "api_latency": {
                        "target_improvement": "-40%",
                        "target_time_ms": 200,
                    },
                    "agent_execution": {
                        "target_improvement": "-50%",
                        "target_time_ms": 1000,
                    },
                    "cache_hit_rate": {
                        "target_improvement": "+200%",
                        "target_rate": 0.85,
                    },
                    "memory_usage": {"target_improvement": "-25%", "target_mb": 256},
                    "throughput": {"target_improvement": "+100%", "target_rpm": 2000},
                },
                "configuration": {
                    "redis_host": self.config.redis_host,
                    "redis_port": self.config.redis_port,
                    "max_parallel_agents": self.config.max_parallel_agents,
                    "cache_ttl_seconds": self.config.cache_ttl_seconds,
                    "max_memory_mb": self.config.max_memory_mb,
                    "connection_pool_size": self.config.connection_pool_size,
                },
                "timestamp": datetime.now().isoformat(),
            }

            logger.debug("Performance optimization system initialized successfully")
            return result

        except Exception as e:
            logger.error(f"Failed to initialize performance optimization system: {e}")
            return {
                "status": "failed",
                "error": str(e),
                "timestamp": datetime.now().isoformat(),
            }

    async def _initialize_cache_system(self, redis_available: bool):
        """Initialize the cache system."""
        try:
            # Import enhanced cache system
            from .agent.tools.enhanced_cache import EnhancedCache, EvictionPolicy

            # Get Redis client if available
            redis_client = None
            if redis_available:
                redis_client = await self.connection_manager.get_redis_client()

            # Initialize cache with configuration
            self.cache_manager = EnhancedCache(
                max_size=10000,
                max_memory_mb=self.config.max_memory_mb,
                default_ttl_seconds=self.config.cache_ttl_seconds,
                eviction_policy=EvictionPolicy.LRU,
                cleanup_interval_seconds=60,
                enable_content_deduplication=True,
                enable_compression=self.config.enable_compression,
                redis_client=redis_client,
            )

            logger.debug("Cache system initialized successfully")

        except Exception as e:
            logger.error(f"Failed to initialize cache system: {e}")
            self.cache_manager = None

    async def shutdown(self) -> Dict[str, Any]:
        """Shutdown performance optimization system."""
        try:
            logger.debug("Shutting down performance optimization system...")

            # Stop monitoring
            if self.monitor:
                await self.monitor.stop_monitoring()

            # Close connection pools
            if self.connection_manager:
                await self.connection_manager.close_redis_pool()

            # Clean up cache
            if self.cache_manager:
                await self.cache_manager.clear()

            uptime = datetime.now() - self.start_time

            result = {
                "status": "success",
                "uptime_seconds": int(uptime.total_seconds()),
                "final_metrics": {
                    "total_requests": self.request_count,
                    "total_errors": self.error_count,
                    "avg_response_time_ms": (
                        sum(self.request_times[-100:]) / len(self.request_times[-100:])
                        if self.request_times
                        else 0
                    ),
                    "error_rate": (self.error_count / max(1, self.request_count)) * 100,
                },
                "timestamp": datetime.now().isoformat(),
            }

            logger.debug("Performance optimization system shutdown completed")
            return result

        except Exception as e:
            logger.error(f"Error during performance system shutdown: {e}")
            return {
                "status": "error",
                "error": str(e),
                "timestamp": datetime.now().isoformat(),
            }

    @asynccontextmanager
    async def track_request_performance(self, operation_name: str = "request"):
        """Context manager to track request performance."""
        start_time = time.time()
        try:
            yield

            # Track successful request
            duration_ms = (time.time() - start_time) * 1000
            self.request_times.append(duration_ms)
            self.request_count += 1

            # Keep only last 1000 request times
            if len(self.request_times) > 1000:
                self.request_times = self.request_times[-1000:]

        except Exception as e:
            # Track error
            self.error_count += 1
            logger.error(f"Request error in {operation_name}: {e}")
            raise

    def get_performance_stats(self) -> Dict[str, Any]:
        """Get comprehensive performance statistics."""
        current_metrics = self.monitor.get_current_metrics()
        uptime = datetime.now() - self.start_time

        recent_times = self.request_times[-100:] if self.request_times else []

        return {
            "system": {
                "uptime_seconds": int(uptime.total_seconds()),
                "initialized": self.initialized,
                "redis_available": self.connection_manager.redis_pool is not None,
                "cache_available": self.cache_manager is not None,
            },
            "requests": {
                "total_count": self.request_count,
                "error_count": self.error_count,
                "error_rate": (self.error_count / max(1, self.request_count)) * 100,
                "avg_response_time_ms": (
                    sum(recent_times) / len(recent_times) if recent_times else 0
                ),
                "min_response_time_ms": min(recent_times) if recent_times else 0,
                "max_response_time_ms": max(recent_times) if recent_times else 0,
            },
            "current_metrics": current_metrics.__dict__ if current_metrics else {},
            "cache_stats": (
                self.cache_manager.get_statistics() if self.cache_manager else {}
            ),
            "timestamp": datetime.now().isoformat(),
        }

    async def optimize_agent_execution(self, agent_func: callable, *args, **kwargs):
        """Optimize agent execution with caching and performance tracking."""
        if not self.cache_manager:
            # No caching available, execute directly
            async with self.track_request_performance("agent_execution"):
                return await agent_func(*args, **kwargs)

        # Generate cache key from function name and arguments
        cache_key = f"agent:{agent_func.__name__}:{hash(str(args) + str(sorted(kwargs.items())))}"

        # Try to get from cache first
        cached_result = await self.cache_manager.get(cache_key)
        if cached_result is not None:
            logger.debug(f"Agent result retrieved from cache: {agent_func.__name__}")
            return cached_result

        # Execute agent and cache result
        async with self.track_request_performance("agent_execution"):
            result = await agent_func(*args, **kwargs)

            # Cache the result
            await self.cache_manager.set(
                cache_key,
                result,
                ttl_seconds=self.config.cache_ttl_seconds,
                tags={f"agent:{agent_func.__name__}"},
            )

            return result


# Global performance manager instance
_perf_manager: Optional[PerformanceOptimizationManager] = None


async def initialize_performance_optimization_system(
    config: PerformanceOptimizationConfig,
) -> Dict[str, Any]:
    """Initialize the global performance optimization system."""
    global _perf_manager

    if _perf_manager is None:
        _perf_manager = PerformanceOptimizationManager(config)

    return await _perf_manager.initialize()


def get_performance_optimization_manager() -> Optional[PerformanceOptimizationManager]:
    """Get the global performance optimization manager."""
    return _perf_manager
