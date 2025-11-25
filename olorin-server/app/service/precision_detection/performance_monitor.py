"""
Performance Monitoring for Precision Detection

Tracks execution time and metrics for ETL, enrichment, and model training pipelines.
"""

import time
from functools import wraps
from typing import Any, Callable, Dict

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


def monitor_execution_time(operation_name: str):
    """Decorator to monitor execution time of functions."""

    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            start_time = time.time()
            try:
                result = func(*args, **kwargs)
                duration = time.time() - start_time
                logger.info(f"[PERF] {operation_name} completed in {duration:.2f}s")
                if hasattr(result, "__dict__"):
                    result.execution_time = duration
                return result
            except Exception as e:
                duration = time.time() - start_time
                logger.error(
                    f"[PERF] {operation_name} failed after {duration:.2f}s: {e}"
                )
                raise

        return wrapper

    return decorator


def track_pipeline_metrics(pipeline_name: str, metrics: Dict[str, Any]) -> None:
    """Log pipeline execution metrics."""
    logger.info(f"[METRICS] {pipeline_name}: {metrics}")


def check_query_latency(start_time: float, threshold_ms: float = 100.0) -> bool:
    """Check if query latency exceeds threshold."""
    latency_ms = (time.time() - start_time) * 1000
    if latency_ms > threshold_ms:
        logger.warning(
            f"[PERF] Query latency {latency_ms:.2f}ms exceeds threshold {threshold_ms}ms"
        )
        return False
    return True
