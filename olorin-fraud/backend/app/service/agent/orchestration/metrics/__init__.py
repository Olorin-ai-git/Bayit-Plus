"""
Metrics package for investigation performance analysis.

This package provides utilities for safe mathematical operations and
centralized metric finalization to ensure consistent calculations.
"""

from .finalize import (
    finalize_all_metrics,
    finalize_coverage_metrics,
    finalize_duration_metrics,
    finalize_metrics,
)
from .network import compute_network_metrics
from .safe import safe_div

__all__ = [
    "safe_div",
    "finalize_metrics",
    "finalize_duration_metrics",
    "finalize_coverage_metrics",
    "finalize_all_metrics",
    "compute_network_metrics",
]
