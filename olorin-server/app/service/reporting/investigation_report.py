"""
Investigation Report Generator

Modular investigation report generator that composes section components
into a complete HTML report with drill-up navigation.

DPA COMPLIANCE: All entity values obfuscated per Section 9.4.

Feature: unified-report-hierarchy
"""

import calendar
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Optional

from app.service.logging import get_bridge_logger
from app.service.reporting.components.investigation import (
    generate_entity_section,
    generate_evidence_section,
    generate_timeline_section,
)
from app.service.reporting.components.navigation import ReportContext
from app.service.reporting.components.report_base import ReportBase
from app.service.reporting.components.unified_styles import get_unified_styles
from app.service.reporting.privacy_safe_display import get_display_entity_value

logger = get_bridge_logger(__name__)

ARTIFACTS_DIR = Path("artifacts")


async def generate_investigation_report(
    investigation_data: Dict[str, Any],
    output_path: Optional[Path] = None,
) -> Path:
    """
    Generate modular investigation HTML report.

    Args:
        investigation_data: Investigation data dictionary
        output_path: Optional custom output path

    Returns:
        Path to generated report
    """
    investigation_id = investigation_data.get("investigation_id", "unknown")

    if output_path is None:
        output_dir = ARTIFACTS_DIR / "investigations"
        output_dir.mkdir(parents=True, exist_ok=True)
        output_path = output_dir / f"{investigation_id}.html"

    html = _generate_html(investigation_data)
    output_path.write_text(html)

    logger.info(f"📄 Investigation report generated: {output_path}")
    return output_path


def _generate_html(data: Dict[str, Any]) -> str:
    """Generate complete HTML for investigation report with DPA compliance."""
    investigation_id = data.get("investigation_id", "unknown")
    raw_entity_value = data.get("entity_value") or data.get("email", "Unknown")
    entity_type = data.get("entity_type", "email")
    obfuscation_context_id = data.get("obfuscation_context_id")

    # Obfuscate entity value for DPA compliance
    entity_value = get_display_entity_value(
        entity_value=raw_entity_value,
        entity_type=entity_type,
        obfuscation_context_id=obfuscation_context_id,
    )

    report_base = ReportBase(
        report_type="investigation",
        title=f"🔍 Investigation Report - {entity_value}",
    )

    # Extract date for navigation
    nav_html = _generate_navigation(data)

    # Build section components
    entity_html = generate_entity_section(data)
    evidence_html = generate_evidence_section(data)
    timeline_html = generate_timeline_section(data)

    # Status
    status = data.get("status", "completed")
    status_class = "complete" if status == "completed" else "in-progress"
    status_text = status.upper()

    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    header_html = f"""
    <div class="header">
        <h1>{report_base.title}</h1>
        <p class="subtitle">Investigation ID: {investigation_id}</p>
        <div class="status-badge {status_class}">{status_text}</div>
        <p class="subtitle" style="margin-top: 10px;">Generated: {timestamp}</p>
    </div>
    """

    footer_html = report_base.generate_footer()
    styles = get_unified_styles()

    content = f"""
        {nav_html}
        {header_html}
        {entity_html}
        {evidence_html}
        {timeline_html}
        {footer_html}
    """

    return report_base.wrap_html(content, styles)


def _generate_navigation(data: Dict[str, Any]) -> str:
    """Generate navigation breadcrumbs for investigation report."""
    # Try to extract date from investigation data
    created_at = data.get("created_at")
    report_date = None

    if created_at:
        try:
            if isinstance(created_at, str):
                report_date = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
            elif isinstance(created_at, datetime):
                report_date = created_at
        except (ValueError, TypeError):
            pass

    if not report_date:
        report_date = datetime.now()

    year = report_date.year
    month = report_date.month
    day = report_date.day
    month_name = calendar.month_name[month]

    yearly_url = f"../yearly_{year}.html"
    monthly_url = f"../startup_analysis_MONTHLY_{year}_{month:02d}.html"
    daily_url = f"../startup_analysis_DAILY_{year}-{month:02d}-{day:02d}.html"
    investigation_id = data.get("investigation_id", "unknown")

    return f"""
    <nav class="breadcrumb-nav">
        <a href="{yearly_url}" class="breadcrumb-link">Yearly {year}</a>
        <span class="breadcrumb-separator">›</span>
        <a href="{monthly_url}" class="breadcrumb-link">{month_name}</a>
        <span class="breadcrumb-separator">›</span>
        <a href="{daily_url}" class="breadcrumb-link">Day {day}</a>
        <span class="breadcrumb-separator">›</span>
        <span class="breadcrumb-current">{investigation_id[:12]}...</span>
    </nav>
    """
