"""
Unified HTML Report Generator

A comprehensive HTML report generation system that consolidates capabilities
from both test runner reporting and investigation folder reporting into a
single, modular, extensible architecture.

This module provides a unified API for generating professional HTML reports
from multiple data source types while maintaining backward compatibility
with existing integrations.
"""

from .adapters.investigation_folder_adapter import InvestigationFolderAdapter
from .adapters.test_results_adapter import TestResultsAdapter
from .core.data_adapter import DataSourceType
from .core.unified_generator import UnifiedHTMLReportGenerator

__version__ = "1.0.0"
__author__ = "Gil Klainert"

# Public API exports
__all__ = [
    "UnifiedHTMLReportGenerator",
    "DataSourceType",
    "TestResultsAdapter",
    "InvestigationFolderAdapter",
]


# Convenience function for backward compatibility
def create_unified_generator(base_logs_dir=None):
    """Create a configured UnifiedHTMLReportGenerator instance."""
    return UnifiedHTMLReportGenerator(base_logs_dir=base_logs_dir)


def generate_report_from_test_results(test_results, output_path=None, title=None):
    """Generate HTML report from test runner results (System 1 compatibility)."""
    generator = UnifiedHTMLReportGenerator()
    return generator.generate_report(
        data_source=test_results,
        data_type=DataSourceType.TEST_RESULTS,
        output_path=output_path,
        title=title,
    )


def generate_report_from_investigation_folder(
    folder_path, output_path=None, title=None
):
    """Generate HTML report from investigation folder (System 2 compatibility)."""
    generator = UnifiedHTMLReportGenerator()
    return generator.generate_report(
        data_source=folder_path,
        data_type=DataSourceType.INVESTIGATION_FOLDER,
        output_path=output_path,
        title=title,
    )
