"""
Monthly Report Day Card Component.

Generates HTML for individual day cards in the monthly report.

Feature: monthly-sequential-analysis
"""

from typing import List

from app.schemas.monthly_analysis import DailyAnalysisResult


def generate_daily_breakdown(daily_results: List[DailyAnalysisResult]) -> str:
    """Generate HTML for daily breakdown cards."""
    html = ""
    for day_result in daily_results:
        html += generate_day_card(day_result)
    return html


def _generate_vendor_breakdown_html(vendor_gmv: dict) -> str:
    """Generate HTML for vendor GMV breakdown."""
    if not vendor_gmv:
        return ""

    # Sort by absolute GMV value (highest impact first)
    sorted_vendors = sorted(vendor_gmv.items(), key=lambda x: abs(x[1]), reverse=True)

    vendor_items = []
    for vendor, gmv in sorted_vendors:
        gmv_class = "color: var(--ok);" if gmv >= 0 else "color: var(--danger);"
        vendor_items.append(
            f'<span style="font-size: 0.75rem; {gmv_class}">'
            f'{vendor}: ${gmv:,.2f}</span>'
        )

    return " | ".join(vendor_items)


def generate_day_card(day: DailyAnalysisResult) -> str:
    """Generate HTML for a single day card."""
    date_str = day.date.strftime("%B %d, %Y")
    daily_report_date = day.date.strftime("%Y-%m-%d")
    net_class = "positive" if day.net_value >= 0 else "negative"

    # Get overall metrics with fallback to 0
    overall_tp = getattr(day, 'overall_tp', 0) or 0
    overall_fp = getattr(day, 'overall_fp', 0) or 0
    overall_tn = getattr(day, 'overall_tn', 0) or 0
    overall_fn = getattr(day, 'overall_fn', 0) or 0

    # Generate vendor breakdown
    vendor_breakdown = getattr(day, 'vendor_gmv_breakdown', {}) or {}
    vendor_html = _generate_vendor_breakdown_html(vendor_breakdown)

    # Build vendor breakdown row if data exists
    vendor_row = ""
    if vendor_html:
        vendor_row = f'''
            <div style="width: 100%; padding: 8px 20px 0 35px; font-size: 0.8rem;">
                <span style="color: var(--muted);">Vendors:</span> {vendor_html}
            </div>'''

    return f"""
    <div class="day-card" id="day-{day.day_of_month}">
        <div class="day-header" onclick="toggleDay({day.day_of_month})"
             style="flex-wrap: wrap;">
            <div>
                <span class="toggle-icon">▶</span>
                <strong style="margin-left: 10px;">{date_str}</strong>
                <span style="color: var(--muted); margin-left: 15px;">
                    {day.entities_discovered} entities
                </span>
            </div>
            <div>
                <span class="metric-value {net_class}" style="font-size: 1rem;">
                    ${float(day.net_value):,.2f}
                </span>
            </div>{vendor_row}
        </div>
        <div class="day-content" id="content-{day.day_of_month}">
            <p style="color: var(--muted); font-size: 0.85rem; margin-bottom: 10px;">
                <strong>Review Precision (Flagged Only)</strong>
            </p>
            <div class="day-stats">
                <div class="day-stat">
                    <div class="day-stat-value" style="color: var(--ok);">{day.tp}</div>
                    <div class="day-stat-label">True Positives</div>
                </div>
                <div class="day-stat">
                    <div class="day-stat-value" style="color: var(--danger);">{day.fp}</div>
                    <div class="day-stat-label">False Positives</div>
                </div>
                <div class="day-stat">
                    <div class="day-stat-value" style="color: var(--accent);">{day.tn}</div>
                    <div class="day-stat-label">True Negatives</div>
                </div>
                <div class="day-stat">
                    <div class="day-stat-value" style="color: var(--warn);">{day.fn}</div>
                    <div class="day-stat-label">False Negatives</div>
                </div>
            </div>
            <p style="color: var(--muted); font-size: 0.85rem; margin-top: 15px; margin-bottom: 10px;">
                <strong>Overall Classification (All Transactions)</strong>
            </p>
            <div class="day-stats">
                <div class="day-stat">
                    <div class="day-stat-value" style="color: var(--ok);">{overall_tp}</div>
                    <div class="day-stat-label">Overall TP</div>
                </div>
                <div class="day-stat">
                    <div class="day-stat-value" style="color: var(--danger);">{overall_fp}</div>
                    <div class="day-stat-label">Overall FP</div>
                </div>
                <div class="day-stat">
                    <div class="day-stat-value" style="color: var(--accent);">{overall_tn}</div>
                    <div class="day-stat-label">Overall TN</div>
                </div>
                <div class="day-stat">
                    <div class="day-stat-value" style="color: var(--warn);">{overall_fn}</div>
                    <div class="day-stat-label">Overall FN</div>
                </div>
            </div>
            <p style="color: var(--muted); font-size: 0.85rem; margin-top: 15px; margin-bottom: 10px;">
                <strong>Financial Impact</strong>
            </p>
            <div class="day-stats">
                <div class="day-stat">
                    <div class="day-stat-value" style="color: var(--ok);">
                        ${float(day.saved_fraud_gmv):,.2f}
                    </div>
                    <div class="day-stat-label">Saved GMV</div>
                </div>
                <div class="day-stat">
                    <div class="day-stat-value" style="color: var(--danger);">
                        ${float(day.lost_revenues):,.2f}
                    </div>
                    <div class="day-stat-label">Lost Revenues</div>
                </div>
            </div>
            <div style="margin-top: 15px; color: var(--muted); font-size: 0.9rem;">
                Duration: {day.duration_seconds:.1f}s |
                Investigations: {len(day.investigation_ids)}
            </div>
            <a href="startup_analysis_DAILY_{daily_report_date}.html"
               style="display: inline-block; margin-top: 12px; padding: 8px 16px;
                      background: var(--accent); color: white; border-radius: 6px;
                      text-decoration: none; font-size: 0.9rem;">
                📊 View Daily Report →
            </a>
        </div>
    </div>
    """
