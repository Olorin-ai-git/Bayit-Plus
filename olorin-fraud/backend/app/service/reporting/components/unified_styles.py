"""
Unified CSS Styles for all report types.

Consolidates styles from monthly_report_styles, enhanced_html_generator,
and other report generators into a single consistent stylesheet.

Feature: unified-report-hierarchy
"""


def get_unified_styles() -> str:
    """
    Return consolidated CSS styles for all report types.

    Returns:
        Complete CSS stylesheet as string
    """
    return f"""
        {_get_css_variables()}
        {_get_base_styles()}
        {_get_header_styles()}
        {_get_navigation_styles()}
        {_get_card_styles()}
        {_get_transaction_analysis_styles()}
        {_get_drill_down_styles()}
        {_get_footer_styles()}
        {_get_responsive_styles()}
    """


def _get_css_variables() -> str:
    """CSS custom properties for theming."""
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
            --accent-hover: #2563eb;
        }
    """


def _get_base_styles() -> str:
    """Base element styles and resets."""
    return """
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: 'Segoe UI', system-ui, sans-serif;
            background: var(--bg);
            color: var(--text);
            line-height: 1.6;
            padding: 20px;
            min-height: 100vh;
        }
        a { color: var(--accent); text-decoration: none; }
        a:hover { color: var(--accent-hover); text-decoration: underline; }
        h1, h2, h3 { color: var(--accent); margin-bottom: 15px; }
        h1 { font-size: 2rem; }
        h2 { font-size: 1.5rem; }
        h3 { font-size: 1.2rem; }
    """


def _get_header_styles() -> str:
    """Report header styles."""
    return """
        .header {
            text-align: center;
            padding: 30px;
            border-bottom: 2px solid var(--accent);
            margin-bottom: 30px;
        }
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
    """


def _get_navigation_styles() -> str:
    """Breadcrumb and navigation styles."""
    return """
        .breadcrumb-nav {
            background: var(--card);
            padding: 12px 20px;
            border-radius: 8px;
            margin-bottom: 25px;
            border: 1px solid var(--border);
        }
        .breadcrumb-link {
            color: var(--accent);
            font-weight: 500;
        }
        .breadcrumb-link:hover {
            text-decoration: underline;
        }
        .breadcrumb-separator {
            color: var(--muted);
            margin: 0 10px;
            font-size: 1.1rem;
        }
        .breadcrumb-current {
            color: var(--text);
            font-weight: 600;
        }
    """


def _get_card_styles() -> str:
    """Metric cards and grid layouts."""
    return """
        .totals-grid, .metrics-grid {
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
        .section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin: 30px 0 20px;
        }
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
    """


def _get_transaction_analysis_styles() -> str:
    """Transaction analysis (formerly confusion matrix) styles."""
    return """
        .transaction-analysis {
            margin: 30px 0;
        }
        .ta-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
            max-width: 400px;
            margin: 20px auto;
        }
        .ta-cell {
            padding: 15px;
            text-align: center;
            border-radius: 8px;
            font-weight: bold;
        }
        .ta-tp { background: rgba(34, 197, 94, 0.2); color: var(--ok); }
        .ta-fp { background: rgba(239, 68, 68, 0.2); color: var(--danger); }
        .ta-tn { background: rgba(59, 130, 246, 0.2); color: var(--accent); }
        .ta-fn { background: rgba(245, 158, 11, 0.2); color: var(--warn); }
        /* Legacy class aliases for backwards compatibility */
        .confusion-grid { display: grid; grid-template-columns: repeat(2, 1fr);
                         gap: 10px; max-width: 400px; margin: 20px auto; }
        .cm-cell { padding: 15px; text-align: center; border-radius: 8px; font-weight: bold; }
        .cm-tp { background: rgba(34, 197, 94, 0.2); color: var(--ok); }
        .cm-fp { background: rgba(239, 68, 68, 0.2); color: var(--danger); }
        .cm-tn { background: rgba(59, 130, 246, 0.2); color: var(--accent); }
        .cm-fn { background: rgba(245, 158, 11, 0.2); color: var(--warn); }
    """


def _get_drill_down_styles() -> str:
    """Drill-down navigation and grid styles."""
    return """
        .drill-grid {
            display: grid;
            gap: 15px;
            margin: 25px 0;
        }
        .drill-card {
            background: var(--card);
            border: 1px solid var(--border);
            border-radius: 10px;
            padding: 20px;
            text-align: center;
            text-decoration: none;
            transition: all 0.2s ease;
        }
        .drill-card:hover {
            border-color: var(--accent);
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
            text-decoration: none;
        }
        .drill-card-label {
            color: var(--text);
            font-weight: 600;
            font-size: 1rem;
            margin-bottom: 8px;
        }
        .drill-card-value {
            font-size: 1.4rem;
            font-weight: bold;
            margin-bottom: 5px;
        }
        .drill-card-value.positive { color: var(--ok); }
        .drill-card-value.negative { color: var(--danger); }
        .drill-card-subtitle {
            color: var(--muted);
            font-size: 0.8rem;
        }
        .drill-down-link {
            display: inline-flex;
            align-items: center;
            gap: 5px;
            color: var(--accent);
            font-weight: 500;
            padding: 8px 16px;
            border-radius: 6px;
            background: rgba(59, 130, 246, 0.1);
            transition: background 0.2s;
        }
        .drill-down-link:hover {
            background: rgba(59, 130, 246, 0.2);
            text-decoration: none;
        }
    """


def _get_footer_styles() -> str:
    """Report footer styles."""
    return """
        .report-footer {
            text-align: center;
            padding: 30px 20px;
            margin-top: 50px;
            border-top: 1px solid var(--border);
            color: var(--muted);
            font-size: 0.85rem;
        }
        .footer-timestamp {
            margin-top: 5px;
            font-size: 0.75rem;
        }
    """


def _get_responsive_styles() -> str:
    """Responsive design media queries."""
    return """
        @media (max-width: 768px) {
            body { padding: 10px; }
            .header { padding: 20px; }
            h1 { font-size: 1.5rem; }
            .totals-grid, .metrics-grid {
                grid-template-columns: repeat(2, 1fr);
            }
            .drill-grid {
                grid-template-columns: repeat(2, 1fr) !important;
            }
            .ta-grid, .confusion-grid {
                max-width: 100%;
            }
        }
        @media (max-width: 480px) {
            .totals-grid, .metrics-grid {
                grid-template-columns: 1fr;
            }
            .drill-grid {
                grid-template-columns: 1fr !important;
            }
        }
    """
