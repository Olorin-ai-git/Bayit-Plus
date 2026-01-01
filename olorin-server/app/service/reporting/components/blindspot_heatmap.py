"""
Blindspot Heatmap HTML Component

Generates HTML for 2D distribution map of FN/FP/TP/TN across GMV × MODEL_SCORE.
Used in daily and monthly reports to visualize nSure model blind spots.

Feature: blindspot-analysis
"""

from typing import Any, Dict, List, Optional

from app.service.logging import get_bridge_logger

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
    """Generate the full heatmap section with data."""
    training_info = data.get("training_info", {})
    matrix = data.get("matrix", {})
    summary = data.get("summary", {})
    blindspots = data.get("blindspots", [])

    threshold = training_info.get("olorin_threshold", "N/A")
    prompt_version = training_info.get("prompt_version", "N/A")

    heatmap_html = _generate_heatmap_grid(matrix)
    blindspots_html = _generate_blindspots_list(blindspots)
    summary_html = _generate_summary_cards(summary)

    return f"""
    <div style="margin-top: 40px;">
        <h2 style="color: var(--accent); margin-bottom: 10px;">
            🎯 nSure Model Blindspot Analysis
        </h2>
        <p style="color: var(--muted); font-size: 0.9rem; margin-bottom: 20px;">
            2D distribution of confusion matrix metrics across GMV ranges and MODEL_SCORE bins.
            <br>Threshold: <strong>{threshold}</strong> | Prompt Version: <strong>{prompt_version}</strong>
        </p>

        {summary_html}

        <div style="background: var(--card); border: 1px solid var(--border);
                    border-radius: 12px; padding: 20px; margin: 20px 0; overflow-x: auto;">
            <h3 style="color: var(--text); margin-bottom: 15px; font-size: 1rem;">
                Fraud Detection Heatmap: Blind Spots (Red) vs Caught (Green)
            </h3>
            {heatmap_html}
            <div style="margin-top: 15px; display: flex; justify-content: center; gap: 15px; flex-wrap: wrap;">
                <span style="font-size: 0.8rem; color: var(--muted);">
                    <span style="display: inline-block; width: 20px; height: 12px;
                                 background: #991b1b; border-radius: 2px; margin-right: 5px;"></span>
                    Severe Blind Spot
                </span>
                <span style="font-size: 0.8rem; color: var(--muted);">
                    <span style="display: inline-block; width: 20px; height: 12px;
                                 background: #ef4444; border-radius: 2px; margin-right: 5px;"></span>
                    Blind Spot (FN)
                </span>
                <span style="font-size: 0.8rem; color: var(--muted);">
                    <span style="display: inline-block; width: 20px; height: 12px;
                                 background: #22c55e; border-radius: 2px; margin-right: 5px;"></span>
                    Caught (TP)
                </span>
                <span style="font-size: 0.8rem; color: var(--muted);">
                    <span style="display: inline-block; width: 20px; height: 12px;
                                 background: #1e293b; border-radius: 2px; margin-right: 5px;"></span>
                    No Fraud
                </span>
            </div>
        </div>

        {blindspots_html}
    </div>
    """


def _generate_heatmap_grid(matrix: Dict[str, Any]) -> str:
    """Generate the heatmap grid HTML."""
    score_bins = matrix.get("score_bins", [])
    gmv_bins = matrix.get("gmv_bins", [])
    cells = matrix.get("cells", [])

    if not score_bins or not gmv_bins:
        return "<p style='color: var(--muted);'>No heatmap data available.</p>"

    cell_map = {(c["score_bin"], c["gmv_bin"]): c for c in cells}

    # Find max FN count for color scaling
    max_fn = max((c.get("fn", 0) for c in cells), default=1) or 1

    header_row = "<div style='font-size: 0.7rem; color: var(--muted);'></div>"
    for sb in score_bins:
        header_row += f"<div style='font-size: 0.7rem; color: var(--muted); text-align: center;'>{sb:.2f}</div>"

    rows_html = f"<div style='display: grid; grid-template-columns: 80px repeat({len(score_bins)}, 1fr); gap: 2px;'>{header_row}"

    for gmv_bin in gmv_bins:
        rows_html += f"<div style='font-size: 0.75rem; color: var(--muted); display: flex; align-items: center;'>${gmv_bin}</div>"
        for score_bin in score_bins:
            cell = cell_map.get((score_bin, gmv_bin))
            if cell:
                fn = cell.get("fn", 0)
                tp = cell.get("tp", 0)
                fp = cell.get("fp", 0)
                tn = cell.get("tn", 0)
                total = cell.get("total_transactions", 0)

                # Color based on whether this is a blindspot (has FN) or caught zone (has TP)
                if fn > 0:
                    # Blind spot zone - color by FN intensity
                    intensity = min(fn / max_fn, 1.0)
                    color = _get_blindspot_color(intensity)
                    label = f"BLIND SPOT: {fn:,} frauds missed"
                elif tp > 0:
                    # Caught zone - green shades by precision
                    precision = tp / (tp + fp) if (tp + fp) > 0 else 0
                    color = _get_caught_color(precision)
                    label = f"CAUGHT: {tp:,} frauds, Precision: {precision*100:.1f}%"
                else:
                    color = "#1e293b"  # Empty/no fraud
                    label = f"No fraud in this bin"

                title = f"{label} | TP:{tp:,} FP:{fp:,} FN:{fn:,} TN:{tn:,} | Total:{total:,}"
                rows_html += f"<div style='aspect-ratio: 1; background: {color}; border-radius: 3px; cursor: help;' title='{title}'></div>"
            else:
                rows_html += "<div style='aspect-ratio: 1; background: var(--border); border-radius: 3px;'></div>"

    rows_html += "</div>"
    rows_html += "<p style='text-align: center; color: var(--muted); font-size: 0.8rem; margin-top: 10px;'>MODEL_SCORE (nSure) →</p>"

    return rows_html


