"""
Monthly Report Section Components.

Reusable HTML sections for the monthly fraud analysis report.

Feature: monthly-sequential-analysis
"""

from typing import Optional


def generate_metrics_explanation() -> str:
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
                    Measures the <strong>full classifier performance</strong> across ALL.
                </p>
            </div>
        </div>
    </div>"""


def generate_confusion_section(
    title: str, subtitle: str, tp: int, fp: int, fn: int, tn: int,
    precision: str, recall: str, f1: str, roi: Optional[str] = None
) -> str:
    """Generate a confusion matrix section."""
    roi_pill = f'<div class="metric-pill"><strong>ROI:</strong> {roi}</div>' if roi else ""

    return f"""
    <h2 style="margin-bottom: 10px; color: var(--accent);">📊 {title} ({subtitle})</h2>
    <div class="confusion-grid">
        <div class="cm-cell cm-tp">TP: {tp}<br><small>Fraud Caught</small></div>
        <div class="cm-cell cm-fp">FP: {fp}<br><small>False Alarms</small></div>
        <div class="cm-cell cm-fn">FN: {fn}<br><small>Fraud Missed</small></div>
        <div class="cm-cell cm-tn">TN: {tn}<br><small>Legit Confirmed</small></div>
    </div>
    <div class="metrics-row">
        <div class="metric-pill"><strong>Precision:</strong> {precision}</div>
        <div class="metric-pill"><strong>Recall:</strong> {recall}</div>
        <div class="metric-pill"><strong>F1 Score:</strong> {f1}</div>
        {roi_pill}
    </div>"""


def generate_totals_grid(
    saved_gmv: float, lost_revenues: float, net_value: float,
    total_entities: int
) -> str:
    """Generate the monthly totals grid."""
    net_class = 'positive' if net_value >= 0 else 'negative'

    return f"""
    <h2 style="margin-bottom: 20px; color: var(--accent);">💰 Monthly Totals</h2>
    <div class="totals-grid">
        <div class="metric-card">
            <div class="metric-value positive">${saved_gmv:,.2f}</div>
            <div class="metric-label">Saved Fraud GMV</div>
        </div>
        <div class="metric-card">
            <div class="metric-value negative">${lost_revenues:,.2f}</div>
            <div class="metric-label">Lost Revenues</div>
        </div>
        <div class="metric-card">
            <div class="metric-value {net_class}">${net_value:,.2f}</div>
            <div class="metric-label">Net Value</div>
        </div>
        <div class="metric-card">
            <div class="metric-value">{total_entities}</div>
            <div class="metric-label">Total Entities</div>
        </div>
    </div>"""


def generate_daily_section_header() -> str:
    """Generate the daily breakdown section header."""
    return """
    <div class="section-header">
        <h2>📆 Daily Breakdown</h2>
        <div class="controls">
            <button onclick="expandAll()">Expand All</button>
            <button onclick="collapseAll()">Collapse All</button>
        </div>
    </div>"""


def generate_toggle_script() -> str:
    """Generate the JavaScript for toggling day cards."""
    return """
    <script>
        function toggleDay(dayId) {
            const card = document.getElementById('day-' + dayId);
            const content = document.getElementById('content-' + dayId);
            card.classList.toggle('open');
            content.classList.toggle('open');
        }
        function expandAll() {
            document.querySelectorAll('.day-card').forEach(c => c.classList.add('open'));
            document.querySelectorAll('.day-content').forEach(c => c.classList.add('open'));
        }
        function collapseAll() {
            document.querySelectorAll('.day-card').forEach(c => c.classList.remove('open'));
            document.querySelectorAll('.day-content').forEach(c => c.classList.remove('open'));
        }
    </script>"""
