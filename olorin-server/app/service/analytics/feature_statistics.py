"""
Feature Statistics Utilities.

Provides statistical calculations for feature analysis.
"""

import statistics
from typing import Any, Dict, List


def pearson_correlation(x: List[float], y: List[float]) -> float:
    """Calculate Pearson correlation coefficient."""
    if len(x) != len(y) or len(x) < 2:
        return 0.0

    mean_x = statistics.mean(x)
    mean_y = statistics.mean(y)

    numerator = sum((xi - mean_x) * (yi - mean_y) for xi, yi in zip(x, y))
    denominator_x = sum((xi - mean_x) ** 2 for xi in x)
    denominator_y = sum((yi - mean_y) ** 2 for yi in y)

    if denominator_x == 0 or denominator_y == 0:
        return 0.0

    return numerator / (denominator_x * denominator_y) ** 0.5


def calculate_statistics(values: List[float]) -> Dict[str, float]:
    """Calculate basic statistics for feature values."""
    return {
        "mean": statistics.mean(values),
        "median": statistics.median(values),
        "std_dev": statistics.stdev(values) if len(values) > 1 else 0.0,
        "min": min(values),
        "max": max(values),
    }


def calculate_discriminative_power(
    fraud_values: List[float], non_fraud_values: List[float]
) -> float:
    """Calculate how well feature discriminates fraud vs non-fraud using Cohen's d."""
    if not fraud_values or not non_fraud_values:
        return 0.0

    fraud_mean = statistics.mean(fraud_values)
    non_fraud_mean = statistics.mean(non_fraud_values)

    fraud_std = statistics.stdev(fraud_values) if len(fraud_values) > 1 else 1.0
    non_fraud_std = (
        statistics.stdev(non_fraud_values) if len(non_fraud_values) > 1 else 1.0
    )

    pooled_std = (
        ((fraud_std + non_fraud_std) / 2) if (fraud_std + non_fraud_std) > 0 else 1.0
    )

    cohens_d = abs(fraud_mean - non_fraud_mean) / pooled_std

    return min(1.0, cohens_d / 2.0)


def calculate_combined_importance(
    correlation: float, discriminative_power: float, sample_count: int
) -> float:
    """Calculate combined importance score."""
    sample_weight = min(1.0, sample_count / 1000)

    return abs(correlation) * 0.5 + discriminative_power * 0.4 + sample_weight * 0.1


def is_numeric(value: Any) -> bool:
    """Check if value is numeric."""
    try:
        float(value)
        return True
    except (ValueError, TypeError):
        return False
