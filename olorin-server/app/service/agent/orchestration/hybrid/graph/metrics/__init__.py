"""
Metrics package for hybrid intelligence performance analysis.

This package contains components for calculating performance metrics and
generating comprehensive investigation summaries.
"""

from .performance_calculator import PerformanceCalculator
from .summary_generator import SummaryGenerator

__all__ = [
    "PerformanceCalculator",
    "SummaryGenerator"
]