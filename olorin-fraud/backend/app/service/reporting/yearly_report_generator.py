"""
Yearly Report Generator

Generates HTML reports for yearly aggregated analysis.
Shows 12 monthly cards in a grid with drill-down navigation.

Feature: unified-report-hierarchy
"""

from datetime import datetime
from pathlib import Path
from typing import Optional

from app.schemas.yearly_analysis import YearlyAnalysisResult
from app.service.logging import get_bridge_logger
from app.service.reporting.components.navigation import (
    ReportContext,
    generate_monthly_drill_items,
    get_yearly_breadcrumbs,
)
from app.service.reporting.components.report_base import ReportBase
from app.service.reporting.components.transaction_analysis import (
    generate_transaction_analysis_section,
)
from app.service.reporting.components.unified_styles import get_unified_styles

logger = get_bridge_logger(__name__)

ARTIFACTS_DIR = Path("artifacts")


async def generate_yearly_report(
    result: YearlyAnalysisResult,
    output_path: Optional[Path] = None,
) -> Path:
    """
    Generate the yearly HTML report.

    Args:
        result: YearlyAnalysisResult with aggregated metrics
        output_path: Optional custom output path

    Returns:
        Path to generated report
    """
    if output_path is None:
        output_path = ARTIFACTS_DIR / f"yearly_{result.year}.html"
    output_path.parent.mkdir(parents=True, exist_ok=True)

    html = _generate_html(result)
    output_path.write_text(html)

    logger.info(f"📅 Yearly report generated: {output_path}")
    return output_path


def _generate_html(result: YearlyAnalysisResult) -> str:
    """Generate the full HTML content for yearly report."""
    report_base = ReportBase(
        report_type="yearly",
        title=f"📅 Yearly Fraud Analysis Report - {result.year}",
    )

    ctx = ReportContext(year=result.year)
    breadcrumbs = get_yearly_breadcrumbs(ctx)

    status_class = "complete" if result.is_complete else "in-progress"
    status_text = (
        f"All {result.completed_months} Months Complete"
        if result.is_complete
        else f"{result.completed_months}/{result.total_months} Months Complete"
    )

    # Build content sections
    header_html = report_base.generate_header(
        subtitle=f"Annual Summary for {result.year}",
        status_text=status_text,
        status_class=status_class,
    )
    nav_html = report_base.generate_navigation(breadcrumbs)
    totals_html = _generate_totals_section(result)
    ta_html = _generate_transaction_analysis(result)
    monthly_grid_html = _generate_monthly_grid(result, report_base)
    footer_html = report_base.generate_footer()

    styles = get_unified_styles()

    content = f"""
        {nav_html}
        {header_html}
        {totals_html}
        {ta_html}
        <h2 style="margin: 30px 0 20px; color: var(--accent);">
            📆 Monthly Breakdown
        </h2>
        {monthly_grid_html}
        {footer_html}
    """

    return report_base.wrap_html(content, styles)


def _generate_totals_section(result: YearlyAnalysisResult) -> str:
    """Generate yearly totals cards."""
    net_class = "positive" if result.total_net_value >= 0 else "negative"

    return f"""
    <h2 style="margin-bottom: 20px; color: var(--accent);">💰 Yearly Totals</h2>
    <div class="totals-grid">
        <div class="metric-card">
            <div class="metric-value positive">
                ${float(result.total_saved_fraud_gmv):,.2f}
            </div>
            <div class="metric-label">Saved Fraud GMV</div>
        </div>
        <div class="metric-card">
            <div class="metric-value negative">
                ${float(result.total_lost_revenues):,.2f}
            </div>
            <div class="metric-label">Lost Revenues</div>
        </div>
        <div class="metric-card">
            <div class="metric-value {net_class}">
                ${float(result.total_net_value):,.2f}
            </div>
            <div class="metric-label">Net Value</div>
        </div>
        <div class="metric-card">
            <div class="metric-value">{result.total_entities:,}</div>
            <div class="metric-label">Total Entities</div>
        </div>
        <div class="metric-card">
            <div class="metric-value">{result.total_investigations:,}</div>
            <div class="metric-label">Investigations</div>
        </div>
        <div class="metric-card">
            <div class="metric-value">{result.completed_months}</div>
            <div class="metric-label">Months Analyzed</div>
        </div>
    </div>
    """


def _generate_transaction_analysis(result: YearlyAnalysisResult) -> str:
    """Generate transaction analysis sections."""
    precision_pct = f"{result.precision * 100:.2f}%" if result.precision else "N/A"
    recall_pct = f"{result.recall * 100:.2f}%" if result.recall else "N/A"
    f1_pct = f"{result.f1_score * 100:.2f}%" if result.f1_score else "N/A"
    roi = f"+{result.roi_percentage:.0f}%" if result.roi_percentage else "N/A"

    overall_precision = (
        f"{result.overall_precision * 100:.2f}%"
        if result.overall_precision
        else "N/A"
    )
    overall_recall = (
        f"{result.overall_recall * 100:.2f}%" if result.overall_recall else "N/A"
    )
    overall_f1 = (
        f"{result.overall_f1_score * 100:.2f}%" if result.overall_f1_score else "N/A"
    )

    return f"""
    {generate_transaction_analysis_section(
        tp=result.total_tp, fp=result.total_fp,
        fn=result.total_fn, tn=result.total_tn,
        title="Review Precision", subtitle="Flagged Transactions",
        precision=precision_pct, recall=recall_pct, f1_score=f1_pct, roi=roi
    )}

    {generate_transaction_analysis_section(
        tp=result.overall_total_tp, fp=result.overall_total_fp,
        fn=result.overall_total_fn, tn=result.overall_total_tn,
        title="Overall Classification", subtitle="All Transactions",
        precision=overall_precision, recall=overall_recall, f1_score=overall_f1
    )}
    """


def _generate_monthly_grid(
    result: YearlyAnalysisResult, report_base: ReportBase
) -> str:
    """Generate 12 monthly drill-down cards in 4x3 grid."""
    drill_items = generate_monthly_drill_items(
        year=result.year,
        monthly_data=result.monthly_results,
        base_path=".",
    )

    if not drill_items:
        return """
        <div style="text-align: center; padding: 40px; color: var(--muted);">
            No monthly data available yet.
        </div>
        """

    return report_base.generate_drill_down_grid(drill_items, columns=4)
