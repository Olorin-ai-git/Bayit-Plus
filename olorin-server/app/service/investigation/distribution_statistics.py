"""
Distribution Statistics Service

Computes PSI and KS statistics for distribution drift detection.

Constitutional Compliance:
- Requires minimum 10 values per window
- Handles edge cases gracefully
- Returns None for insufficient data
"""

from typing import List, Optional
import math

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


def compute_psi(
    risks_a: List[float],
    risks_b: List[float],
    num_bins: int = 10
) -> Optional[float]:
    """
    Compute Population Stability Index (PSI) for distribution drift detection.

    PSI measures how much a distribution has shifted between two time periods.
    PSI < 0.1: No significant change
    PSI 0.1-0.25: Some change
    PSI > 0.25: Significant change

    Args:
        risks_a: List of predicted_risk values from Window A
        risks_b: List of predicted_risk values from Window B
        num_bins: Number of bins for histogram (default 10)

    Returns:
        PSI value or None if insufficient data
    """
    if not risks_a or not risks_b:
        return None

    if len(risks_a) < 10 or len(risks_b) < 10:
        logger.warning("Insufficient data for PSI calculation (need at least 10 values per window)")
        return None

    # Find common range
    all_risks = risks_a + risks_b
    min_risk = min(all_risks)
    max_risk = max(all_risks)

    if max_risk <= min_risk:
        return None

    bin_width = (max_risk - min_risk) / num_bins

    # Create bins
    bins_a = [0] * num_bins
    bins_b = [0] * num_bins

    for risk in risks_a:
        bin_idx = min(int((risk - min_risk) / bin_width), num_bins - 1) if bin_width > 0 else 0
        bins_a[bin_idx] += 1

    for risk in risks_b:
        bin_idx = min(int((risk - min_risk) / bin_width), num_bins - 1) if bin_width > 0 else 0
        bins_b[bin_idx] += 1

    # Normalize to probabilities
    total_a = sum(bins_a)
    total_b = sum(bins_b)

    if total_a == 0 or total_b == 0:
        return None

    prob_a = [count / total_a for count in bins_a]
    prob_b = [count / total_b for count in bins_b]

    # Compute PSI
    psi = 0.0
    for i in range(num_bins):
        if prob_a[i] > 0 and prob_b[i] > 0:
            psi += (prob_b[i] - prob_a[i]) * math.log(prob_b[i] / prob_a[i])
        elif prob_b[i] > 0:
            # Handle zero in expected distribution
            psi += prob_b[i] * math.log(prob_b[i] / 0.0001)  # Small epsilon

    return psi


def compute_ks_statistic(
    risks_a: List[float],
    risks_b: List[float]
) -> Optional[float]:
    """
    Compute Kolmogorov-Smirnov (KS) statistic for distribution comparison.

    KS statistic measures the maximum difference between two cumulative distributions.
    Range: 0.0 to 1.0, where higher values indicate greater distribution differences.

    Args:
        risks_a: List of predicted_risk values from Window A
        risks_b: List of predicted_risk values from Window B

    Returns:
        KS statistic value or None if insufficient data
    """
    if not risks_a or not risks_b:
        return None

    if len(risks_a) < 10 or len(risks_b) < 10:
        logger.warning("Insufficient data for KS statistic calculation (need at least 10 values per window)")
        return None

    # Sort both lists
    sorted_a = sorted(risks_a)
    sorted_b = sorted(risks_b)

    # Create combined sorted list
    all_values = sorted(set(sorted_a + sorted_b))

    # Compute empirical CDFs
    def ecdf(data: List[float], value: float) -> float:
        return sum(1 for x in data if x <= value) / len(data)

    # Find maximum difference
    max_diff = 0.0
    for value in all_values:
        cdf_a = ecdf(sorted_a, value)
        cdf_b = ecdf(sorted_b, value)
        diff = abs(cdf_b - cdf_a)
        max_diff = max(max_diff, diff)

    return max_diff

