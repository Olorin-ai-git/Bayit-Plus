"""
SLA Calculation Utilities.

Helper functions for SLA metric calculations.

Week 10 Phase 4 implementation.
"""

from typing import Any, Dict


def calculate_availability(
    successful: int, total: int, target: float
) -> Dict[str, Any]:
    """Calculate availability SLA."""
    availability = successful / total if total > 0 else 0.0
    return {
        "metric": "availability",
        "target": target,
        "actual": availability,
        "compliant": availability >= target,
        "total_requests": total,
        "successful_requests": successful,
        "failed_requests": total - successful,
    }


def calculate_latency_sla(latencies: list, p95_target: float) -> Dict[str, Any]:
    """Calculate latency SLA."""
    import numpy as np

    p95_latency = float(np.percentile(latencies, 95))
    return {
        "metric": "latency_p95_ms",
        "target": p95_target,
        "actual": p95_latency,
        "compliant": p95_latency <= p95_target,
        "sample_count": len(latencies),
        "mean_latency_ms": float(np.mean(latencies)),
        "median_latency_ms": float(np.median(latencies)),
    }


def calculate_accuracy_sla(correct: int, total: int, target: float) -> Dict[str, Any]:
    """Calculate accuracy SLA."""
    accuracy = correct / total if total > 0 else 0.0
    return {
        "metric": "accuracy",
        "target": target,
        "actual": accuracy,
        "compliant": accuracy >= target,
        "total_predictions": total,
        "correct_predictions": correct,
        "incorrect_predictions": total - correct,
    }


def empty_sla_metric(metric_name: str, target: float) -> Dict[str, Any]:
    """Return empty SLA metric structure."""
    return {
        "metric": metric_name,
        "target": target,
        "actual": 0.0,
        "compliant": False,
        "message": "Insufficient data for SLA calculation",
    }
