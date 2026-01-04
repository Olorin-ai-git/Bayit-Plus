"""
Monthly Report CSS Styles.

CSS stylesheet for the monthly fraud analysis report.

Feature: monthly-sequential-analysis
"""


def get_monthly_report_styles() -> str:
    """Return the CSS styles for the monthly report."""
    return """
        :root {
            --bg: #0f172a;
            --card: #1e293b;
            --border: #334155;
            --text: #e2e8f0;
            --muted: #94a3b8;
            --ok: #22c55e;
            --warn: #f59e0b;
            --danger: #ef4444;
            --accent: #3b82f6;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: 'Segoe UI', system-ui, sans-serif;
            background: var(--bg);
            color: var(--text);
            line-height: 1.6;
            padding: 20px;
        }
        .header {
            text-align: center;
            padding: 30px;
            border-bottom: 2px solid var(--accent);
            margin-bottom: 30px;
        }
        h1 { color: var(--accent); font-size: 2rem; }
        .subtitle { color: var(--muted); margin-top: 10px; }
        .status-badge {
            display: inline-block;
            padding: 5px 15px;
            border-radius: 20px;
            font-weight: bold;
            margin-top: 15px;
        }
        .status-badge.complete { background: var(--ok); color: #000; }
        .status-badge.in-progress { background: var(--warn); color: #000; }
        .totals-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }
        .metric-card {
            background: var(--card);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 20px;
            text-align: center;
        }
        .metric-value {
            font-size: 1.8rem;
            font-weight: bold;
        }
        .metric-value.positive { color: var(--ok); }
        .metric-value.negative { color: var(--danger); }
        .metric-label { color: var(--muted); margin-top: 5px; font-size: 0.9rem; }
        .confusion-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
            max-width: 400px;
            margin: 20px auto;
        }
        .cm-cell {
            padding: 15px;
            text-align: center;
            border-radius: 8px;
            font-weight: bold;
        }
        .cm-tp { background: rgba(34, 197, 94, 0.2); color: var(--ok); }
        .cm-fp { background: rgba(239, 68, 68, 0.2); color: var(--danger); }
        .cm-tn { background: rgba(59, 130, 246, 0.2); color: var(--accent); }
        .cm-fn { background: rgba(245, 158, 11, 0.2); color: var(--warn); }
        .metrics-row {
            display: flex;
            justify-content: center;
            gap: 30px;
            margin: 20px 0;
            flex-wrap: wrap;
        }
        .metric-pill {
            background: rgba(59, 130, 246, 0.15);
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 0.9rem;
        }
        .section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin: 30px 0 20px;
        }
        .section-header h2 { color: var(--accent); }
        .controls button {
            background: var(--card);
            border: 1px solid var(--border);
            color: var(--text);
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            margin-left: 10px;
        }
        .controls button:hover { background: var(--border); }
        .day-card {
            background: var(--card);
            border: 1px solid var(--border);
            border-radius: 8px;
            margin-bottom: 10px;
            overflow: hidden;
        }
        .day-header {
            padding: 15px 20px;
            cursor: pointer;
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: rgba(59, 130, 246, 0.1);
        }
        .day-header:hover { background: rgba(59, 130, 246, 0.15); }
        .day-content { padding: 20px; display: none; }
        .day-content.open { display: block; }
        .day-stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            gap: 15px;
        }
        .day-stat {
            text-align: center;
            padding: 10px;
            background: rgba(0,0,0,0.2);
            border-radius: 6px;
        }
        .day-stat-value { font-size: 1.2rem; font-weight: bold; }
        .day-stat-label { font-size: 0.8rem; color: var(--muted); }
        .toggle-icon { font-size: 1.2rem; transition: transform 0.2s; }
        .day-card.open .toggle-icon { transform: rotate(90deg); }
    """
