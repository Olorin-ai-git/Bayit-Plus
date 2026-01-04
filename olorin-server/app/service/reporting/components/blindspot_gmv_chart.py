"""
Blindspot GMV Bar Chart Component.

Generates grouped bar chart comparing Olorin vs nSure performance per score bin.
Each score bin has 8 bars: Olorin TP/FP/FN/TN + nSure nTP/nFP/nFN/nTN.
Includes toggle between nSure Approved Only and All Transactions.

Feature: blindspot-analysis
"""

from typing import Any, Dict, List, Optional


def generate_gmv_bar_chart(
    gmv_by_score: List[Dict[str, Any]],
    threshold: float,
    all_transactions_data: Optional[List[Dict[str, Any]]] = None,
) -> str:
    """Generate grouped bar chart with optional toggle for all transactions."""
    if not gmv_by_score:
        return ""

    threshold_float = float(threshold) if threshold != "N/A" else 0.4

    # Generate primary chart (nSure Approved Only)
    approved_chart = _generate_chart_content(
        gmv_by_score, threshold_float, "approved"
    )

    # Generate secondary chart (All Transactions) if data provided
    all_chart = ""
    toggle_html = ""
    if all_transactions_data:
        all_chart = _generate_chart_content(
            all_transactions_data, threshold_float, "all"
        )
        toggle_html = _generate_toggle()

    return f"""
    <div style="background: var(--card); border: 1px solid var(--border);
                border-radius: 12px; padding: 20px; margin: 20px 0;">
        <div style="display: flex; justify-content: space-between; align-items: center;
                    margin-bottom: 15px;">
            <h3 style="color: var(--text); font-size: 1rem; margin: 0;">
                GMV Distribution by Score Bin: Olorin vs nSure (Threshold: {threshold})
            </h3>
            {toggle_html}
        </div>
        <div id="chart-approved" style="display: none;">
            {approved_chart}
        </div>
        <div id="chart-all" style="display: block;">
            {all_chart}
        </div>
        <p style="text-align: center; color: var(--muted); font-size: 0.8rem; margin-top: 5px;">
            MODEL_SCORE (nSure) → | Yellow border = above Olorin threshold
        </p>
        {_generate_legend()}
        {_generate_toggle_script() if all_transactions_data else ""}
    </div>
    """


def _generate_toggle() -> str:
    """Generate the checkbox toggle for switching views."""
    return """
    <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;
                  font-size: 0.85rem; color: var(--muted);">
        <input type="checkbox" id="show-approved-toggle" onchange="toggleChartView()"
               style="width: 16px; height: 16px; cursor: pointer;">
        <span>Show nSure Approved Only</span>
        <span style="font-size: 0.75rem; color: var(--accent);">(default: All Transactions)</span>
    </label>
    """


def _generate_toggle_script() -> str:
    """Generate JavaScript for toggling between chart views and summary cards."""
    return """
    <script>
        function toggleChartView() {
            const checkbox = document.getElementById('show-approved-toggle');
            const approvedChart = document.getElementById('chart-approved');
            const allChart = document.getElementById('chart-all');
            const approvedSummary = document.getElementById('summary-approved');
            const allSummary = document.getElementById('summary-all');
            if (checkbox.checked) {
                approvedChart.style.display = 'block';
                allChart.style.display = 'none';
                if (approvedSummary) approvedSummary.style.display = 'block';
                if (allSummary) allSummary.style.display = 'none';
            } else {
                approvedChart.style.display = 'none';
                allChart.style.display = 'block';
                if (approvedSummary) approvedSummary.style.display = 'none';
                if (allSummary) allSummary.style.display = 'block';
            }
        }
    </script>
    """


def _generate_chart_content(
    gmv_by_score: List[Dict[str, Any]], threshold: float, chart_id: str
) -> str:
    """Generate the bar chart content."""
    # Find max individual GMV for scaling (Olorin + nSure)
    max_gmv = 1
    gmv_keys = [
        "tp_gmv", "fp_gmv", "fn_gmv", "tn_gmv",
        "nsure_tp_gmv", "nsure_fp_gmv", "nsure_fn_gmv", "nsure_tn_gmv"
    ]
    for d in gmv_by_score:
        for key in gmv_keys:
            val = d.get(key, 0)
            if val > max_gmv:
                max_gmv = val

    bars_html = _generate_bar_groups(gmv_by_score, max_gmv, threshold)

    return f"""
        <div style="display: flex; gap: 8px; align-items: flex-end; padding: 10px 0;
                    overflow-x: auto;">
            {bars_html}
        </div>
    """


def _generate_bar_groups(
    gmv_by_score: List[Dict[str, Any]], max_gmv: float, threshold: float
) -> str:
    """Generate grouped bar elements for each score bin."""
    groups_html = ""
    for data in gmv_by_score:
        score_bin = data.get("score_bin", 0)
        label = data.get("score_bin_label", "")
        is_above_threshold = score_bin >= threshold
        border_style = "border: 2px solid #fbbf24;" if is_above_threshold else ""

        # Olorin bars (solid colors) - based on Olorin threshold prediction
        olorin_bars = [
            ("TP", data.get("tp_gmv", 0), "#22c55e"),   # Green - caught fraud
            ("FP", data.get("fp_gmv", 0), "#f97316"),   # Orange - false alarm
            ("FN", data.get("fn_gmv", 0), "#ef4444"),   # Red - missed fraud
            ("TN", data.get("tn_gmv", 0), "#3b82f6"),   # Blue - legit allowed
        ]

        # nSure bars (striped pattern) - based on nSure's actual decision
        nsure_bars = [
            ("nTP", data.get("nsure_tp_gmv", 0), "#166534"),  # Dark green
            ("nFP", data.get("nsure_fp_gmv", 0), "#c2410c"),  # Dark orange
            ("nFN", data.get("nsure_fn_gmv", 0), "#991b1b"),  # Dark red
            ("nTN", data.get("nsure_tn_gmv", 0), "#1e3a8a"),  # Dark blue
        ]

        bars_html = _generate_bars_html(olorin_bars, max_gmv, False)
        bars_html += '<div style="width: 4px; background: var(--border);"></div>'
        bars_html += _generate_bars_html(nsure_bars, max_gmv, True)

        groups_html += f"""
        <div style="display: flex; flex-direction: column; align-items: center;
                    padding: 5px; {border_style} border-radius: 4px; min-width: 200px;">
            <div style="display: flex; gap: 2px; align-items: flex-end; height: 180px;">
                {bars_html}
            </div>
            <div style="font-size: 0.7rem; color: var(--muted); margin-top: 8px;
                        font-weight: bold;">
                {label}
            </div>
        </div>"""

    return groups_html


