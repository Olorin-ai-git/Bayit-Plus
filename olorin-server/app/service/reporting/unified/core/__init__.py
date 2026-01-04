"""
Core unified HTML report generator components.

This module contains the core classes and data structures for the unified
HTML report generation system.
"""

from .component_registry import ComponentRegistry
from .data_adapter import DataAdapter, DataSourceType
from .data_structures import UnifiedReportData
from .template_engine import TemplateEngine
from .unified_generator import UnifiedHTMLReportGenerator

__all__ = [
    "UnifiedHTMLReportGenerator",
    "DataAdapter",
    "DataSourceType",
    "UnifiedReportData",
    "TemplateEngine",
    "ComponentRegistry",
]
