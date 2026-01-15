"""
Transaction Analysis Report Component.

Generates improved HTML for individual investigation transaction analysis reports
with breadcrumb navigation, visual matrix, ROI metrics, and verdict badges.

Replaces the legacy "Confusion Table" terminology.

Feature: unified-report-hierarchy
"""

from datetime import datetime
from typing import Any, Dict, Optional

from app.service.reporting.components.confusion_matrix_section import (
    generate_confusion_matrix_section,
)
from app.service.reporting.components.financial_analysis_section import (
    calculate_roi,
    generate_financial_summary_cards,
)
from app.service.reporting.components.report_base import ReportBase
from app.service.reporting.components.unified_styles import get_unified_styles


def generate_transaction_analysis_report(
    investigation_id: str,
    entity_type: str,
    entity_value: str,
    merchant_name: str,
    risk_score: Optional[float],
    risk_threshold: float,
    window_start: datetime,
    window_end: datetime,
    transaction_count: int,
    matrix_data: Dict[str, Any],
    revenue_data: Optional[Dict[str, Any]],
) -> str:
    """
    Generate complete HTML for transaction analysis report.

    Args:
        investigation_id: Investigation ID
        entity_type: Entity type (email, etc.)
        entity_value: Entity value
        merchant_name: Merchant name
        risk_score: Overall risk score (0-1)
        risk_threshold: Risk threshold used
        window_start: Investigation window start
        window_end: Investigation window end
        transaction_count: Total transactions analyzed
        matrix_data: Confusion matrix data with TP/FP/TN/FN
        revenue_data: Financial analysis data

    Returns:
        Complete HTML string
    """
    report_base = ReportBase(
        report_type="transaction_analysis",
        title="Transaction Analysis Report",
    )

    # Extract metrics
    tp = matrix_data.get("TP", 0)
    fp = matrix_data.get("FP", 0)
    tn = matrix_data.get("TN", 0)
    fn = matrix_data.get("FN", 0)
    excluded = matrix_data.get("excluded_count", 0)
    precision = matrix_data.get("precision", 0)
    recall = matrix_data.get("recall", 0)
    f1 = matrix_data.get("f1_score", 0)
    accuracy = matrix_data.get("accuracy", 0)

    # Financial data
    saved_gmv = revenue_data.get("saved_fraud_gmv", 0) if revenue_data else 0
    lost_rev = revenue_data.get("potential_lost_revenues", 0) if revenue_data else 0
    net_val = revenue_data.get("net_value", 0) if revenue_data else 0
    gmv_start = revenue_data.get("gmv_window_start", "") if revenue_data else ""
    gmv_end = revenue_data.get("gmv_window_end", "") if revenue_data else ""

    # Calculate ROI using shared function
    roi_display = calculate_roi(net_val, lost_rev)

    # Determine verdict
    fraud_rate = tp / (tp + fp) if (tp + fp) > 0 else 0
    verdict = _get_verdict(risk_score, risk_threshold, fraud_rate, net_val)

    # Build sections using shared components
    nav_html = _generate_navigation(investigation_id, window_start)
    header_html = _generate_header(
        investigation_id, entity_type, entity_value, merchant_name,
        risk_score, risk_threshold, window_start, window_end, transaction_count
    )
    verdict_html = _generate_verdict_badge(verdict, fraud_rate, net_val, roi_display)

    # Use shared financial summary cards
    summary_html = generate_financial_summary_cards(
        saved_gmv, lost_rev, net_val, roi_display, gmv_start, gmv_end
    )

    # Use shared confusion matrix section
    matrix_html = generate_confusion_matrix_section(
        tp=tp, fp=fp, tn=tn, fn=fn, excluded=excluded,
        precision=precision, recall=recall, f1_score=f1, accuracy=accuracy,
        risk_threshold=risk_threshold, entity_count=1,
        show_visual_grid=True, show_metrics_cards=True,
        show_entity_breakdown=False
    )

    footer_html = report_base.generate_footer()

    styles = get_unified_styles()
    content = f"""
        {nav_html}
        {header_html}
        {verdict_html}
        {summary_html}
        {matrix_html}
        {footer_html}
    """

    return report_base.wrap_html(content, styles)


