"""
Monthly Report Generator

Generates HTML reports for monthly sequential analysis.
Shows monthly totals at top with collapsible daily breakdown.

Feature: monthly-sequential-analysis
"""

from datetime import datetime
from pathlib import Path
from typing import Optional

from app.schemas.monthly_analysis import MonthlyAnalysisResult
from app.service.logging import get_bridge_logger
from app.service.reporting.components.blindspot_heatmap import generate_blindspot_section
from app.service.reporting.components.monthly_report_day_card import generate_daily_breakdown
from app.service.reporting.components.monthly_report_styles import get_monthly_report_styles
from app.service.reporting.components.navigation import ReportContext, get_monthly_breadcrumbs
from app.service.reporting.components.report_base import ReportBase
from app.service.reporting.components.transaction_analysis import (
    generate_transaction_analysis_section,
)

logger = get_bridge_logger(__name__)

ARTIFACTS_DIR = Path("artifacts")


async def generate_monthly_report(
    result: MonthlyAnalysisResult,
    blindspot_data: Optional[dict] = None,
    investigated_blindspot_data: Optional[dict] = None,
) -> Path:
    """Generate the monthly HTML report."""
    output_path = (
        ARTIFACTS_DIR / f"startup_analysis_MONTHLY_{result.year}_{result.month:02d}.html"
    )
    output_path.parent.mkdir(parents=True, exist_ok=True)

    html = _generate_html(result, blindspot_data, investigated_blindspot_data)
    output_path.write_text(html)

    logger.info(f"📊 Monthly report generated: {output_path}")
    return output_path


def _generate_html(
    result: MonthlyAnalysisResult,
    blindspot_data: Optional[dict] = None,
    investigated_blindspot_data: Optional[dict] = None,
) -> str:
    """Generate the full HTML content."""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    status_class = "complete" if result.is_complete else "in-progress"
    status_text = (
        f"{result.completed_days}/{result.total_days} Days Completed"
        if not result.is_complete
        else f"All {result.total_days} Days Completed"
    )

    # Calculate precision percentages for display
    precision_pct = f"{result.precision * 100:.2f}%" if result.precision else "N/A"
    recall_pct = f"{result.recall * 100:.2f}%" if result.recall else "N/A"
    f1_pct = f"{result.f1_score * 100:.2f}%" if result.f1_score else "N/A"
    roi_display = f"+{result.roi_percentage:.0f}%" if result.roi_percentage else "N/A"

    # Overall classification metrics
    overall_precision_pct = _get_metric_pct(result, 'overall_precision')
    overall_recall_pct = _get_metric_pct(result, 'overall_recall')
    overall_f1_pct = _get_metric_pct(result, 'overall_f1_score')

    daily_breakdown_html = generate_daily_breakdown(result.daily_results)
    blindspot_section_html = generate_blindspot_section(
        blindspot_data,
        include_placeholder=True,
        investigated_blindspot_data=investigated_blindspot_data,
    )
    styles = get_monthly_report_styles()

    return _build_html_template(
        result, timestamp, status_class, status_text,
        precision_pct, recall_pct, f1_pct, roi_display,
        overall_precision_pct, overall_recall_pct, overall_f1_pct,
        daily_breakdown_html, blindspot_section_html, styles
    )


def _get_metric_pct(result: MonthlyAnalysisResult, attr: str) -> str:
    """Get formatted percentage for a metric."""
    val = getattr(result, attr, None)
    return f"{val * 100:.2f}%" if val else "N/A"


def _build_html_template(
    result: MonthlyAnalysisResult, timestamp: str,
    status_class: str, status_text: str,
    precision_pct: str, recall_pct: str, f1_pct: str, roi_display: str,
    overall_precision_pct: str, overall_recall_pct: str, overall_f1_pct: str,
    daily_breakdown_html: str, blindspot_section_html: str, styles: str
) -> str:
    """Build the complete HTML template."""
    net_value_class = 'positive' if result.total_net_value >= 0 else 'negative'

    # Generate navigation breadcrumbs
    ctx = ReportContext(year=result.year, month=result.month, month_name=result.month_name)
    report_base = ReportBase("monthly", f"Monthly Report - {result.month_name} {result.year}")
    breadcrumbs = get_monthly_breadcrumbs(ctx)
    nav_html = report_base.generate_navigation(breadcrumbs)

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Monthly Fraud Analysis - {result.month_name} {result.year}</title>
    <style>{styles}</style>
