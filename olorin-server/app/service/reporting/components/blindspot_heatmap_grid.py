"""
Blindspot Heatmap Grid Component.

Generates the 2D heatmap grid showing confusion matrix metrics across GMV × MODEL_SCORE.

Feature: blindspot-analysis
"""

from typing import Any, Dict

from app.service.reporting.components.blindspot_colors import (
    get_blindspot_color,
    get_caught_color,
    get_fp_color_by_intensity,
    get_tn_color,
)


def generate_heatmap_grid(matrix: Dict[str, Any]) -> str:
    """Generate the heatmap grid HTML."""
    score_bins = matrix.get("score_bins", [])
    gmv_bins = matrix.get("gmv_bins", [])
    cells = matrix.get("cells", [])

    if not score_bins or not gmv_bins:
        return "<p style='color: var(--muted);'>No heatmap data available.</p>"

    cell_map = {(c["score_bin"], c["gmv_bin"]): c for c in cells}
    max_fp_gmv = max((c.get("fp_gmv", 0) for c in cells), default=1) or 1
    max_tn = max((c.get("tn", 0) for c in cells), default=1) or 1

    header_row = _build_header_row(score_bins)
    rows_html = f"<div style='display: grid; grid-template-columns: 80px repeat({len(score_bins)}, 1fr); gap: 2px;'>{header_row}"

    for gmv_bin in gmv_bins:
        rows_html += f"<div style='font-size: 0.75rem; color: var(--muted); display: flex; align-items: center;'>${gmv_bin}</div>"
        for score_bin in score_bins:
            cell = cell_map.get((score_bin, gmv_bin))
            rows_html += _build_cell_html(cell, max_fp_gmv, max_tn)

    rows_html += "</div>"
    rows_html += "<p style='text-align: center; color: var(--muted); font-size: 0.8rem; margin-top: 10px;'>MODEL_SCORE (nSure) →</p>"

    return rows_html


def _build_header_row(score_bins: list) -> str:
    """Build the header row with score bin labels."""
    header_row = "<div style='font-size: 0.7rem; color: var(--muted);'></div>"
    for sb in score_bins:
        header_row += f"<div style='font-size: 0.7rem; color: var(--muted); text-align: center;'>{sb:.2f}</div>"
    return header_row


def _build_cell_html(cell: Dict[str, Any], max_fp_gmv: float, max_tn: int) -> str:
    """Build HTML for a single heatmap cell."""
    if not cell:
        return "<div style='aspect-ratio: 1; background: var(--border); border-radius: 3px;'></div>"

    fn = cell.get("fn", 0)
    tp = cell.get("tp", 0)
    fp = cell.get("fp", 0)
    tn = cell.get("tn", 0)
    total = cell.get("total_transactions", 0)
    fp_gmv = cell.get("fp_gmv", 0)

    actual_fraud = tp + fn
    fn_rate = fn / actual_fraud if actual_fraud > 0 else 0
    precision = tp / (tp + fp) if (tp + fp) > 0 else 1.0
    fp_gmv_intensity = fp_gmv / max_fp_gmv if max_fp_gmv > 0 else 0
    tn_intensity = tn / max_tn if max_tn > 0 else 0

    color, label = _determine_cell_color_and_label(
        fn, tp, fp, tn, fn_rate, precision, fp_gmv_intensity, tn_intensity, actual_fraud, fp_gmv
    )

    title = f"{label} | TP:{tp:,} FP:{fp:,} FN:{fn:,} TN:{tn:,} | Total:{total:,}"
    return f"<div style='aspect-ratio: 1; background: {color}; border-radius: 3px; cursor: help;' title='{title}'></div>"


def _determine_cell_color_and_label(
    fn: int, tp: int, fp: int, tn: int, fn_rate: float, precision: float,
    fp_gmv_intensity: float, tn_intensity: float, actual_fraud: int, fp_gmv: float
) -> tuple:
    """Determine cell color and label based on classification metrics."""
    if fn > 0 and fn_rate > 0.01:
        color = get_blindspot_color(fn_rate)
        label = f"BLIND SPOT: {fn_rate*100:.1f}% fraud missed ({fn:,}/{actual_fraud:,})"
    elif fp > 0 and tp == 0:
        color = get_fp_color_by_intensity(fp_gmv_intensity)
        label = f"NO FRAUD: {fp:,} legit blocked, ${fp_gmv:,.0f} GMV at risk"
    elif tp > 0 and fp > 0:
        if precision >= 0.1:
            color = get_caught_color(precision)
            label = f"CAUGHT: {tp:,} fraud, Precision {precision*100:.1f}%"
        else:
            color = get_fp_color_by_intensity(fp_gmv_intensity)
            label = f"LOW PRECISION: {precision*100:.1f}%, ${fp_gmv:,.0f} GMV at risk"
    elif tp > 0:
        color = get_caught_color(1.0)
        label = f"CAUGHT: {tp:,} frauds, 100% precision"
    elif tn > 0:
        color = get_tn_color(tn_intensity)
        label = f"CORRECT: {tn:,} legit correctly allowed"
    else:
        color = "#1e293b"
        label = "No transactions in this bin"

    return color, label
