"""
Metrics package for investigation performance analysis.

This package provides utilities for safe mathematical operations and
centralized metric finalization to ensure consistent calculations.
"""

from .safe import safe_div
from .finalize import (
    finalize_metrics,
    finalize_duration_metrics, 
    finalize_coverage_metrics,
    finalize_all_metrics
)
from .network import compute_network_metrics

__all__ = [
    "safe_div",
    "finalize_metrics",
    "finalize_duration_metrics",
    "finalize_coverage_metrics", 
    "finalize_all_metrics",
    "compute_network_metrics"
]