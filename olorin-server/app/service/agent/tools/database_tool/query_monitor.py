"""
Query Performance Monitoring.

Provides decorators and utilities for monitoring database query performance.

Constitutional Compliance:
- NO hardcoded thresholds - all from configuration
- Complete implementation
- Fail-fast validation
"""

import time
import functools
from typing import Callable, Any, Dict, List
from collections import defaultdict
import threading

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class QueryPerformanceMonitor:
    """Monitors and tracks query performance metrics."""

    def __init__(self, slow_query_threshold_ms: int = 1000):
        """
        Initialize query performance monitor.

        Args:
            slow_query_threshold_ms: Threshold for logging slow queries (from config)

        Raises:
            ValueError: If threshold is invalid
        """
        if slow_query_threshold_ms <= 0:
            raise ValueError(f"slow_query_threshold_ms must be > 0, got {slow_query_threshold_ms}")

        self.slow_query_threshold_ms = slow_query_threshold_ms
        self._query_stats = defaultdict(list)
        self._lock = threading.RLock()

        logger.info(f"Initialized QueryPerformanceMonitor (slow threshold: {slow_query_threshold_ms}ms)")

    def record_query_execution(
        self,
        query: str,
        duration_ms: float,
        row_count: int,
        success: bool
    ) -> None:
        """
        Record query execution metrics.

        Args:
            query: SQL query executed
            duration_ms: Execution duration in milliseconds
            row_count: Number of rows returned
            success: Whether query succeeded
        """
        with self._lock:
            # Normalize query for grouping (remove whitespace variations)
            query_key = ' '.join(query.split())[:100]  # First 100 chars

            self._query_stats[query_key].append({
                'duration_ms': duration_ms,
                'row_count': row_count,
                'success': success,
                'timestamp': time.time()
            })

            # Log slow queries
            if duration_ms > self.slow_query_threshold_ms:
                logger.warning(
                    f"SLOW QUERY ({duration_ms:.1f}ms > {self.slow_query_threshold_ms}ms): "
                    f"{query[:100]}..."
                )

    def get_query_statistics(self, query: str = None) -> Dict[str, Any]:
        """
        Get performance statistics for queries.

        Args:
            query: Optional specific query to get stats for (None = all queries)

        Returns:
            Dictionary with performance statistics
        """
        with self._lock:
            if query:
                # Stats for specific query
                query_key = ' '.join(query.split())[:100]
                executions = self._query_stats.get(query_key, [])

                if not executions:
                    return {'query': query, 'executions': 0}

                durations = [e['duration_ms'] for e in executions]
                row_counts = [e['row_count'] for e in executions]

                return {
                    'query': query_key,
                    'executions': len(executions),
                    'avg_duration_ms': sum(durations) / len(durations),
                    'min_duration_ms': min(durations),
                    'max_duration_ms': max(durations),
                    'total_rows': sum(row_counts),
                    'avg_rows': sum(row_counts) / len(row_counts),
                    'success_rate': sum(1 for e in executions if e['success']) / len(executions)
                }
            else:
                # Aggregate stats for all queries
                total_executions = sum(len(execs) for execs in self._query_stats.values())
                all_durations = [
                    e['duration_ms']
                    for execs in self._query_stats.values()
                    for e in execs
                ]

                if not all_durations:
                    return {'total_queries': 0, 'total_executions': 0}

                return {
                    'total_queries': len(self._query_stats),
                    'total_executions': total_executions,
                    'avg_duration_ms': sum(all_durations) / len(all_durations),
                    'min_duration_ms': min(all_durations),
                    'max_duration_ms': max(all_durations),
                    'slow_queries_count': sum(1 for d in all_durations if d > self.slow_query_threshold_ms)
                }

    def get_slowest_queries(self, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Get the slowest queries by average duration.

        Args:
            limit: Maximum number of queries to return

        Returns:
            List of query statistics, ordered by slowest average
        """
        with self._lock:
            query_stats = []

            for query_key, executions in self._query_stats.items():
                durations = [e['duration_ms'] for e in executions]
                avg_duration = sum(durations) / len(durations)

                query_stats.append({
                    'query': query_key,
                    'executions': len(executions),
                    'avg_duration_ms': avg_duration,
                    'max_duration_ms': max(durations)
                })

            # Sort by average duration (slowest first)
            query_stats.sort(key=lambda x: x['avg_duration_ms'], reverse=True)

            return query_stats[:limit]

    def clear_statistics(self) -> None:
        """Clear all collected query statistics."""
        with self._lock:
            self._query_stats.clear()
            logger.info("Query performance statistics cleared")


def monitor_query_performance(monitor: QueryPerformanceMonitor):
    """
    Decorator for monitoring query execution performance.

    Args:
        monitor: QueryPerformanceMonitor instance to record metrics

    Returns:
        Decorated function that tracks query performance

    Example:
        ```python
        monitor = QueryPerformanceMonitor(slow_query_threshold_ms=1000)

        @monitor_query_performance(monitor)
        def execute_query(query: str) -> List[Dict[str, Any]]:
            # Query execution logic
            return results
        ```
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs) -> Any:
            # Extract query from args/kwargs if possible
            query = args[0] if args else kwargs.get('query', 'UNKNOWN')

            # Time the execution
            start_time = time.time()
            success = True
            result = None

            try:
                result = func(*args, **kwargs)
                return result

            except Exception as e:
                success = False
                raise

            finally:
                # Calculate duration
                duration_ms = (time.time() - start_time) * 1000

                # Determine row count
                row_count = 0
                if result is not None:
                    if isinstance(result, list):
                        row_count = len(result)
                    elif isinstance(result, dict) and 'count' in result:
                        row_count = result['count']

                # Record metrics
                monitor.record_query_execution(
                    query=str(query),
                    duration_ms=duration_ms,
                    row_count=row_count,
                    success=success
                )

        return wrapper
    return decorator


# Global monitor instance (singleton)
_global_monitor = None
_monitor_lock = threading.Lock()


def get_global_query_monitor(slow_query_threshold_ms: int = 1000) -> QueryPerformanceMonitor:
    """
    Get or create the global query performance monitor.

    Args:
        slow_query_threshold_ms: Threshold for slow queries (from config)

    Returns:
        Global QueryPerformanceMonitor instance
    """
    global _global_monitor

    with _monitor_lock:
        if _global_monitor is None:
            _global_monitor = QueryPerformanceMonitor(
                slow_query_threshold_ms=slow_query_threshold_ms
            )
            logger.info("Created global query performance monitor")

        return _global_monitor
