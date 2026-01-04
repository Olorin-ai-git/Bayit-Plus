"""
Blindspot Heatmap HTML Component

Generates HTML for 2D distribution map of FN/FP/TP/TN across GMV × MODEL_SCORE.
Used in daily and monthly reports to visualize nSure model blind spots.

Feature: blindspot-analysis
"""

from typing import Any, Dict, Optional

from app.service.logging import get_bridge_logger
from app.service.reporting.components.blindspot_gmv_chart import generate_gmv_bar_chart
from app.service.reporting.components.blindspot_summary import (
    generate_blindspots_list,
    generate_summary_cards,
)

logger = get_bridge_logger(__name__)


def generate_blindspot_section(
    blindspot_data: Optional[Dict[str, Any]] = None,
    include_placeholder: bool = True,
) -> str:
    """
    Generate HTML section for blindspot heatmap analysis.

    Args:
        blindspot_data: Blindspot analysis data from ModelBlindspotAnalyzer
        include_placeholder: Show placeholder if no data available

    Returns:
        HTML string for the blindspot section
    """
    if not blindspot_data and not include_placeholder:
        return ""

    if not blindspot_data:
        return _generate_placeholder_section()

    return _generate_heatmap_section(blindspot_data)


def _generate_placeholder_section() -> str:
    """Generate placeholder when blindspot data is not available."""
    return """
    <div style="margin-top: 40px;">
        <h2 style="color: var(--accent); margin-bottom: 15px;">
            🎯 nSure Model Blindspot Analysis
        </h2>
        <div style="background: rgba(59, 130, 246, 0.1); border: 1px solid var(--border);
                    border-radius: 12px; padding: 30px; text-align: center;">
            <p style="color: var(--muted); font-size: 1rem; margin-bottom: 10px;">
                Blindspot analysis data not available for this report.
            </p>
            <p style="color: var(--muted); font-size: 0.9rem;">
                Run the blindspot analyzer to generate 2D distribution data.
            </p>
        </div>
    </div>
    """


def _generate_heatmap_section(data: Dict[str, Any]) -> str:
    """Generate the blindspot analysis section with column chart (no heatmap)."""
    training_info = data.get("training_info", {})
    approved_summary = data.get("summary", {})
    blindspots = data.get("blindspots", [])
    gmv_by_score = data.get("gmv_by_score", [])
    sql_queries = data.get("sql_queries", {})

    # Get all transactions data for toggle (this is the default view)
    all_tx_data = data.get("all_transactions", {})
    all_tx_gmv_by_score = all_tx_data.get("gmv_by_score", []) if all_tx_data else None
    all_tx_summary = all_tx_data.get("summary", {}) if all_tx_data else {}

    threshold = training_info.get("olorin_threshold", "N/A")
    prompt_version = training_info.get("prompt_version", "N/A")

    bar_chart_html = generate_gmv_bar_chart(gmv_by_score, threshold, all_tx_gmv_by_score)
    blindspots_html = generate_blindspots_list(blindspots)

    # Generate BOTH summary sections for toggle
    all_tx_summary_html = generate_summary_cards(all_tx_summary) if all_tx_summary else ""
    approved_summary_html = generate_summary_cards(approved_summary)
    sql_section_html = _generate_sql_section(sql_queries)

    # Toggleable summary sections (All TX is default)
    summary_section = f"""
        <div id="summary-all" style="display: block;">
            {all_tx_summary_html}
        </div>
        <div id="summary-approved" style="display: none;">
            {approved_summary_html}
        </div>
    """ if all_tx_summary else approved_summary_html

    return f"""
    <div style="margin-top: 40px;">
        <h2 style="color: var(--accent); margin-bottom: 10px;">
            🎯 Olorin vs nSure Performance Analysis
        </h2>
        <p style="color: var(--muted); font-size: 0.9rem; margin-bottom: 20px;">
            Confusion matrix comparison across MODEL_SCORE bins.
            <br>Threshold: <strong>{threshold}</strong> | Prompt Version: <strong>{prompt_version}</strong>
        </p>

        {summary_section}

        {bar_chart_html}

        {blindspots_html}

        {sql_section_html}
    </div>
    """


def _generate_sql_section(sql_queries: Dict[str, str]) -> str:
    """Generate collapsible SQL query section."""
    if not sql_queries:
        return ""

    all_tx_query = sql_queries.get("all_transactions", "")
    approved_query = sql_queries.get("nsure_approved_only", "")

    # Escape HTML entities in SQL
    all_tx_query = _escape_html(all_tx_query)
    approved_query = _escape_html(approved_query)

    return f"""
    <div style="margin-top: 30px;">
        <div style="background: var(--card); border: 1px solid var(--border);
                    border-radius: 12px; overflow: hidden;">
            <div onclick="toggleSqlQueries()"
                 style="padding: 15px 20px; cursor: pointer; display: flex;
                        justify-content: space-between; align-items: center;
                        background: rgba(59, 130, 246, 0.1);">
                <span style="color: var(--text); font-weight: 600;">
                    🔍 SQL Queries Used
                </span>
                <span id="sql-toggle-icon" style="color: var(--accent);">▶</span>
            </div>
            <div id="sql-queries-content" style="display: none; padding: 20px;">
                <div style="margin-bottom: 20px;">
                    <h4 style="color: var(--accent); margin-bottom: 10px;">
                        All Transactions Query
                    </h4>
                    <pre style="background: rgba(0,0,0,0.3); padding: 15px;
                                border-radius: 8px; overflow-x: auto;
                                font-size: 0.75rem; line-height: 1.4;
                                color: var(--muted); white-space: pre-wrap;
                                word-wrap: break-word;">{all_tx_query}</pre>
                </div>
                <div>
                    <h4 style="color: var(--accent); margin-bottom: 10px;">
                        nSure Approved Only Query
                    </h4>
                    <pre style="background: rgba(0,0,0,0.3); padding: 15px;
                                border-radius: 8px; overflow-x: auto;
                                font-size: 0.75rem; line-height: 1.4;
                                color: var(--muted); white-space: pre-wrap;
                                word-wrap: break-word;">{approved_query}</pre>
                </div>
            </div>
        </div>
    </div>
    <script>
        function toggleSqlQueries() {{
            const content = document.getElementById('sql-queries-content');
            const icon = document.getElementById('sql-toggle-icon');
            if (content.style.display === 'none') {{
                content.style.display = 'block';
                icon.textContent = '▼';
            }} else {{
                content.style.display = 'none';
                icon.textContent = '▶';
            }}
        }}
    </script>
    """


def _escape_html(text: str) -> str:
    """Escape HTML entities in text."""
    if not text:
        return ""
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


