"""
Startup Report Sections Package.

Modular components for generating startup analysis HTML reports.
Extracted from startup_report_generator.py for maintainability.
"""

from .comparisons_section import (
    generate_auto_comparisons_section,
    generate_comparison_summary,
    generate_zero_metrics_explanation,
)
from .simple_sections import (
    generate_database_section,
    generate_risk_entities_section,
    generate_summary_section,
    generate_system_components_section,
)
from .text_formatters import (
    format_investigation_summary,
    format_llm_analysis,
    highlight_keywords,
    parse_text_with_newlines,
)
from .comparison_metrics_section import generate_comparison_metrics_section
from .investigation_details_section import generate_investigation_details_section
from .transaction_analysis_section import generate_transaction_analysis_section

__all__ = [
    # Simple sections
    "generate_summary_section",
    "generate_database_section",
    "generate_risk_entities_section",
    "generate_system_components_section",
    # Comparisons
    "generate_auto_comparisons_section",
    "generate_zero_metrics_explanation",
    "generate_comparison_summary",
    "generate_comparison_metrics_section",
    # Transaction analysis
    "generate_transaction_analysis_section",
    # Investigation details
    "generate_investigation_details_section",
    # Text formatters
    "format_llm_analysis",
    "parse_text_with_newlines",
    "highlight_keywords",
    "format_investigation_summary",
]
