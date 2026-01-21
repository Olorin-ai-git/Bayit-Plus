"""HTML generator for incremental reports."""

from datetime import datetime
from typing import Any, Dict, List, Optional

from .merchant_sections import generate_merchant_sections
from .navigation import generate_daily_navigation
from .selector_section import generate_selector_section_html
from .styles import get_incremental_report_scripts, get_incremental_report_styles
from .utils import safe_float, safe_int


def generate_incremental_html(
    investigations: List[Dict[str, Any]],
    blindspot_data: Optional[Dict[str, Any]] = None,
    investigated_blindspot_data: Optional[Dict[str, Any]] = None,
) -> str:
    """Generate the incremental HTML report with full financial analysis."""
    from app.service.reporting.components.blindspot_heatmap import generate_blindspot_section

    selector_metadata = investigations[0].get("selector_metadata") if investigations else None
    by_merchant = _group_by_merchant(investigations)
    totals = _calculate_totals(investigations)
    investigation_summary = _build_investigation_summary(investigations, totals)

    selector_section_html = generate_selector_section_html(
        selector_metadata, total_investigations=len(investigations), all_investigations=investigations
    )

    status_info = _determine_status(investigations, selector_metadata)
    report_date = _extract_report_date(selector_metadata)
    nav_html = generate_daily_navigation(report_date)

    blindspot_html = generate_blindspot_section(
        blindspot_data, include_placeholder=True, investigation_summary=investigation_summary,
        investigated_blindspot_data=investigated_blindspot_data,
    )

    return _build_html(investigations, by_merchant, totals, selector_section_html, status_info, nav_html, blindspot_html)


def _group_by_merchant(investigations: List[Dict]) -> Dict[str, List[Dict]]:
    """Group investigations by merchant."""
    by_merchant: Dict[str, List[Dict[str, Any]]] = {}
    for inv in investigations:
        merchant = inv.get("merchant_name", "Unknown Merchant")
        by_merchant.setdefault(merchant, []).append(inv)
    return by_merchant


def _calculate_totals(investigations: List[Dict]) -> Dict[str, Any]:
    """Calculate global totals from investigations."""
    total_saved = sum(safe_float(inv.get("revenue_data", {}).get("saved_fraud_gmv", 0)) for inv in investigations)
    total_lost = sum(safe_float(inv.get("revenue_data", {}).get("lost_revenues", 0)) for inv in investigations)

    return {
        "total_saved": total_saved, "total_lost": total_lost, "total_net": total_saved - total_lost,
        "total_tp": sum(safe_int(inv.get("confusion_matrix", {}).get("TP", 0)) for inv in investigations),
        "total_fp": sum(safe_int(inv.get("confusion_matrix", {}).get("FP", 0)) for inv in investigations),
        "total_tn": sum(safe_int(inv.get("confusion_matrix", {}).get("TN", 0)) for inv in investigations),
        "total_fn": sum(safe_int(inv.get("confusion_matrix", {}).get("FN", 0)) for inv in investigations),
        "overall_tp": sum(safe_int(inv.get("confusion_matrix", {}).get("overall_TP", 0)) for inv in investigations),
        "overall_fp": sum(safe_int(inv.get("confusion_matrix", {}).get("overall_FP", 0)) for inv in investigations),
        "overall_tn": sum(safe_int(inv.get("confusion_matrix", {}).get("overall_TN", 0)) for inv in investigations),
        "overall_fn": sum(safe_int(inv.get("confusion_matrix", {}).get("overall_FN", 0)) for inv in investigations),
    }


def _build_investigation_summary(investigations: List[Dict], totals: Dict) -> Dict[str, Any]:
    """Build investigation summary for blindspot section toggle."""
    inv_total_tx = totals["overall_tp"] + totals["overall_fp"] + totals["overall_tn"] + totals["overall_fn"]
    denom_precision = totals["overall_tp"] + totals["overall_fp"]
    denom_recall = totals["overall_tp"] + totals["overall_fn"]
    inv_precision = totals["overall_tp"] / denom_precision if denom_precision > 0 else 0
    inv_recall = totals["overall_tp"] / denom_recall if denom_recall > 0 else 0

    return {
        "total_transactions": inv_total_tx, "overall_precision": inv_precision, "overall_recall": inv_recall,
        "total_fraud_gmv": sum(safe_float(inv.get("revenue_data", {}).get("fraud_gmv", 0)) for inv in investigations),
        "total_fp_gmv": totals["total_lost"], "entity_count": len(investigations),
    }