</head>
<body>
    {nav_html}
    <div class="header">
        <h1>📅 Monthly Fraud Analysis Report</h1>
        <p class="subtitle">{result.month_name} {result.year}</p>
        <div class="status-badge {status_class}">{status_text}</div>
        <p class="subtitle" style="margin-top: 10px;">Last updated: {timestamp}</p>
    </div>

    {_generate_metrics_explanation()}

    <h2 style="margin-bottom: 20px; color: var(--accent);">💰 Monthly Totals</h2>
    <div class="totals-grid">
        <div class="metric-card">
            <div class="metric-value positive">${float(result.total_saved_fraud_gmv):,.2f}</div>
            <div class="metric-label">Saved Fraud GMV</div>
        </div>
        <div class="metric-card">
            <div class="metric-value negative">${float(result.total_lost_revenues):,.2f}</div>
            <div class="metric-label">Lost Revenues</div>
        </div>
        <div class="metric-card">
            <div class="metric-value {net_value_class}">${float(result.total_net_value):,.2f}</div>
            <div class="metric-label">Net Value</div>
        </div>
        <div class="metric-card">
            <div class="metric-value">{result.total_entities}</div>
            <div class="metric-label">Total Entities</div>
        </div>
    </div>

    {generate_transaction_analysis_section(
        tp=result.total_tp, fp=result.total_fp, fn=result.total_fn, tn=result.total_tn,
        title="Review Precision", subtitle="Flagged Transactions",
        precision=precision_pct, recall=recall_pct, f1_score=f1_pct, roi=roi_display)}

    {generate_transaction_analysis_section(
        tp=result.overall_total_tp, fp=result.overall_total_fp,
        fn=result.overall_total_fn, tn=result.overall_total_tn,
        title="Overall Classification", subtitle="All Transactions",
        precision=overall_precision_pct, recall=overall_recall_pct, f1_score=overall_f1_pct)}

    {blindspot_section_html}

    <div class="section-header">
        <h2>📆 Daily Breakdown</h2>
        <div class="controls">
            <button onclick="expandAll()">Expand All</button>
            <button onclick="collapseAll()">Collapse All</button>
        </div>
    </div>

    <div id="daily-breakdown">{daily_breakdown_html}</div>

    <script>
        function toggleDay(dayId) {{
            const card = document.getElementById('day-' + dayId);
            const content = document.getElementById('content-' + dayId);
            card.classList.toggle('open');
            content.classList.toggle('open');
        }}
        function expandAll() {{
            document.querySelectorAll('.day-card').forEach(c => c.classList.add('open'));
            document.querySelectorAll('.day-content').forEach(c => c.classList.add('open'));
        }}
        function collapseAll() {{
            document.querySelectorAll('.day-card').forEach(c => c.classList.remove('open'));
            document.querySelectorAll('.day-content').forEach(c => c.classList.remove('open'));
        }}
    </script>
</body>
</html>"""


def _generate_metrics_explanation() -> str:
    """Generate the metrics explanation section."""
    return """
    <div style="background: rgba(59, 130, 246, 0.1); border: 1px solid var(--border);
                border-radius: 12px; padding: 20px; margin-bottom: 30px;">
        <h3 style="color: var(--accent); margin-bottom: 15px;">
            📖 Understanding the Two Metric Types
        </h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <div>
                <h4 style="color: var(--ok); margin-bottom: 10px;">
                    📊 Review Precision (Flagged Only)
                </h4>
                <p style="color: var(--muted); font-size: 0.9rem; line-height: 1.6;">
                    Measures the quality of <strong>alerts sent for human review</strong>.
                </p>
            </div>
            <div>
                <h4 style="color: var(--accent); margin-bottom: 10px;">
                    🎯 Overall Classification (All Transactions)
                </h4>
                <p style="color: var(--muted); font-size: 0.9rem; line-height: 1.6;">
                    Measures the <strong>full classifier performance</strong> across ALL transactions.
                </p>
            </div>
        </div>
    </div>"""


