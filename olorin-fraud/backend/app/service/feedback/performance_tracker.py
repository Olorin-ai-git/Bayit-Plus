"""
Performance Tracker for Fraud Detection Models.

Tracks model performance metrics over time and detects degradation.

Week 11 Phase 4 implementation.
"""

import logging
import os
from collections import deque
from datetime import datetime
from typing import Any, Dict, List, Optional

from app.service.feedback.performance_helpers import (
    aggregate_snapshot_metrics,
    calculate_metric_trend,
    check_metric_degradation,
    filter_recent_snapshots,
)

logger = logging.getLogger(__name__)


class PerformanceTracker:
    """
    Tracks model performance metrics over time.

    Monitors precision, recall, accuracy, and F1 score trends.
    """

    def __init__(self):
        """Initialize performance tracker."""
        window_size_env = os.getenv("PERFORMANCE_WINDOW_SIZE")
        if not window_size_env:
            raise RuntimeError(
                "PERFORMANCE_WINDOW_SIZE environment variable is required"
            )
        self.window_size = int(window_size_env)

        degradation_threshold_env = os.getenv("PERFORMANCE_DEGRADATION_THRESHOLD")
        if not degradation_threshold_env:
            raise RuntimeError(
                "PERFORMANCE_DEGRADATION_THRESHOLD environment variable is required"
            )
        self.degradation_threshold = float(degradation_threshold_env)

        lookback_hours_env = os.getenv("PERFORMANCE_LOOKBACK_HOURS")
        if not lookback_hours_env:
            raise RuntimeError(
                "PERFORMANCE_LOOKBACK_HOURS environment variable is required"
            )
        self.lookback_hours = int(lookback_hours_env)

        min_samples_env = os.getenv("PERFORMANCE_MIN_SAMPLES")
        if not min_samples_env:
            raise RuntimeError(
                "PERFORMANCE_MIN_SAMPLES environment variable is required"
            )
        self.min_samples = int(min_samples_env)

        self.performance_snapshots: deque = deque(maxlen=self.window_size)
        self.baseline_metrics: Optional[Dict[str, float]] = None

        logger.info(
            f"📊 PerformanceTracker initialized (window={self.window_size}, "
            f"degradation_threshold={self.degradation_threshold})"
        )

    def record_performance(
        self,
        model_id: str,
        model_version: str,
        precision: float,
        recall: float,
        accuracy: float,
        f1_score: float,
        sample_count: int,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> None:
        """Record a performance snapshot."""
        snapshot = {
            "model_id": model_id,
            "model_version": model_version,
            "precision": precision,
            "recall": recall,
            "accuracy": accuracy,
            "f1_score": f1_score,
            "sample_count": sample_count,
            "metadata": metadata or {},
            "timestamp": datetime.utcnow(),
        }

        self.performance_snapshots.append(snapshot)

        logger.info(
            f"📊 Performance recorded for {model_id} v{model_version}: "
            f"precision={precision:.3f}, recall={recall:.3f}, f1={f1_score:.3f}"
        )

    def set_baseline(
        self, precision: float, recall: float, accuracy: float, f1_score: float
    ) -> None:
        """Set baseline performance metrics for comparison."""
        self.baseline_metrics = {
            "precision": precision,
            "recall": recall,
            "accuracy": accuracy,
            "f1_score": f1_score,
        }

        logger.info(
            f"📊 Baseline set: precision={precision:.3f}, recall={recall:.3f}, "
            f"accuracy={accuracy:.3f}, f1={f1_score:.3f}"
        )

    def get_current_performance(self) -> Optional[Dict[str, Any]]:
        """Get current performance metrics from recent snapshots."""
        recent = filter_recent_snapshots(
            list(self.performance_snapshots), self.lookback_hours
        )

        if len(recent) < self.min_samples:
            return {
                "status": "insufficient_data",
                "message": f"Need at least {self.min_samples} samples, have {len(recent)}",
                "sample_count": len(recent),
            }

        return aggregate_snapshot_metrics(recent)

    def check_degradation(self) -> Dict[str, Any]:
        """Check if performance has degraded below threshold."""
        if not self.baseline_metrics:
            return {"degraded": False, "message": "No baseline set for comparison"}

        current = self.get_current_performance()

        if current and current.get("status") == "insufficient_data":
            return {"degraded": False, "message": current["message"]}

        if not current or "metrics" not in current:
            raise RuntimeError(
                "Cannot check degradation - current performance unavailable"
            )

        degraded_metrics = check_metric_degradation(
            self.baseline_metrics, current["metrics"], self.degradation_threshold
        )

        return {
            "degraded": len(degraded_metrics) > 0,
            "degraded_metrics": degraded_metrics,
            "baseline": self.baseline_metrics,
            "current_summary": {k: v["mean"] for k, v in current["metrics"].items()},
            "checked_at": datetime.utcnow().isoformat(),
        }

    def get_performance_trend(self, metric_name: str) -> Dict[str, Any]:
        """Get trend for a specific metric."""
        recent = filter_recent_snapshots(
            list(self.performance_snapshots), self.lookback_hours
        )

        return calculate_metric_trend(recent, metric_name)
