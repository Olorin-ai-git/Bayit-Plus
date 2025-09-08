"""
Data adapters for unified HTML report generation.

This module contains adapters that convert different data source formats
into the standardized UnifiedReportData structure.
"""

from .base_adapter import BaseAdapter
from .test_results_adapter import TestResultsAdapter
from .investigation_folder_adapter import InvestigationFolderAdapter

__all__ = [
    "BaseAdapter",
    "TestResultsAdapter", 
    "InvestigationFolderAdapter"
]