def _get_blindspot_color(intensity: float) -> str:
    """Get red gradient color for blind spots based on FN intensity."""
    if intensity >= 0.8:
        return "#991b1b"  # Dark red - severe blind spot
    elif intensity >= 0.5:
        return "#dc2626"  # Red
    elif intensity >= 0.2:
        return "#ef4444"  # Light red
    elif intensity >= 0.05:
        return "#f87171"  # Pale red
    else:
        return "#fca5a5"  # Very light red


def _get_caught_color(precision: float) -> str:
    """Get green gradient color for caught zones based on precision."""
    if precision >= 0.10:
        return "#15803d"  # Dark green - good precision
    elif precision >= 0.05:
        return "#22c55e"  # Green
    elif precision >= 0.02:
        return "#4ade80"  # Light green
    else:
        return "#86efac"  # Pale green - low precision but still catching


def _generate_blindspots_list(blindspots: List[Dict[str, Any]]) -> str:
    """Generate HTML for identified blindspots."""
    if not blindspots:
        return ""

    items = ""
    for bs in blindspots[:5]:
        items += f"""
        <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3);
                    border-radius: 8px; padding: 12px; margin-bottom: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: var(--text); font-weight: 500;">
                    Score: {bs.get('score_bin', 'N/A')} | GMV: ${bs.get('gmv_bin', 'N/A')}
                </span>
                <span style="color: var(--danger); font-weight: bold;">
                    FN Rate: {bs.get('fn_rate', 0)*100:.1f}%
                </span>
            </div>
            <p style="color: var(--muted); font-size: 0.85rem; margin-top: 5px;">
                {bs.get('recommendation', 'Focus Olorin analysis on this segment')}
            </p>
        </div>
        """

    return f"""
    <div style="margin-top: 20px;">
        <h3 style="color: var(--warn); margin-bottom: 15px; font-size: 1rem;">
            ⚠️ Identified Blind Spots ({len(blindspots)} found)
        </h3>
        {items}
    </div>
    """


def _generate_summary_cards(summary: Dict[str, Any]) -> str:
    """Generate summary metric cards."""
    total_tx = summary.get("total_transactions", 0)
    precision = summary.get("overall_precision", 0)
    recall = summary.get("overall_recall", 0)
    fraud_gmv = summary.get("total_fraud_gmv", 0)

    return f"""
    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 20px;">
        <div style="background: var(--card); border: 1px solid var(--border);
                    border-radius: 8px; padding: 15px; text-align: center;">
            <div style="font-size: 1.3rem; font-weight: bold; color: var(--text);">
                {total_tx:,}
            </div>
            <div style="font-size: 0.8rem; color: var(--muted);">Total Transactions</div>
        </div>
        <div style="background: var(--card); border: 1px solid var(--border);
                    border-radius: 8px; padding: 15px; text-align: center;">
            <div style="font-size: 1.3rem; font-weight: bold; color: var(--ok);">
                {precision*100:.1f}%
            </div>
            <div style="font-size: 0.8rem; color: var(--muted);">Precision</div>
        </div>
        <div style="background: var(--card); border: 1px solid var(--border);
                    border-radius: 8px; padding: 15px; text-align: center;">
            <div style="font-size: 1.3rem; font-weight: bold; color: var(--accent);">
                {recall*100:.1f}%
            </div>
            <div style="font-size: 0.8rem; color: var(--muted);">Recall</div>
        </div>
        <div style="background: var(--card); border: 1px solid var(--border);
                    border-radius: 8px; padding: 15px; text-align: center;">
            <div style="font-size: 1.3rem; font-weight: bold; color: var(--danger);">
                ${fraud_gmv:,.0f}
            </div>
            <div style="font-size: 0.8rem; color: var(--muted);">Fraud GMV</div>
        </div>
    </div>
    """
