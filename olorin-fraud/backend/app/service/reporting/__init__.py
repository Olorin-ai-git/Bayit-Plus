#!/usr/bin/env python3
"""
Olorin Investigation Reporting Module

This module provides comprehensive HTML report generation capabilities for
investigation folders created by the structured investigation system.

Main Components:
- ComprehensiveInvestigationReportGenerator: Main class for generating HTML reports
- InvestigationSummary: Data class for investigation statistics
- generate_comprehensive_investigation_report: Convenience function

Key Features:
- Investigation folder discovery and validation
- Data extraction from all investigation file types
- Interactive visualizations with Chart.js and Mermaid.js
- Responsive HTML templates with professional styling
- Comprehensive error handling and performance optimization

Usage:
    from app.service.reporting import generate_comprehensive_investigation_report

    report_path = generate_comprehensive_investigation_report(
        investigation_folder="/path/to/investigation/folder"
    )
"""

from .comprehensive_investigation_report import (
    ComprehensiveInvestigationReportGenerator,
    InvestigationSummary,
    generate_comprehensive_investigation_report,
)

__all__ = [
    "ComprehensiveInvestigationReportGenerator",
    "InvestigationSummary",
    "generate_comprehensive_investigation_report",
]

__version__ = "2.0.0"
__author__ = "Olorin Investigation Platform"
