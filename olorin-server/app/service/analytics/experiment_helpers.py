"""
A/B Experiment Helper Functions.

Provides utilities for experiment variant assignment and calculations.

Week 8 Phase 3 implementation.
"""

import hashlib
from typing import Dict, Any


def assign_variant(
    experiment_id: str,
    entity_id: str,
    traffic_split: float,
    variant_a_config: Dict[str, Any],
    variant_b_config: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Assign entity to a variant using consistent hashing.

    Args:
        experiment_id: Experiment identifier
        entity_id: Entity identifier for consistent assignment
        traffic_split: Percentage to assign to variant B (0.0 to 1.0)
        variant_a_config: Configuration for variant A
        variant_b_config: Configuration for variant B

    Returns:
        Dictionary with variant assignment details
    """
    hash_value = int(
        hashlib.md5(f"{experiment_id}_{entity_id}".encode()).hexdigest(),
        16
    )
    assignment = (hash_value % 100) / 100.0

    if assignment < traffic_split:
        variant = "variant_b"
        config = variant_b_config
    else:
        variant = "variant_a"
        config = variant_a_config

    return {
        "variant": variant,
        "config": config,
        "experiment_id": experiment_id
    }


def calculate_experiment_stats(metrics_a: Dict[str, float], metrics_b: Dict[str, float]) -> Dict[str, Any]:
    """
    Calculate experiment statistics and results.

    Args:
        metrics_a: Metrics for variant A
        metrics_b: Metrics for variant B

    Returns:
        Dictionary with calculated statistics
    """
    # Calculate average scores
    avg_score_a = (
        metrics_a["total_score"] / metrics_a["count"]
        if metrics_a["count"] > 0 else 0.0
    )
    avg_score_b = (
        metrics_b["total_score"] / metrics_b["count"]
        if metrics_b["count"] > 0 else 0.0
    )

    # Calculate error rates
    error_rate_a = (
        metrics_a["errors"] / metrics_a["count"]
        if metrics_a["count"] > 0 else 0.0
    )
    error_rate_b = (
        metrics_b["errors"] / metrics_b["count"]
        if metrics_b["count"] > 0 else 0.0
    )

    # Calculate score improvement
    score_improvement = (
        ((avg_score_b - avg_score_a) / avg_score_a * 100)
        if avg_score_a > 0 else 0.0
    )

    return {
        "variant_a": {
            "count": metrics_a["count"],
            "avg_score": avg_score_a,
            "error_rate": error_rate_a
        },
        "variant_b": {
            "count": metrics_b["count"],
            "avg_score": avg_score_b,
            "error_rate": error_rate_b
        },
        "winner": "variant_b" if avg_score_b > avg_score_a else "variant_a",
        "score_improvement": score_improvement
    }
