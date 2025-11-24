"""
Confidence Interval Utilities

Calculates Wilson confidence intervals for proportions (precision, recall, accuracy).

Constitutional Compliance:
- All calculations explicit
- Handles edge cases gracefully
- No hardcoded thresholds
"""

import math
from typing import Optional, Tuple
from statistics import NormalDist


def z_from_confidence(confidence: float) -> float:
    """
    Get z-score for given confidence level.
    
    Args:
        confidence: Confidence level (e.g., 0.95 for 95%)
        
    Returns:
        Z-score (e.g., 0.95 → 1.96, 0.90 → 1.645)
    """
    return NormalDist().inv_cdf(0.5 + confidence / 2)


def wilson_interval(
    k: int, 
    n: int, 
    confidence: float = 0.95
) -> Optional[Tuple[float, float]]:
    """
    Calculate Wilson confidence interval for a proportion.
    
    Args:
        k: Number of successes
        n: Total number of trials
        confidence: Confidence level (default 0.95)
        
    Returns:
        Tuple of (lower_bound, upper_bound) or None if n <= 0
    """
    if n <= 0:
        return None
    
    z = z_from_confidence(confidence)
    p = k / n
    
    denom = 1 + (z * z) / n
    center = (p + (z * z) / (2 * n)) / denom
    half = (z * math.sqrt((p * (1 - p) + (z * z) / (4 * n)) / n)) / denom
    
    lower = max(0.0, center - half)
    upper = min(1.0, center + half)
    
    return (lower, upper)

