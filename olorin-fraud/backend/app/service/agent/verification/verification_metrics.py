#!/usr/bin/env python3
"""
Verification Metrics System

Comprehensive metrics collection and analysis for LLM verification system
with performance tracking, health monitoring, and alerting capabilities.

Author: Gil Klainert
Date: 2025-01-10
"""

import asyncio
import logging
import statistics
import time
from collections import defaultdict, deque
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

from .verification_config import VerificationConfig, get_verification_config

logger = logging.getLogger(__name__)


@dataclass
class MetricPoint:
    """Individual metric data point."""

    timestamp: float
    value: float
    tags: Dict[str, str] = field(default_factory=dict)


@dataclass
class PerformanceWindow:
    """Performance metrics for a time window."""

    window_start: float
    window_end: float
    total_verifications: int
    successful_verifications: int
    failed_verifications: int
    total_response_time_ms: float
    total_retries: int
    cache_hits: int
    cache_misses: int
    model_usage: Dict[str, int] = field(default_factory=dict)
    error_types: Dict[str, int] = field(default_factory=dict)


class VerificationMetrics:
    """
    Comprehensive metrics collection and analysis system.

    Features:
    - Real-time performance tracking
    - Historical data analysis
    - Health status monitoring
    - Alerting thresholds
    - Model performance comparison
    - Cost tracking
    """

    def __init__(self, config: Optional[VerificationConfig] = None):
        """Initialize metrics collection system."""
        self.config = config or get_verification_config()

        # Time-series data storage
        self.response_times = deque(maxlen=1000)  # Last 1000 response times
        self.confidence_scores = deque(maxlen=1000)  # Last 1000 confidence scores
        self.verification_results = deque(maxlen=1000)  # Last 1000 results

        # Counters
        self.counters = defaultdict(int)

        # Model-specific metrics
        self.model_metrics = defaultdict(
            lambda: {
                "total_calls": 0,
                "successful_calls": 0,
                "failed_calls": 0,
                "total_response_time_ms": 0,
                "total_cost": 0.0,
                "confidence_scores": deque(maxlen=100),
            }
        )

        # Performance windows for trend analysis
        self.window_duration_minutes = 5
        self.performance_windows = deque(maxlen=288)  # 24 hours of 5-minute windows
        self.current_window = self._create_new_window()

        # Health thresholds
        self.health_thresholds = {
            "min_success_rate": 0.95,
            "max_avg_response_time_ms": 2000,
            "max_retry_rate": 0.1,
            "min_cache_hit_rate": 0.3,
        }

        # Cost tracking
        self.cost_tracking = {
            "total_cost_usd": 0.0,
            "daily_cost_usd": 0.0,
            "cost_by_model": defaultdict(float),
            "last_reset_date": datetime.utcnow().date(),
        }

        logger.info("📊 Verification metrics system initialized")

    def record_verification_start(self, verification_id: str, model: str):
        """Record the start of a verification."""
        self.counters["total_verifications"] += 1
        self.current_window.total_verifications += 1

        # Update model metrics
        self.model_metrics[model]["total_calls"] += 1

    def record_verification_success(
        self,
        verification_id: str,
        model: str,
        response_time_ms: int,
        confidence_score: float,
        retry_count: int = 0,
        cost_usd: float = 0.0,
    ):
        """Record successful verification with performance data."""
        # Update counters
        self.counters["successful_verifications"] += 1
        self.counters["total_retries"] += retry_count
        self.current_window.successful_verifications += 1
        self.current_window.total_response_time_ms += response_time_ms
        self.current_window.total_retries += retry_count

        # Update time series data
        current_time = time.time()
        self.response_times.append(
            MetricPoint(current_time, response_time_ms, {"model": model})
        )
        self.confidence_scores.append(
            MetricPoint(current_time, confidence_score, {"model": model})
        )
        self.verification_results.append(
            MetricPoint(current_time, 1.0, {"result": "success", "model": model})
        )

        # Update model-specific metrics
        model_stats = self.model_metrics[model]
        model_stats["successful_calls"] += 1
        model_stats["total_response_time_ms"] += response_time_ms
        model_stats["total_cost"] += cost_usd
        model_stats["confidence_scores"].append(confidence_score)

        # Update cost tracking
        self._update_cost_tracking(cost_usd, model)

        logger.debug(
            f"📈 Recorded successful verification: {model} ({response_time_ms}ms, {confidence_score:.2f} confidence)"
        )

    def record_verification_failure(
        self,
        verification_id: str,
        model: str,
        response_time_ms: int,
        error_type: str,
        retry_count: int = 0,
        cost_usd: float = 0.0,
    ):
        """Record failed verification with error details."""
        # Update counters
        self.counters["failed_verifications"] += 1
        self.counters["total_retries"] += retry_count
        self.counters[f"error_{error_type}"] += 1
        self.current_window.failed_verifications += 1
        self.current_window.total_response_time_ms += response_time_ms
        self.current_window.total_retries += retry_count
        self.current_window.error_types[error_type] += 1

        # Update time series data
        current_time = time.time()
        self.response_times.append(
            MetricPoint(current_time, response_time_ms, {"model": model})
        )
        self.verification_results.append(
            MetricPoint(
                current_time,
                0.0,
                {"result": "failure", "model": model, "error": error_type},
            )
        )

        # Update model-specific metrics
        model_stats = self.model_metrics[model]
        model_stats["failed_calls"] += 1
        model_stats["total_response_time_ms"] += response_time_ms
        model_stats["total_cost"] += cost_usd

        # Update cost tracking
        self._update_cost_tracking(cost_usd, model)

        logger.debug(
            f"📉 Recorded failed verification: {model} ({error_type}, {response_time_ms}ms)"
        )

    def record_cache_hit(self, source: str = "memory"):
        """Record cache hit."""
        self.counters["cache_hits"] += 1
        self.counters[f"cache_hits_{source}"] += 1
        self.current_window.cache_hits += 1

        logger.debug(f"🎯 Recorded cache hit: {source}")

    def record_cache_miss(self):
        """Record cache miss."""
        self.counters["cache_misses"] += 1
        self.current_window.cache_misses += 1

        logger.debug("💭 Recorded cache miss")

    def record_model_usage(self, model: str):
        """Record model usage."""
        self.current_window.model_usage[model] += 1

    def _update_cost_tracking(self, cost_usd: float, model: str):
        """Update cost tracking metrics."""
        current_date = datetime.utcnow().date()

        # Reset daily cost if new day
        if current_date != self.cost_tracking["last_reset_date"]:
            self.cost_tracking["daily_cost_usd"] = 0.0
            self.cost_tracking["last_reset_date"] = current_date

        # Update costs
        self.cost_tracking["total_cost_usd"] += cost_usd
        self.cost_tracking["daily_cost_usd"] += cost_usd
        self.cost_tracking["cost_by_model"][model] += cost_usd

    def _create_new_window(self) -> PerformanceWindow:
        """Create a new performance window."""
        current_time = time.time()
        return PerformanceWindow(
            window_start=current_time,
            window_end=current_time + (self.window_duration_minutes * 60),
            total_verifications=0,
            successful_verifications=0,
            failed_verifications=0,
            total_response_time_ms=0,
            total_retries=0,
            cache_hits=0,
            cache_misses=0,
        )

    def _rotate_window_if_needed(self):
        """Rotate to new performance window if current one has expired."""
        current_time = time.time()

        if current_time >= self.current_window.window_end:
            # Store completed window
            self.performance_windows.append(self.current_window)

            # Create new window
            self.current_window = self._create_new_window()

            logger.debug(f"🔄 Rotated to new performance window")

    def get_current_performance(self) -> Dict[str, Any]:
        """Get current performance metrics."""
        self._rotate_window_if_needed()

        total_verifications = self.counters["total_verifications"]
        successful_verifications = self.counters["successful_verifications"]
        failed_verifications = self.counters["failed_verifications"]
        cache_hits = self.counters["cache_hits"]
        cache_misses = self.counters["cache_misses"]

        # Calculate rates
        success_rate = successful_verifications / max(1, total_verifications)
        failure_rate = failed_verifications / max(1, total_verifications)
        retry_rate = self.counters["total_retries"] / max(1, total_verifications)
        cache_hit_rate = cache_hits / max(1, cache_hits + cache_misses)

        # Calculate average response time
        if self.response_times:
            recent_times = [point.value for point in list(self.response_times)[-100:]]
            avg_response_time_ms = statistics.mean(recent_times)
            p95_response_time_ms = (
                statistics.quantiles(recent_times, n=20)[18]
                if len(recent_times) > 10
                else avg_response_time_ms
            )
        else:
            avg_response_time_ms = 0
            p95_response_time_ms = 0

        # Calculate average confidence score
        if self.confidence_scores:
            recent_confidence = [
                point.value for point in list(self.confidence_scores)[-100:]
            ]
            avg_confidence_score = statistics.mean(recent_confidence)
        else:
            avg_confidence_score = 0

        return {
            "timestamp": time.time(),
            "totals": {
                "total_verifications": total_verifications,
                "successful_verifications": successful_verifications,
                "failed_verifications": failed_verifications,
                "total_retries": self.counters["total_retries"],
            },
            "rates": {
                "success_rate": round(success_rate, 4),
                "failure_rate": round(failure_rate, 4),
                "retry_rate": round(retry_rate, 4),
                "cache_hit_rate": round(cache_hit_rate, 4),
            },
            "performance": {
                "avg_response_time_ms": round(avg_response_time_ms, 1),
                "p95_response_time_ms": round(p95_response_time_ms, 1),
                "avg_confidence_score": round(avg_confidence_score, 3),
            },
            "cache": {
                "hits": cache_hits,
                "misses": cache_misses,
                "hit_rate": round(cache_hit_rate, 4),
            },
            "cost": {
                "total_cost_usd": round(self.cost_tracking["total_cost_usd"], 4),
                "daily_cost_usd": round(self.cost_tracking["daily_cost_usd"], 4),
            },
        }

    def get_model_performance(self) -> Dict[str, Any]:
        """Get per-model performance breakdown."""
        model_stats = {}

        for model, stats in self.model_metrics.items():
            total_calls = stats["total_calls"]
            if total_calls == 0:
                continue

            success_rate = stats["successful_calls"] / total_calls
            avg_response_time = stats["total_response_time_ms"] / total_calls
            avg_cost_per_call = (
                stats["total_cost"] / total_calls if stats["total_cost"] > 0 else 0
            )

            # Calculate confidence statistics
            confidence_scores = list(stats["confidence_scores"])
            if confidence_scores:
                avg_confidence = statistics.mean(confidence_scores)
                min_confidence = min(confidence_scores)
                max_confidence = max(confidence_scores)
            else:
                avg_confidence = min_confidence = max_confidence = 0

            model_stats[model] = {
                "total_calls": total_calls,
                "successful_calls": stats["successful_calls"],
                "failed_calls": stats["failed_calls"],
                "success_rate": round(success_rate, 4),
                "avg_response_time_ms": round(avg_response_time, 1),
                "total_cost_usd": round(stats["total_cost"], 4),
                "avg_cost_per_call_usd": round(avg_cost_per_call, 6),
                "confidence_stats": {
                    "avg": round(avg_confidence, 3),
                    "min": round(min_confidence, 3),
                    "max": round(max_confidence, 3),
                    "samples": len(confidence_scores),
                },
            }

        return model_stats

    def get_health_status(self) -> Dict[str, Any]:
        """Get system health status based on thresholds."""
        current_perf = self.get_current_performance()

        health_checks = {}
        overall_healthy = True

        # Check success rate
        success_rate = current_perf["rates"]["success_rate"]
        health_checks["success_rate"] = {
            "value": success_rate,
            "threshold": self.health_thresholds["min_success_rate"],
            "healthy": success_rate >= self.health_thresholds["min_success_rate"],
            "message": f"Success rate: {success_rate:.1%} (min: {self.health_thresholds['min_success_rate']:.1%})",
        }
        if not health_checks["success_rate"]["healthy"]:
            overall_healthy = False

        # Check average response time
        avg_response_time = current_perf["performance"]["avg_response_time_ms"]
        health_checks["response_time"] = {
            "value": avg_response_time,
            "threshold": self.health_thresholds["max_avg_response_time_ms"],
            "healthy": avg_response_time
            <= self.health_thresholds["max_avg_response_time_ms"],
            "message": f"Avg response time: {avg_response_time:.0f}ms (max: {self.health_thresholds['max_avg_response_time_ms']}ms)",
        }
        if not health_checks["response_time"]["healthy"]:
            overall_healthy = False

        # Check retry rate
        retry_rate = current_perf["rates"]["retry_rate"]
        health_checks["retry_rate"] = {
            "value": retry_rate,
            "threshold": self.health_thresholds["max_retry_rate"],
            "healthy": retry_rate <= self.health_thresholds["max_retry_rate"],
            "message": f"Retry rate: {retry_rate:.1%} (max: {self.health_thresholds['max_retry_rate']:.1%})",
        }
        if not health_checks["retry_rate"]["healthy"]:
            overall_healthy = False

        # Check cache hit rate
        cache_hit_rate = current_perf["rates"]["cache_hit_rate"]
        health_checks["cache_hit_rate"] = {
            "value": cache_hit_rate,
            "threshold": self.health_thresholds["min_cache_hit_rate"],
            "healthy": cache_hit_rate >= self.health_thresholds["min_cache_hit_rate"],
            "message": f"Cache hit rate: {cache_hit_rate:.1%} (min: {self.health_thresholds['min_cache_hit_rate']:.1%})",
        }
        if not health_checks["cache_hit_rate"]["healthy"]:
            overall_healthy = False

        return {
            "timestamp": time.time(),
            "overall_healthy": overall_healthy,
            "status": "healthy" if overall_healthy else "degraded",
            "checks": health_checks,
            "uptime_seconds": time.time() - getattr(self, "start_time", time.time()),
            "total_verifications": current_perf["totals"]["total_verifications"],
        }

    def get_trend_analysis(self, hours: int = 24) -> Dict[str, Any]:
        """Get trend analysis for the specified time period."""
        self._rotate_window_if_needed()

        # Get windows for the specified time period
        cutoff_time = time.time() - (hours * 3600)
        relevant_windows = [
            window
            for window in self.performance_windows
            if window.window_start >= cutoff_time
        ]

        if not relevant_windows:
            return {"message": f"No data available for {hours}h trend analysis"}

        # Calculate trends
        success_rates = []
        response_times = []
        retry_rates = []

        for window in relevant_windows:
            if window.total_verifications > 0:
                success_rate = (
                    window.successful_verifications / window.total_verifications
                )
                avg_response_time = (
                    window.total_response_time_ms / window.total_verifications
                )
                retry_rate = window.total_retries / window.total_verifications

                success_rates.append(success_rate)
                response_times.append(avg_response_time)
                retry_rates.append(retry_rate)

        if not success_rates:
            return {
                "message": f"No verification data available for {hours}h trend analysis"
            }

        # Calculate trends (simple linear trend)
        def calculate_trend(values: List[float]) -> str:
            if len(values) < 2:
                return "stable"
            first_half = statistics.mean(values[: len(values) // 2])
            second_half = statistics.mean(values[len(values) // 2 :])
            diff_pct = (second_half - first_half) / first_half * 100

            if diff_pct > 5:
                return "improving"
            elif diff_pct < -5:
                return "degrading"
            else:
                return "stable"

        return {
            "period_hours": hours,
            "windows_analyzed": len(relevant_windows),
            "trends": {
                "success_rate": {
                    "current": round(success_rates[-1], 4),
                    "average": round(statistics.mean(success_rates), 4),
                    "trend": calculate_trend(success_rates),
                },
                "response_time_ms": {
                    "current": round(response_times[-1], 1),
                    "average": round(statistics.mean(response_times), 1),
                    "trend": calculate_trend(response_times),
                },
                "retry_rate": {
                    "current": round(retry_rates[-1], 4),
                    "average": round(statistics.mean(retry_rates), 4),
                    "trend": calculate_trend(retry_rates),
                },
            },
        }

    def get_cost_analysis(self) -> Dict[str, Any]:
        """Get cost analysis and projections."""
        current_perf = self.get_current_performance()
        total_verifications = current_perf["totals"]["total_verifications"]

        # Calculate cost per verification
        cost_per_verification = (
            self.cost_tracking["total_cost_usd"] / total_verifications
            if total_verifications > 0
            else 0
        )

        # Project daily and monthly costs
        daily_projection = self.cost_tracking["daily_cost_usd"]
        monthly_projection = daily_projection * 30

        # Cost by model
        model_costs = dict(self.cost_tracking["cost_by_model"])

        return {
            "total_cost_usd": round(self.cost_tracking["total_cost_usd"], 4),
            "daily_cost_usd": round(self.cost_tracking["daily_cost_usd"], 4),
            "monthly_projection_usd": round(monthly_projection, 2),
            "cost_per_verification_usd": round(cost_per_verification, 6),
            "cost_by_model": {k: round(v, 4) for k, v in model_costs.items()},
            "last_reset_date": self.cost_tracking["last_reset_date"].isoformat(),
        }

    def reset_metrics(self):
        """Reset all metrics (useful for testing)."""
        self.response_times.clear()
        self.confidence_scores.clear()
        self.verification_results.clear()
        self.counters.clear()
        self.model_metrics.clear()
        self.performance_windows.clear()
        self.current_window = self._create_new_window()

        # Reset cost tracking but keep current date
        self.cost_tracking = {
            "total_cost_usd": 0.0,
            "daily_cost_usd": 0.0,
            "cost_by_model": defaultdict(float),
            "last_reset_date": datetime.utcnow().date(),
        }

        logger.info("🔄 All metrics reset")

    def export_metrics(self) -> Dict[str, Any]:
        """Export all metrics for external analysis."""
        return {
            "export_timestamp": time.time(),
            "current_performance": self.get_current_performance(),
            "model_performance": self.get_model_performance(),
            "health_status": self.get_health_status(),
            "trend_analysis": self.get_trend_analysis(),
            "cost_analysis": self.get_cost_analysis(),
            "counters": dict(self.counters),
            "windows_count": len(self.performance_windows),
        }