def _determine_status(investigations: List[Dict], selector_metadata: Optional[Dict]) -> Dict[str, Any]:
    """Determine report status (complete/in-progress)."""
    is_daily = selector_metadata and selector_metadata.get("start_time")
    if is_daily:
        is_complete = len(investigations) > 0
    else:
        expected = selector_metadata.get("total_entities_expected", 0) if selector_metadata else 0
        is_complete = len(investigations) > 0 and (expected == 0 or len(investigations) >= expected)
    return {
        "status_class": "complete" if is_complete else "in-progress",
        "status_icon": "Complete" if is_complete else "In Progress",
        "status_text": "COMPLETED" if is_complete else "IN PROGRESS",
    }


def _extract_report_date(selector_metadata: Optional[Dict]) -> Optional[datetime]:
    """Extract report date from selector metadata."""
    if not selector_metadata or not selector_metadata.get("start_time"):
        return None
    start_time = selector_metadata.get("start_time")
    if isinstance(start_time, str):
        try:
            return datetime.fromisoformat(start_time.replace("Z", "+00:00"))
        except (ValueError, TypeError):
            return None
    return start_time if isinstance(start_time, datetime) else None


def _build_html(invs: List[Dict], by_merchant: Dict, totals: Dict, selector_html: str, status: Dict, nav: str, blindspot: str) -> str:
    """Build the complete HTML document."""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    styles = get_incremental_report_styles()
    scripts = get_incremental_report_scripts()
    merchant_html = generate_merchant_sections(by_merchant)
    blindspot_section = f'<section id="blindspot-analysis" style="margin-top: 40px;">{blindspot}</section>' if blindspot else ""
    t, net_class = totals, "positive" if totals["total_net"] >= 0 else "negative"

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Fraud Detection - Incremental Report</title><style>{styles}</style>
</head>
<body>
    {nav}
    <div class="header">
        <h1>Fraud Detection - Daily Report</h1>
        <p class="subtitle">Investigation results summary</p>
        <div class="status-badge {status['status_class']}">{status['status_icon']} - {len(invs)} investigations</div>
        <p class="subtitle" style="margin-top: 10px;">Last updated: {timestamp}</p>
    </div>
    {selector_html}
    <h2 style="margin-bottom: 10px;">Financial Impact Summary</h2>
    <p style="color: var(--muted); font-size: 0.85rem; margin-bottom: 15px;">Based on <strong>{len(invs)} investigated entities</strong> selected by Olorin's risk selector.</p>
    <div class="global-metrics">
        <div class="metric-card"><div class="metric-value positive">${t['total_saved']:,.2f}</div><div class="metric-label">Saved Fraud GMV</div></div>
        <div class="metric-card"><div class="metric-value negative">${t['total_lost']:,.2f}</div><div class="metric-label">Lost Revenues</div></div>
        <div class="metric-card"><div class="metric-value {net_class}">${t['total_net']:,.2f}</div><div class="metric-label">Net Value</div></div>
        <div class="metric-card"><div class="metric-value">{len(invs)}</div><div class="metric-label">Investigations</div></div>
    </div>
    <h2 style="margin-bottom: 20px;">Overall Classification (All Transactions)</h2>
    <p style="color: var(--muted); font-size: 12px; margin-bottom: 12px;">Classification across ALL transactions.</p>
    <div class="confusion-grid">
        <div class="cm-cell cm-tp">TP: {t['overall_tp']}<br><small>Fraud Caught</small></div>
        <div class="cm-cell cm-fp">FP: {t['overall_fp']}<br><small>False Alarms</small></div>
        <div class="cm-cell cm-fn">FN: {t['overall_fn']}<br><small>Fraud Missed</small></div>
        <div class="cm-cell cm-tn">TN: {t['overall_tn']}<br><small>Legit Confirmed</small></div>
    </div>
    <h2 style="margin: 20px 0;">Review Precision (Flagged Entities Only)</h2>
    <p style="color: var(--muted); font-size: 12px; margin-bottom: 12px;">Classification for flagged entities (above threshold).</p>
    <div class="confusion-grid">
        <div class="cm-cell cm-tp">TP: {t['total_tp']}<br><small>Fraud Caught</small></div>
        <div class="cm-cell cm-fp">FP: {t['total_fp']}<br><small>False Alarms</small></div>
        <div class="cm-cell cm-fn">FN: {t['total_fn']}<br><small>Fraud Missed</small></div>
        <div class="cm-cell cm-tn">TN: {t['total_tn']}<br><small>Legit Confirmed</small></div>
    </div>
    <h2 style="margin: 30px 0 20px;">Results by Merchant</h2>
    {merchant_html}{blindspot_section}
    <script>{scripts}</script>
</body>
</html>"""