def _generate_bars_html(
    bars: List[tuple], max_gmv: float, is_nsure: bool
) -> str:
    """Generate HTML for a set of bars."""
    bars_html = ""
    for bar_label, gmv_val, color in bars:
        height_pct = (gmv_val / max_gmv * 100) if max_gmv > 0 else 0
        height_pct = min(height_pct, 100)

        if gmv_val >= 1_000_000:
            gmv_label = f"${gmv_val/1_000_000:.1f}M"
        elif gmv_val >= 1_000:
            gmv_label = f"${gmv_val/1_000:.0f}K"
        else:
            gmv_label = f"${gmv_val:.0f}"

        # Add striped pattern for nSure bars
        pattern = ""
        if is_nsure:
            pattern = (
                "background-image: repeating-linear-gradient("
                "45deg, transparent, transparent 2px, "
                "rgba(255,255,255,0.3) 2px, rgba(255,255,255,0.3) 4px);"
            )

        bars_html += f"""
        <div style="display: flex; flex-direction: column; align-items: center; width: 20px;">
            <div style="font-size: 0.5rem; color: var(--muted); margin-bottom: 2px;
                        white-space: nowrap; transform: rotate(-45deg);
                        transform-origin: center; height: 30px;">
                {gmv_label}
            </div>
            <div style="height: {height_pct * 1.5:.1f}px; width: 16px;
                        background: {color}; {pattern} border-radius: 2px 2px 0 0;
                        min-height: 2px;"
                 title="{bar_label}: ${gmv_val:,.0f}"></div>
            <div style="font-size: 0.45rem; color: var(--muted); margin-top: 2px;">
                {bar_label}
            </div>
        </div>"""
    return bars_html


def _generate_legend() -> str:
    """Generate the chart legend."""
    return """
    <div style="margin-top: 15px; display: flex; flex-direction: column; gap: 8px;">
        <div style="display: flex; justify-content: center; gap: 12px; flex-wrap: wrap;">
            <span style="font-size: 0.8rem; font-weight: 600; color: var(--text);">
                Olorin (solid):
            </span>
            <span style="font-size: 0.75rem; color: var(--muted);">
                <span style="display: inline-block; width: 16px; height: 12px;
                             background: #22c55e; border-radius: 2px; margin-right: 4px;"></span>
                TP (Fraud Caught)
            </span>
            <span style="font-size: 0.75rem; color: var(--muted);">
                <span style="display: inline-block; width: 16px; height: 12px;
                             background: #f97316; border-radius: 2px; margin-right: 4px;"></span>
                FP (Legit Blocked)
            </span>
            <span style="font-size: 0.75rem; color: var(--muted);">
                <span style="display: inline-block; width: 16px; height: 12px;
                             background: #ef4444; border-radius: 2px; margin-right: 4px;"></span>
                FN (Fraud Missed)
            </span>
            <span style="font-size: 0.75rem; color: var(--muted);">
                <span style="display: inline-block; width: 16px; height: 12px;
                             background: #3b82f6; border-radius: 2px; margin-right: 4px;"></span>
                TN (Legit Allowed)
            </span>
        </div>
        <div style="display: flex; justify-content: center; gap: 12px; flex-wrap: wrap;">
            <span style="font-size: 0.8rem; font-weight: 600; color: var(--text);">
                nSure (striped):
            </span>
            <span style="font-size: 0.75rem; color: var(--muted);">
                <span style="display: inline-block; width: 16px; height: 12px;
                             background: #166534; border-radius: 2px; margin-right: 4px;"></span>
                nTP (Fraud Declined)
            </span>
            <span style="font-size: 0.75rem; color: var(--muted);">
                <span style="display: inline-block; width: 16px; height: 12px;
                             background: #c2410c; border-radius: 2px; margin-right: 4px;"></span>
                nFP (Legit Declined)
            </span>
            <span style="font-size: 0.75rem; color: var(--muted);">
                <span style="display: inline-block; width: 16px; height: 12px;
                             background: #991b1b; border-radius: 2px; margin-right: 4px;"></span>
                nFN (Fraud Approved)
            </span>
            <span style="font-size: 0.75rem; color: var(--muted);">
                <span style="display: inline-block; width: 16px; height: 12px;
                             background: #1e3a8a; border-radius: 2px; margin-right: 4px;"></span>
                nTN (Legit Approved)
            </span>
        </div>
        <p style="text-align: center; font-size: 0.7rem; color: var(--muted); margin-top: 5px;">
            <em>Compare Olorin vs nSure: Lower FN = better fraud detection, Lower FP = less false alarms</em>
        </p>
    </div>
    """