def _generate_navigation(investigation_id: str, window_start: datetime) -> str:
    """Generate breadcrumb navigation."""
    year = window_start.year
    month = window_start.month
    day = window_start.day

    import calendar
    month_name = calendar.month_name[month]

    return f"""
    <nav class="breadcrumb-nav">
        <a href="../yearly_{year}.html" class="breadcrumb-link">Yearly {year}</a>
        <span class="breadcrumb-separator">›</span>
        <a href="../startup_analysis_MONTHLY_{year}_{month:02d}.html" class="breadcrumb-link">{month_name}</a>
        <span class="breadcrumb-separator">›</span>
        <a href="../startup_analysis_DAILY_{year}-{month:02d}-{day:02d}.html" class="breadcrumb-link">Day {day}</a>
        <span class="breadcrumb-separator">›</span>
        <span class="breadcrumb-current">{investigation_id[:16]}...</span>
    </nav>
    """


def _generate_header(
    investigation_id: str, entity_type: str, entity_value: str,
    merchant_name: str, risk_score: Optional[float], risk_threshold: float,
    window_start: datetime, window_end: datetime, transaction_count: int
) -> str:
    """Generate report header with metadata."""
    risk_display = f"{risk_score:.1%}" if risk_score is not None else "N/A"
    threshold_display = f"{risk_threshold:.0%}"

    return f"""
    <div class="header">
        <h1>📊 Transaction Analysis Report</h1>
        <p class="subtitle">Investigation: <code>{investigation_id}</code></p>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-top: 16px;">
            <div>
                <span style="color: var(--muted);">Entity:</span>
                <span style="font-weight: 600;">{entity_type}:{entity_value}</span>
            </div>
            <div>
                <span style="color: var(--muted);">Merchant:</span>
                <span style="color: var(--accent-secondary); font-weight: 600;">{merchant_name}</span>
            </div>
            <div>
                <span style="color: var(--muted);">Risk Score:</span>
                <span style="font-weight: 600;">{risk_display}</span>
                <span style="color: var(--muted); font-size: 0.85rem;">(threshold: {threshold_display})</span>
            </div>
            <div>
                <span style="color: var(--muted);">Transactions:</span>
                <span style="font-weight: 600;">{transaction_count}</span>
            </div>
        </div>
        <p style="color: var(--muted); font-size: 0.85rem; margin-top: 12px;">
            Analysis Period: {window_start.strftime('%b %d, %Y')} to {window_end.strftime('%b %d, %Y')}
        </p>
    </div>
    """


def _get_verdict(risk_score: Optional[float], threshold: float, fraud_rate: float, net_val: float) -> Dict:
    """Determine verdict based on metrics."""
    if risk_score is None:
        return {"label": "UNKNOWN", "class": "warning", "icon": "❓"}

    if risk_score >= threshold and fraud_rate >= 0.5:
        return {"label": "CONFIRMED FRAUDSTER", "class": "danger", "icon": "🚨"}
    elif risk_score >= threshold and net_val > 0:
        return {"label": "HIGH RISK - PROFITABLE BLOCK", "class": "warning", "icon": "⚠️"}
    elif risk_score >= threshold:
        return {"label": "HIGH RISK", "class": "warning", "icon": "⚠️"}
    else:
        return {"label": "LOW RISK", "class": "ok", "icon": "✅"}


def _generate_verdict_badge(verdict: Dict, fraud_rate: float, net_val: float, roi: str) -> str:
    """Generate verdict badge section."""
    color = f"var(--{verdict['class']})"
    return f"""
    <div style="margin: 20px 0; padding: 20px; background: linear-gradient(135deg, {color}22, {color}11);
                border: 2px solid {color}; border-radius: 12px; text-align: center;">
        <div style="font-size: 2rem;">{verdict['icon']}</div>
        <div style="font-size: 1.5rem; font-weight: bold; color: {color}; margin: 8px 0;">
            {verdict['label']}
        </div>
        <div style="color: var(--muted); font-size: 0.9rem;">
            {fraud_rate:.0%} fraud rate • ${net_val:,.2f} net value • {roi} ROI
        </div>
    </div>
    """


# NOTE: _generate_financial_summary, _generate_visual_matrix, and _generate_metrics_cards
# have been removed in favor of shared components:
# - generate_financial_summary_cards from financial_analysis_section.py
# - generate_confusion_matrix_section from confusion_matrix_section.py
