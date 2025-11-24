"""
Report Generation Modules

Refactored modules extracted from comprehensive_investigation_report.py
"""

from .report_data_processor import ReportDataProcessor
from .report_summary import InvestigationSummary, ReportSummaryGenerator

__all__ = [
    'ReportDataProcessor',
    'InvestigationSummary',
    'ReportSummaryGenerator',
]

