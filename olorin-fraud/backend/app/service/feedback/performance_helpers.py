"""
Helper Utilities for Performance Tracker.

Extracted utilities for metrics calculation and snapshot management.

Week 11 Phase 4 implementation.
"""

from datetime import datetime, timedelta
from typing import Any, Dict, List

import numpy as np


def filter_recent_snapshots(
    snapshots: List[Dict[str, Any]], lookback_hours: int
) -> List[Dict[str, Any]]:
    """Get snapshots within lookback window."""
    cutoff_time = datetime.utcnow() - timedelta(hours=lookback_hours)
    return [snapshot for snapshot in snapshots if snapshot["timestamp"] >= cutoff_time]


def aggregate_snapshot_metrics(snapshots: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Calculate aggregated metrics from snapshots."""
    precisions = [s["precision"] for s in snapshots]
    recalls = [s["recall"] for s in snapshots]
    accuracies = [s["accuracy"] for s in snapshots]
    f1_scores = [s["f1_score"] for s in snapshots]

    return {
        "status": "active",
        "sample_count": len(snapshots),
        "metrics": {
            "precision": calculate_metric_stats(precisions),
            "recall": calculate_metric_stats(recalls),
            "accuracy": calculate_metric_stats(accuracies),
            "f1_score": calculate_metric_stats(f1_scores),
        },
        "measured_at": datetime.utcnow().isoformat(),
    }


def calculate_metric_stats(values: List[float]) -> Dict[str, float]:
    """Calculate statistics for a metric."""
    return {
        "mean": float(np.mean(values)),
        "std": float(np.std(values)),
        "min": float(np.min(values)),
        "max": float(np.max(values)),
    }


def check_metric_degradation(
    baseline_metrics: Dict[str, float],
    current_metrics: Dict[str, Dict[str, float]],
    degradation_threshold: float,
) -> List[Dict[str, Any]]:
    """Check for degraded metrics."""
    degraded_metrics = []

    for metric_name in ["precision", "recall", "accuracy", "f1_score"]:
        baseline_value = baseline_metrics[metric_name]
        current_value = current_metrics[metric_name]["mean"]
        degradation = baseline_value - current_value

        if degradation > degradation_threshold:
            degraded_metrics.append(
                {
                    "metric": metric_name,
                    "baseline": baseline_value,
                    "current": current_value,
                    "degradation": degradation,
                }
            )

    return degraded_metrics


def calculate_metric_trend(
    snapshots: List[Dict[str, Any]], metric_name: str
) -> Dict[str, Any]:
    """Calculate trend for a specific metric."""
    if metric_name not in ["precision", "recall", "accuracy", "f1_score"]:
        raise ValueError(
            f"Invalid metric name: {metric_name}. "
            "Must be one of: precision, recall, accuracy, f1_score"
        )

    if len(snapshots) < 2:
        return {
            "metric": metric_name,
            "trend": "insufficient_data",
            "message": "Need at least 2 snapshots to calculate trend",
        }

    values = [s[metric_name] for s in snapshots]
    timestamps = [s["timestamp"] for s in snapshots]

    return {
        "metric": metric_name,
        "values": values,
        "timestamps": [t.isoformat() for t in timestamps],
        "mean": float(np.mean(values)),
        "trend": "improving" if values[-1] > values[0] else "declining",
        "change": values[-1] - values[0],
    }
