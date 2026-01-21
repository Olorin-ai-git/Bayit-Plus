"""
Incremental Report Sections Package.

Modular components for generating daily incremental HTML reports.
Extracted from incremental_report.py for maintainability.
"""

from .blindspot_analysis import run_blindspot_analysis, run_investigated_entities_analysis
from .data_fetchers import fetch_completed_auto_comp_investigations, load_confusion_matrix_from_file
from .file_utils import (
    ARTIFACTS_DIR,
    extract_window_date_from_investigations,
    filter_investigations_by_date,
    get_incremental_file_path,
)
from .html_generator import generate_incremental_html
from .merchant_sections import generate_entity_card, generate_merchant_sections
from .monthly_updater import update_monthly_report_from_daily
from .navigation import generate_daily_navigation
from .selector_section import generate_selector_section_html
from .styles import get_incremental_report_scripts, get_incremental_report_styles
from .transaction_section import generate_transaction_section, get_transaction_details_link
from .utils import safe_float, safe_int

__all__ = [
    # Blindspot analysis
    "run_blindspot_analysis",
    "run_investigated_entities_analysis",
    # Data fetching
    "fetch_completed_auto_comp_investigations",
    "load_confusion_matrix_from_file",
    # File utilities
    "ARTIFACTS_DIR",
    "get_incremental_file_path",
    "extract_window_date_from_investigations",
    "filter_investigations_by_date",
    # HTML generation
    "generate_incremental_html",
    "generate_selector_section_html",
    "generate_transaction_section",
    "get_transaction_details_link",
    "generate_daily_navigation",
    # Styles
    "get_incremental_report_styles",
    "get_incremental_report_scripts",
    # Monthly updates
    "update_monthly_report_from_daily",
    # Utilities
    "safe_float",
    "safe_int",
]
