"""
Monthly Report Generator

Generates HTML reports for monthly sequential analysis.
Shows monthly totals at top with collapsible daily breakdown.

Feature: monthly-sequential-analysis
"""

from datetime import datetime
from pathlib import Path
from typing import Any

from app.schemas.monthly_analysis import DailyAnalysisResult, MonthlyAnalysisResult
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)

ARTIFACTS_DIR = Path("artifacts")


async def generate_monthly_report(result: MonthlyAnalysisResult) -> Path:
    """
    Generate the monthly HTML report.

    Args:
        result: MonthlyAnalysisResult with aggregated metrics

    Returns:
        Path to the generated HTML file
    """
    output_path = (
        ARTIFACTS_DIR / f"startup_analysis_MONTHLY_{result.year}_{result.month:02d}.html"
    )
    output_path.parent.mkdir(parents=True, exist_ok=True)

    html = _generate_html(result)
    output_path.write_text(html)

    logger.info(f"📊 Monthly report generated: {output_path}")
    return output_path


def _generate_html(result: MonthlyAnalysisResult) -> str:
    """Generate the full HTML content."""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    status_class = "complete" if result.is_complete else "in-progress"
    status_text = (
        f"{result.completed_days}/{result.total_days} Days Completed"
        if not result.is_complete
        else f"All {result.total_days} Days Completed"
    )

    # Calculate precision percentage for display
    precision_pct = f"{result.precision * 100:.2f}%" if result.precision else "N/A"
    recall_pct = f"{result.recall * 100:.2f}%" if result.recall else "N/A"
    f1_pct = f"{result.f1_score * 100:.2f}%" if result.f1_score else "N/A"
    roi_display = f"+{result.roi_percentage:.0f}%" if result.roi_percentage else "N/A"

    daily_breakdown_html = _generate_daily_breakdown(result.daily_results)

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Monthly Fraud Analysis - {result.month_name} {result.year}</title>
    <style>
        :root {{
            --bg: #0f172a;
            --card: #1e293b;
            --border: #334155;
            --text: #e2e8f0;
            --muted: #94a3b8;
            --ok: #22c55e;
            --warn: #f59e0b;
            --danger: #ef4444;
            --accent: #3b82f6;
        }}
        * {{ box-sizing: border-box; margin: 0; padding: 0; }}
        body {{
            font-family: 'Segoe UI', system-ui, sans-serif;
            background: var(--bg);
            color: var(--text);
            line-height: 1.6;
            padding: 20px;
        }}
        .header {{
            text-align: center;
            padding: 30px;
            border-bottom: 2px solid var(--accent);
            margin-bottom: 30px;
        }}
        h1 {{ color: var(--accent); font-size: 2rem; }}
        .subtitle {{ color: var(--muted); margin-top: 10px; }}
        .status-badge {{
            display: inline-block;
            padding: 5px 15px;
            border-radius: 20px;
            font-weight: bold;
            margin-top: 15px;
        }}
        .status-badge.complete {{ background: var(--ok); color: #000; }}
        .status-badge.in-progress {{ background: var(--warn); color: #000; }}
        .totals-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }}
        .metric-card {{
            background: var(--card);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 20px;
            text-align: center;
        }}
        .metric-value {{
            font-size: 1.8rem;
            font-weight: bold;
        }}
        .metric-value.positive {{ color: var(--ok); }}
        .metric-value.negative {{ color: var(--danger); }}
        .metric-label {{ color: var(--muted); margin-top: 5px; font-size: 0.9rem; }}
        .confusion-grid {{
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
            max-width: 400px;
            margin: 20px auto;
        }}
        .cm-cell {{
            padding: 15px;
            text-align: center;
            border-radius: 8px;
            font-weight: bold;
        }}
        .cm-tp {{ background: rgba(34, 197, 94, 0.2); color: var(--ok); }}
        .cm-fp {{ background: rgba(239, 68, 68, 0.2); color: var(--danger); }}
        .cm-tn {{ background: rgba(59, 130, 246, 0.2); color: var(--accent); }}
        .cm-fn {{ background: rgba(245, 158, 11, 0.2); color: var(--warn); }}
        .metrics-row {{
            display: flex;
            justify-content: center;
            gap: 30px;
            margin: 20px 0;
            flex-wrap: wrap;
        }}
        .metric-pill {{
            background: rgba(59, 130, 246, 0.15);
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 0.9rem;
        }}
        .section-header {{
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin: 30px 0 20px;
        }}
        .section-header h2 {{ color: var(--accent); }}
        .controls button {{
            background: var(--card);
            border: 1px solid var(--border);
            color: var(--text);
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            margin-left: 10px;
        }}
        .controls button:hover {{ background: var(--border); }}
        .day-card {{
            background: var(--card);
            border: 1px solid var(--border);
            border-radius: 8px;
            margin-bottom: 10px;
            overflow: hidden;
        }}
        .day-header {{
            padding: 15px 20px;
            cursor: pointer;
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: rgba(59, 130, 246, 0.1);
        }}
        .day-header:hover {{ background: rgba(59, 130, 246, 0.15); }}
        .day-content {{ padding: 20px; display: none; }}
        .day-content.open {{ display: block; }}
        .day-stats {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            gap: 15px;
        }}
        .day-stat {{
            text-align: center;
            padding: 10px;
            background: rgba(0,0,0,0.2);
            border-radius: 6px;
        }}
        .day-stat-value {{ font-size: 1.2rem; font-weight: bold; }}
        .day-stat-label {{ font-size: 0.8rem; color: var(--muted); }}
        .toggle-icon {{ font-size: 1.2rem; transition: transform 0.2s; }}
        .day-card.open .toggle-icon {{ transform: rotate(90deg); }}
    </style>
</head>
<body>
    <div class="header">
        <h1>📅 Monthly Fraud Analysis Report</h1>
        <p class="subtitle">{result.month_name} {result.year}</p>
        <div class="status-badge {status_class}">{status_text}</div>
        <p class="subtitle" style="margin-top: 10px;">Last updated: {timestamp}</p>
    </div>

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
            <div class="metric-value {'positive' if result.total_net_value >= 0 else 'negative'}">${float(result.total_net_value):,.2f}</div>
            <div class="metric-label">Net Value</div>
        </div>
        <div class="metric-card">
            <div class="metric-value">{result.total_entities}</div>
            <div class="metric-label">Total Entities</div>
        </div>
    </div>

    <h2 style="margin-bottom: 20px; color: var(--accent);">📊 Confusion Matrix</h2>
    <div class="confusion-grid">
        <div class="cm-cell cm-tp">TP: {result.total_tp}<br><small>Fraud Caught</small></div>
        <div class="cm-cell cm-fp">FP: {result.total_fp}<br><small>False Alarms</small></div>
        <div class="cm-cell cm-fn">FN: {result.total_fn}<br><small>Fraud Missed</small></div>
        <div class="cm-cell cm-tn">TN: {result.total_tn}<br><small>Legit Confirmed</small></div>
    </div>

    <div class="metrics-row">
        <div class="metric-pill"><strong>Precision:</strong> {precision_pct}</div>
        <div class="metric-pill"><strong>Recall:</strong> {recall_pct}</div>
        <div class="metric-pill"><strong>F1 Score:</strong> {f1_pct}</div>
        <div class="metric-pill"><strong>ROI:</strong> {roi_display}</div>
    </div>

    <div class="section-header">
        <h2>📆 Daily Breakdown</h2>
        <div class="controls">
            <button onclick="expandAll()">Expand All</button>
            <button onclick="collapseAll()">Collapse All</button>
        </div>
    </div>

    <div id="daily-breakdown">
        {daily_breakdown_html}
    </div>

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


def _generate_daily_breakdown(daily_results: list) -> str:
    """Generate HTML for daily breakdown cards."""
    html = ""
    for day_result in daily_results:
        html += _generate_day_card(day_result)
    return html


def _generate_day_card(day: DailyAnalysisResult) -> str:
    """Generate HTML for a single day card."""
    date_str = day.date.strftime("%B %d, %Y")
    net_class = "positive" if day.net_value >= 0 else "negative"

    return f"""
    <div class="day-card" id="day-{day.day_of_month}">
        <div class="day-header" onclick="toggleDay({day.day_of_month})">
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
            </div>
        </div>
        <div class="day-content" id="content-{day.day_of_month}">
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
                <div class="day-stat">
                    <div class="day-stat-value" style="color: var(--ok);">${float(day.saved_fraud_gmv):,.2f}</div>
                    <div class="day-stat-label">Saved GMV</div>
                </div>
                <div class="day-stat">
                    <div class="day-stat-value" style="color: var(--danger);">${float(day.lost_revenues):,.2f}</div>
                    <div class="day-stat-label">Lost Revenues</div>
                </div>
            </div>
            <div style="margin-top: 15px; color: var(--muted); font-size: 0.9rem;">
                Duration: {day.duration_seconds:.1f}s |
                Investigations: {len(day.investigation_ids)}
            </div>
        </div>
    </div>
    """
