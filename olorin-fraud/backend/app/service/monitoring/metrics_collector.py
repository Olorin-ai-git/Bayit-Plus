"""
Real-time Metrics Collector for Fraud Detection System.

Collects performance metrics, model predictions, and system health indicators.

Week 10 Phase 4 implementation.
"""

import logging
import os
from collections import deque
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

import numpy as np

logger = logging.getLogger(__name__)


class MetricsCollector:
    """
    Collects and aggregates real-time metrics for fraud detection system.

    Tracks prediction metrics, latency, throughput, and resource utilization.
    """

    def __init__(self):
        """Initialize metrics collector."""
        window_size_env = os.getenv("METRICS_WINDOW_SIZE")
        if not window_size_env:
            raise RuntimeError("METRICS_WINDOW_SIZE environment variable is required")
        self.window_size = int(window_size_env)

        retention_hours_env = os.getenv("METRICS_RETENTION_HOURS")
        if not retention_hours_env:
            raise RuntimeError(
                "METRICS_RETENTION_HOURS environment variable is required"
            )
        self.retention_hours = int(retention_hours_env)

        self.prediction_scores: deque = deque(maxlen=self.window_size)
        self.prediction_latencies: deque = deque(maxlen=self.window_size)
        self.error_counts: Dict[str, int] = {}
        self.feature_stats: Dict[str, deque] = {}
        logger.info(
            f"📊 MetricsCollector initialized (window={self.window_size}, "
            f"retention={self.retention_hours}h)"
        )

    def record_prediction(
        self,
        score: float,
        confidence: float,
        latency_ms: float,
        features: Dict[str, Any],
        metadata: Optional[Dict[str, Any]] = None,
    ) -> None:
        """Record a prediction event."""
        timestamp = datetime.utcnow()

        self.prediction_scores.append(
            {
                "score": score,
                "confidence": confidence,
                "timestamp": timestamp,
                "metadata": metadata or {},
            }
        )

        self.prediction_latencies.append(latency_ms)

        for feature_name, feature_value in features.items():
            if feature_name not in self.feature_stats:
                self.feature_stats[feature_name] = deque(maxlen=self.window_size)

            if isinstance(feature_value, (int, float)):
                self.feature_stats[feature_name].append(feature_value)

    def record_error(self, error_type: str, error_message: str) -> None:
        """Record an error event."""
        if error_type not in self.error_counts:
            self.error_counts[error_type] = 0
        self.error_counts[error_type] += 1
        logger.error(f"Error recorded: {error_type} - {error_message}")

    def get_prediction_metrics(self) -> Dict[str, Any]:
        """Get aggregated prediction metrics."""
        if not self.prediction_scores:
            return self._empty_prediction_metrics()

        scores = [p["score"] for p in self.prediction_scores]
        confidences = [p["confidence"] for p in self.prediction_scores]

        return {
            "total_predictions": len(self.prediction_scores),
            "score_stats": {
                "mean": float(np.mean(scores)),
                "median": float(np.median(scores)),
                "std": float(np.std(scores)),
                "p50": float(np.percentile(scores, 50)),
                "p95": float(np.percentile(scores, 95)),
                "p99": float(np.percentile(scores, 99)),
            },
            "confidence_stats": {
                "mean": float(np.mean(confidences)),
                "median": float(np.median(confidences)),
                "std": float(np.std(confidences)),
                "p50": float(np.percentile(confidences, 50)),
                "p95": float(np.percentile(confidences, 95)),
            },
        }

    def get_latency_metrics(self) -> Dict[str, float]:
        """Get latency metrics."""
        if not self.prediction_latencies:
            return self._empty_latency_metrics()

        latencies = list(self.prediction_latencies)
        return {
            "mean_ms": float(np.mean(latencies)),
            "median_ms": float(np.median(latencies)),
            "p50_ms": float(np.percentile(latencies, 50)),
            "p95_ms": float(np.percentile(latencies, 95)),
            "p99_ms": float(np.percentile(latencies, 99)),
            "max_ms": float(np.max(latencies)),
            "min_ms": float(np.min(latencies)),
        }

    def get_error_metrics(self) -> Dict[str, Any]:
        """Get error metrics."""
        total_errors = sum(self.error_counts.values())
        return {
            "total_errors": total_errors,
            "error_counts_by_type": dict(self.error_counts),
            "error_rate": (
                total_errors / len(self.prediction_scores)
                if self.prediction_scores
                else 0.0
            ),
        }

    def get_feature_statistics(self, feature_name: str) -> Optional[Dict[str, float]]:
        """Get statistics for a specific feature."""
        if feature_name not in self.feature_stats:
            return None

        values = list(self.feature_stats[feature_name])
        if not values:
            return None

        return {
            "mean": float(np.mean(values)),
            "median": float(np.median(values)),
            "std": float(np.std(values)),
            "min": float(np.min(values)),
            "max": float(np.max(values)),
            "p25": float(np.percentile(values, 25)),
            "p75": float(np.percentile(values, 75)),
            "sample_count": len(values),
        }

    def get_all_metrics(self) -> Dict[str, Any]:
        """Get all collected metrics."""
        return {
            "prediction_metrics": self.get_prediction_metrics(),
            "latency_metrics": self.get_latency_metrics(),
            "error_metrics": self.get_error_metrics(),
            "window_size": self.window_size,
            "collected_at": datetime.utcnow().isoformat(),
        }

    def reset(self) -> None:
        """Reset all collected metrics."""
        self.prediction_scores.clear()
        self.prediction_latencies.clear()
        self.error_counts.clear()
        self.feature_stats.clear()
        logger.info("📊 MetricsCollector reset")

    def _empty_prediction_metrics(self) -> Dict[str, Any]:
        """Return empty prediction metrics structure."""
        return {
            "total_predictions": 0,
            "score_stats": {
                "mean": 0.0,
                "median": 0.0,
                "std": 0.0,
                "p50": 0.0,
                "p95": 0.0,
                "p99": 0.0,
            },
            "confidence_stats": {
                "mean": 0.0,
                "median": 0.0,
                "std": 0.0,
                "p50": 0.0,
                "p95": 0.0,
            },
        }

    def _empty_latency_metrics(self) -> Dict[str, float]:
        """Return empty latency metrics structure."""
        return {
            "mean_ms": 0.0,
            "median_ms": 0.0,
            "p50_ms": 0.0,
            "p95_ms": 0.0,
            "p99_ms": 0.0,
            "max_ms": 0.0,
            "min_ms": 0.0,
        }
