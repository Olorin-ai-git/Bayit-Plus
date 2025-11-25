"""
HTML Report Generator for Investigation Comparison

Generates comprehensive HTML reports with metrics, charts, and visualizations.

Constitutional Compliance:
- All styling embedded (no external dependencies)
- Charts using Chart.js (CDN)
- Responsive design
- Complete implementation with all metrics
"""

import json
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from app.router.models.investigation_comparison_models import (
    ComparisonResponse,
    DeltaMetrics,
    HistogramBin,
    PerMerchantMetrics,
    TimeseriesDaily,
    WindowMetrics,
)
from app.service.logging import get_bridge_logger
from app.service.reporting.olorin_logo import OLORIN_FOOTER, get_olorin_header

logger = get_bridge_logger(__name__)


def format_percentage(value: float, decimals: int = 2) -> str:
    """Format float as percentage."""
    return f"{value * 100:.{decimals}f}%"


def format_number(value: int) -> str:
    """Format number with thousand separators."""
    return f"{value:,}"


def get_delta_color_class(delta: float) -> str:
    """Get CSS class for delta value (green for positive, red for negative)."""
    if delta > 0:
        return "delta-positive"
    elif delta < 0:
        return "delta-negative"
    else:
        return "delta-neutral"


def generate_html_report(
    response: ComparisonResponse,
    output_path: Optional[Path] = None,
    additional_metrics: Optional[Dict[str, Any]] = None,
) -> str:
    """
    Generate comprehensive HTML report for comparison results.

    Args:
        response: ComparisonResponse with all metrics and data
        output_path: Optional path to save HTML file
        additional_metrics: Optional dict with workload metrics, threshold curves, etc.

    Returns:
        HTML content as string
    """
    entity_label = "All Entities"
    if response.entity:
        entity_type = response.entity.get("type", "unknown")
        entity_value = response.entity.get("value", "")
        entity_label = f"{entity_type}: {entity_value}"

    additional_metrics = additional_metrics or {}

    # Generate charts data
    histogram_a_data = (
        _prepare_histogram_data(response.A.risk_histogram)
        if response.A.risk_histogram
        else None
    )
    histogram_b_data = (
        _prepare_histogram_data(response.B.risk_histogram)
        if response.B.risk_histogram
        else None
    )
    timeseries_a_data = (
        _prepare_timeseries_data(response.A.timeseries_daily)
        if response.A.timeseries_daily
        else None
    )
    timeseries_b_data = (
        _prepare_timeseries_data(response.B.timeseries_daily)
        if response.B.timeseries_daily
        else None
    )

    # Prepare threshold curve data
    threshold_curve_a = additional_metrics.get("threshold_curve_a")
    threshold_curve_b = additional_metrics.get("threshold_curve_b")

    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Investigation Comparison Report - Prediction Quality Validation</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
    <style>
        {_get_css_styles()}
    </style>
</head>
<body>
    <div class="container">
        {_generate_header(entity_label, response)}
        {_generate_metadata_section(response)}
        {_generate_explanation_section()}
        {_generate_summary_section(response)}
        {_generate_metrics_comparison(response)}
        {_generate_workload_metrics_section(response, additional_metrics)}
        {_generate_delta_section(response)}
        {_generate_confusion_matrices(response)}
        {_generate_threshold_curves_section(threshold_curve_a, threshold_curve_b, response)}
        {_generate_charts_section(histogram_a_data, histogram_b_data, timeseries_a_data, timeseries_b_data, response)}
        {_generate_per_merchant_section(response)}
        {_generate_footer()}
    </div>
    <script>
        {_generate_chart_scripts(histogram_a_data, histogram_b_data, timeseries_a_data, timeseries_b_data, threshold_curve_a, threshold_curve_b, response)}
    </script>
</body>
</html>"""

    if output_path:
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(html_content)
        logger.info(f"HTML report saved to {output_path}")

    return html_content


def _get_css_styles() -> str:
    """Get CSS styles for the report."""
    return """
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: #0a0a0a;
            color: #e0e0e0;
            line-height: 1.6;
            padding: 20px;
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
            background: #1a1a1a;
            border-radius: 12px;
            padding: 40px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        }
        
        .header {
            border-bottom: 2px solid #2a2a2a;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        
        .header h1 {
            color: #00d4ff;
            font-size: 2.5em;
            margin-bottom: 10px;
        }
        
        .header .subtitle {
            color: #888;
            font-size: 1.1em;
        }
        
        .section {
            margin-bottom: 40px;
            background: #222;
            border-radius: 8px;
            padding: 25px;
            border: 1px solid #333;
        }
        
        .section-title {
            color: #00d4ff;
            font-size: 1.8em;
            margin-bottom: 20px;
            border-bottom: 2px solid #00d4ff;
            padding-bottom: 10px;
        }
        
        .metadata-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 15px;
            margin-top: 15px;
        }
        
        .metadata-item {
            background: #2a2a2a;
            padding: 15px;
            border-radius: 6px;
            border-left: 3px solid #00d4ff;
        }
        
        .metadata-label {
            color: #888;
            font-size: 0.9em;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 5px;
        }
        
        .metadata-value {
            color: #fff;
            font-size: 1.2em;
            font-weight: 600;
        }
        
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }
        
        .window-panel {
            background: #1e1e1e;
            border-radius: 8px;
            padding: 20px;
            border: 2px solid #333;
        }
        
        .window-panel.window-a {
            border-color: #00d4ff;
        }
        
        .window-panel.window-b {
            border-color: #ff6b6b;
        }
        
        .window-title {
            color: #00d4ff;
            font-size: 1.5em;
            margin-bottom: 15px;
            font-weight: 600;
        }
        
        .window-panel.window-b .window-title {
            color: #ff6b6b;
        }
        
        .metric-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #333;
        }
        
        .metric-row:last-child {
            border-bottom: none;
        }
        
        .metric-label {
            color: #aaa;
        }
        
        .metric-value {
            color: #fff;
            font-weight: 600;
        }
        
        .delta-section {
            background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
            border-radius: 8px;
            padding: 25px;
            margin-top: 20px;
        }
        
        .delta-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-top: 15px;
        }
        
        .delta-item {
            background: rgba(0, 0, 0, 0.3);
            padding: 15px;
            border-radius: 6px;
            text-align: center;
        }
        
        .delta-label {
            color: #aaa;
            font-size: 0.9em;
            margin-bottom: 8px;
        }
        
        .delta-value {
            font-size: 1.8em;
            font-weight: 700;
        }
        
        .delta-positive {
            color: #4ade80;
        }
        
        .delta-negative {
            color: #f87171;
        }
        
        .delta-neutral {
            color: #94a3b8;
        }
        
        .confusion-matrix-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }
        
        .confusion-matrix {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
            background: #1e1e1e;
            padding: 15px;
            border-radius: 8px;
        }
        
        .matrix-cell {
            padding: 15px;
            border-radius: 6px;
            text-align: center;
        }
        
        .matrix-cell.tp {
            background: #065f46;
            color: #6ee7b7;
        }
        
        .matrix-cell.fp {
            background: #7f1d1d;
            color: #fca5a5;
        }
        
        .matrix-cell.tn {
            background: #064e3b;
            color: #5eead4;
        }
        
        .matrix-cell.fn {
            background: #991b1b;
            color: #f87171;
        }
        
        .matrix-label {
            font-size: 0.8em;
            color: #aaa;
            margin-bottom: 5px;
        }
        
        .matrix-value {
            font-size: 1.5em;
            font-weight: 700;
        }
        
        .chart-container {
            background: #1e1e1e;
            padding: 20px;
            border-radius: 8px;
            margin-top: 20px;
        }
        
        .chart-wrapper {
            position: relative;
            height: 400px;
            margin-top: 15px;
        }
        
        .merchant-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
        }
        
        .merchant-table th {
            background: #2a2a2a;
            color: #00d4ff;
            padding: 12px;
            text-align: left;
            border-bottom: 2px solid #00d4ff;
        }
        
        .merchant-table td {
            padding: 10px 12px;
            border-bottom: 1px solid #333;
        }
        
        .merchant-table tr:hover {
            background: #2a2a2a;
        }
        
        .summary-text {
            color: #ccc;
            font-size: 1.1em;
            line-height: 1.8;
            padding: 20px;
            background: #1e1e1e;
            border-radius: 8px;
            border-left: 4px solid #00d4ff;
        }
        
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #333;
            text-align: center;
            color: #666;
            font-size: 0.9em;
        }
        
        /* Olorin logo header styles */
        .report-header {
            display: grid;
            grid-template-columns: 1fr auto;
            gap: 16px;
            align-items: center;
            margin-bottom: 24px;
            border-bottom: 2px solid #2a2a2a;
            padding-bottom: 20px;
        }
        .brand {
            display: flex;
            align-items: center;
            gap: 14px;
        }
        .brand img.logo-img {
            height: 56px;
            width: auto;
            border-radius: 10px;
            background: #0f1628;
            border: 1px solid #333;
            box-shadow: 0 8px 20px rgba(0,0,0,.35);
        }
        .brand h1 {
            font-size: 2.5em;
            margin: 0;
            letter-spacing: .3px;
            color: #00d4ff;
        }
        .meta {
            text-align: right;
            color: #888;
            font-size: 1.1em;
        }
        footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #333;
            text-align: center;
            color: #666;
            font-size: 0.9em;
        }
        .credit {
            color: #888;
        }
        
        /* Collapsible section styles */
        .collapsible {
            background: #1e1e1e;
            border: 1px solid #333;
            border-radius: 8px;
            margin-bottom: 20px;
        }
        
        .collapsible-header {
            background: #2a2a2a;
            padding: 15px 20px;
            cursor: pointer;
            user-select: none;
            border-radius: 8px 8px 0 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
            transition: background 0.2s;
        }
        
        .collapsible-header:hover {
            background: #333;
        }
        
        .collapsible-header h3 {
            color: #00d4ff;
            font-size: 1.3em;
            margin: 0;
        }
        
        .collapsible-toggle {
            color: #00d4ff;
            font-size: 1.5em;
            font-weight: bold;
            transition: transform 0.3s;
        }
        
        .collapsible-toggle.expanded {
            transform: rotate(90deg);
        }
        
        .collapsible-content {
            max-height: 0;
            overflow: hidden;
            transition: max-height 0.3s ease-out;
            padding: 0 20px;
        }
        
        .collapsible-content.expanded {
            max-height: 2000px;
            padding: 20px;
        }
        
        .explanation-content {
            color: #ccc;
            line-height: 1.8;
        }
        
        .explanation-content h4 {
            color: #00d4ff;
            margin-top: 20px;
            margin-bottom: 10px;
            font-size: 1.1em;
        }
        
        .explanation-content ul {
            margin-left: 20px;
            margin-bottom: 15px;
        }
        
        .explanation-content li {
            margin-bottom: 8px;
        }
        
        .explanation-content code {
            background: #2a2a2a;
            padding: 2px 6px;
            border-radius: 4px;
            color: #6ee7b7;
            font-family: 'Courier New', monospace;
        }
        
        .explanation-content .example-box {
            background: #1a1a1a;
            border-left: 4px solid #00d4ff;
            padding: 15px;
            margin: 15px 0;
            border-radius: 4px;
        }
        
        @media print {
            body {
                background: white;
                color: black;
            }
            .container {
                box-shadow: none;
            }
            .collapsible-content {
                max-height: none !important;
                padding: 20px !important;
            }
        }
    """


def _generate_header(entity_label: str, response: ComparisonResponse) -> str:
    """Generate report header with Olorin logo."""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    header_html = get_olorin_header("Investigation Comparison Report")
    return f"""
        {header_html}
        <div class="header">
            <div class="subtitle" style="margin-top: 10px;">
                Entity: {entity_label} | Generated: {timestamp}
            </div>
        </div>
    """


def _generate_metadata_section(response: ComparisonResponse) -> str:
    """Generate metadata section."""
    entity_info = "All Entities"
    if response.entity:
        entity_info = f"{response.entity.get('type', 'unknown').upper()}: {response.entity.get('value', '')}"

    # Auto-expand info
    expand_info_a = ""
    if response.windowA.auto_expand_meta and response.windowA.auto_expand_meta.expanded:
        expand_info_a = f'<div style="color: #4ade80; font-size: 0.85em; margin-top: 5px;">✓ Expanded from {response.windowA.auto_expand_meta.attempts[0]}d → {response.windowA.auto_expand_meta.attempts[1]}d</div>'

    expand_info_b = ""
    if response.windowB.auto_expand_meta and response.windowB.auto_expand_meta.expanded:
        expand_info_b = f'<div style="color: #4ade80; font-size: 0.85em; margin-top: 5px;">✓ Expanded from {response.windowB.auto_expand_meta.attempts[0]}d → {response.windowB.auto_expand_meta.attempts[1]}d</div>'

    return f"""
        <div class="section">
            <h2 class="section-title">Metadata</h2>
            <div class="metadata-grid">
                <div class="metadata-item">
                    <div class="metadata-label">Entity</div>
                    <div class="metadata-value">{entity_info}</div>
                </div>
                <div class="metadata-item">
                    <div class="metadata-label">Risk Threshold</div>
                    <div class="metadata-value">{format_percentage(response.threshold)}</div>
                </div>
                <div class="metadata-item">
                    <div class="metadata-label">Window A</div>
                    <div class="metadata-value">{response.windowA.label}</div>
                    <div style="color: #888; font-size: 0.9em; margin-top: 5px;">
                        {response.windowA.start} to {response.windowA.end}
                    </div>
                    {expand_info_a}
                </div>
                <div class="metadata-item">
                    <div class="metadata-label">Window B</div>
                    <div class="metadata-value">{response.windowB.label}</div>
                    <div style="color: #888; font-size: 0.9em; margin-top: 5px;">
                        {response.windowB.start} to {response.windowB.end}
                    </div>
                    {expand_info_b}
                </div>
            </div>
        </div>
    """


def _generate_explanation_section() -> str:
    """Generate collapsible explanation section about predicted_risk."""
    return """
        <div class="section">
            <div class="collapsible">
                <div class="collapsible-header" onclick="toggleCollapsible(this)">
                    <h3>Understanding This Comparison: What is predicted_risk?</h3>
                    <span class="collapsible-toggle">▶</span>
                </div>
                <div class="collapsible-content">
                    <div class="explanation-content">
                        <h4>What's Actually Happening</h4>
                        <p><strong>Window A (6 months ago):</strong> Investigation produced a risk score (e.g., 0.6).</p>
                        <p><strong>Window B (current):</strong> We use that historical risk score as the prediction for current transactions.</p>
                        <p><strong>Comparison:</strong> We compare the prediction (<code>predicted_risk</code>) against actual fraud outcomes (<code>actual_outcome</code> from <code>IS_FRAUD_TX</code> or entity labels).</p>
                        
                        <h4>Why predicted_risk is Needed</h4>
                        <p><code>predicted_risk</code> is the historical investigation's risk score applied to transactions in the validation period. It's used to:</p>
                        
                        <h4>Calculate a Confusion Matrix:</h4>
                        <ul>
                            <li><strong>TP (True Positive):</strong> Predicted fraud AND actually fraud</li>
                            <li><strong>FP (False Positive):</strong> Predicted fraud BUT not fraud</li>
                            <li><strong>TN (True Negative):</strong> Predicted not fraud AND not fraud</li>
                            <li><strong>FN (False Negative):</strong> Predicted not fraud BUT actually fraud</li>
                        </ul>
                        
                        <h4>Measure Performance:</h4>
                        <ul>
                            <li><strong>Precision:</strong> Of transactions flagged as fraud, how many were actually fraud?</li>
                            <li><strong>Recall:</strong> Of actual fraud transactions, how many did we catch?</li>
                            <li><strong>Accuracy:</strong> Overall correctness</li>
                        </ul>
                        
                        <h4>Example</h4>
                        <div class="example-box">
                            <p><strong>Historical investigation (6 months ago):</strong> <code>overall_risk_score = 0.6</code></p>
                            <p><strong>Current period:</strong> 100 transactions</p>
                            <p><strong>All 100 transactions get</strong> <code>predicted_risk = 0.6</code></p>
                            <p><strong>Compare against actual outcomes:</strong> 10 were fraud, 90 were not fraud</p>
                            <p><strong>Result:</strong> We can measure how well the historical risk score would have predicted fraud in the current period</p>
                        </div>
                        
                        <p><strong>This is validation/backtesting:</strong> Testing whether the historical investigation's risk assessment would have been accurate for current transactions.</p>
                    </div>
                </div>
            </div>
        </div>
        <script>
            function toggleCollapsible(header) {
                const content = header.nextElementSibling;
                const toggle = header.querySelector('.collapsible-toggle');
                const isExpanded = content.classList.contains('expanded');
                
                if (isExpanded) {
                    content.classList.remove('expanded');
                    toggle.classList.remove('expanded');
                } else {
                    content.classList.add('expanded');
                    toggle.classList.add('expanded');
                }
            }
        </script>
    """


def _generate_summary_section(response: ComparisonResponse) -> str:
    """Generate summary section."""
    return f"""
        <div class="section">
            <h2 class="section-title">Executive Summary</h2>
            <div class="summary-text">
                {response.investigation_summary}
            </div>
        </div>
    """


def _format_ci(ci: Optional[tuple]) -> str:
    """Format confidence interval."""
    if ci and len(ci) == 2:
        return f" (95% CI {format_percentage(ci[0], 1)}–{format_percentage(ci[1], 1)})"
    return ""


def _generate_power_badge(power) -> str:
    """Generate power assessment badge."""
    if not power:
        return ""
    status = power.status if hasattr(power, "status") else power.get("status", "stable")
    reasons = power.reasons if hasattr(power, "reasons") else power.get("reasons", [])

    if status == "stable":
        return '<span style="background: #065f46; color: #6ee7b7; padding: 4px 8px; border-radius: 4px; font-size: 0.85em; margin-left: 10px;">✓ Stable</span>'
    else:
        reason_text = ", ".join(reasons) if reasons else "Low power"
        return f'<span style="background: #78350f; color: #fbbf24; padding: 4px 8px; border-radius: 4px; font-size: 0.85em; margin-left: 10px;" title="{reason_text}">⚠ Low Power</span>'


def _generate_metrics_comparison(response: ComparisonResponse) -> str:
    """Generate metrics comparison section with CI, power, and support."""
    metrics_a = response.A
    metrics_b = response.B

    # Power badges
    power_badge_a = _generate_power_badge(metrics_a.power)
    power_badge_b = _generate_power_badge(metrics_b.power)

    # CI formatting
    ci_a_dict = metrics_a.ci if metrics_a.ci else {}
    ci_b_dict = metrics_b.ci if metrics_b.ci else {}

    precision_ci_a = _format_ci(
        ci_a_dict.get("precision")
        if isinstance(ci_a_dict, dict)
        else (ci_a_dict.precision if hasattr(ci_a_dict, "precision") else None)
    )
    recall_ci_a = _format_ci(
        ci_a_dict.get("recall")
        if isinstance(ci_a_dict, dict)
        else (ci_a_dict.recall if hasattr(ci_a_dict, "recall") else None)
    )
    accuracy_ci_a = _format_ci(
        ci_a_dict.get("accuracy")
        if isinstance(ci_a_dict, dict)
        else (ci_a_dict.accuracy if hasattr(ci_a_dict, "accuracy") else None)
    )

    precision_ci_b = _format_ci(
        ci_b_dict.get("precision")
        if isinstance(ci_b_dict, dict)
        else (ci_b_dict.precision if hasattr(ci_b_dict, "precision") else None)
    )
    recall_ci_b = _format_ci(
        ci_b_dict.get("recall")
        if isinstance(ci_b_dict, dict)
        else (ci_b_dict.recall if hasattr(ci_b_dict, "recall") else None)
    )
    accuracy_ci_b = _format_ci(
        ci_b_dict.get("accuracy")
        if isinstance(ci_b_dict, dict)
        else (ci_b_dict.accuracy if hasattr(ci_b_dict, "accuracy") else None)
    )

    # Auto-expand indicators
    expand_note_a = ""
    if response.windowA.auto_expand_meta and response.windowA.auto_expand_meta.expanded:
        original_days = response.windowA.auto_expand_meta.attempts[0]
        effective_days = response.windowA.auto_expand_meta.attempts[1]
        reasons_text = ""
        if response.windowA.auto_expand_meta.reasons:
            reasons_text = f" ({', '.join(response.windowA.auto_expand_meta.reasons)})"
        expand_note_a = f"""
                    <div class="metric-row" style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 8px; margin-top: 10px; border-radius: 4px;">
                        <span class="metric-label" style="font-size: 0.85em; color: #78350f;">⚠ Window Expanded</span>
                        <span class="metric-value" style="font-size: 0.85em; color: #78350f;">
                            {original_days}d → {effective_days}d to reach minimum support{reasons_text}
                        </span>
                    </div>
        """

    expand_note_b = ""
    if response.windowB.auto_expand_meta and response.windowB.auto_expand_meta.expanded:
        original_days = response.windowB.auto_expand_meta.attempts[0]
        effective_days = response.windowB.auto_expand_meta.attempts[1]
        reasons_text = ""
        if response.windowB.auto_expand_meta.reasons:
            reasons_text = f" ({', '.join(response.windowB.auto_expand_meta.reasons)})"
        expand_note_b = f"""
                    <div class="metric-row" style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 8px; margin-top: 10px; border-radius: 4px;">
                        <span class="metric-label" style="font-size: 0.85em; color: #78350f;">⚠ Window Expanded</span>
                        <span class="metric-value" style="font-size: 0.85em; color: #78350f;">
                            {original_days}d → {effective_days}d to reach minimum support{reasons_text}
                        </span>
                    </div>
        """

    # Support metrics
    support_a = ""
    if metrics_a.support:
        support_a = f"""
                    <div class="metric-row" style="border-top: 2px solid #333; margin-top: 10px; padding-top: 10px;">
                        <span class="metric-label">Support Metrics</span>
                        <span class="metric-value" style="font-size: 0.9em;">
                            {format_number(metrics_a.support.known_transactions)} known, {format_number(metrics_a.support.actual_frauds)} frauds, {format_number(metrics_a.support.predicted_positives)} predicted+
                        </span>
                    </div>
        """

    support_b = ""
    if metrics_b.support:
        support_b = f"""
                    <div class="metric-row" style="border-top: 2px solid #333; margin-top: 10px; padding-top: 10px;">
                        <span class="metric-label">Support Metrics</span>
                        <span class="metric-value" style="font-size: 0.9em;">
                            {format_number(metrics_b.support.known_transactions)} known, {format_number(metrics_b.support.actual_frauds)} frauds, {format_number(metrics_b.support.predicted_positives)} predicted+
                        </span>
                    </div>
        """

    # Calibration metrics
    calibration_a = ""
    if metrics_a.brier is not None or metrics_a.log_loss is not None:
        calibration_a = '<div class="metric-row" style="border-top: 2px solid #333; margin-top: 10px; padding-top: 10px;"><span class="metric-label">Calibration</span><span class="metric-value" style="font-size: 0.9em;">'
        if metrics_a.brier is not None:
            calibration_a += f"Brier: {metrics_a.brier:.4f}"
        if metrics_a.log_loss is not None:
            if metrics_a.brier is not None:
                calibration_a += ", "
            calibration_a += f"Log Loss: {metrics_a.log_loss:.4f}"
        calibration_a += "</span></div>"

    calibration_b = ""
    if metrics_b.brier is not None or metrics_b.log_loss is not None:
        calibration_b = '<div class="metric-row" style="border-top: 2px solid #333; margin-top: 10px; padding-top: 10px;"><span class="metric-label">Calibration</span><span class="metric-value" style="font-size: 0.9em;">'
        if metrics_b.brier is not None:
            calibration_b += f"Brier: {metrics_b.brier:.4f}"
        if metrics_b.log_loss is not None:
            if metrics_b.brier is not None:
                calibration_b += ", "
            calibration_b += f"Log Loss: {metrics_b.log_loss:.4f}"
        calibration_b += "</span></div>"

    return f"""
        <div class="section">
            <h2 class="section-title">Metrics Comparison</h2>
            <div class="metrics-grid">
                <div class="window-panel window-a">
                    <div class="window-title">{response.windowA.label}{power_badge_a}</div>
                    <div class="metric-row">
                        <span class="metric-label">Total Transactions</span>
                        <span class="metric-value">{format_number(metrics_a.total_transactions)}</span>
                    </div>
                    <div class="metric-row">
                        <span class="metric-label">Over Threshold</span>
                        <span class="metric-value">{format_number(metrics_a.over_threshold)}</span>
                    </div>
                    <div class="metric-row">
                        <span class="metric-label">Precision</span>
                        <span class="metric-value">{format_percentage(metrics_a.precision)}{precision_ci_a}</span>
                    </div>
                    <div class="metric-row">
                        <span class="metric-label">Recall</span>
                        <span class="metric-value">{format_percentage(metrics_a.recall)}{recall_ci_a}</span>
                    </div>
                    <div class="metric-row">
                        <span class="metric-label">F1 Score</span>
                        <span class="metric-value">{format_percentage(metrics_a.f1)}</span>
                    </div>
                    <div class="metric-row">
                        <span class="metric-label">Accuracy</span>
                        <span class="metric-value">{format_percentage(metrics_a.accuracy)}{accuracy_ci_a}</span>
                    </div>
                    <div class="metric-row">
                        <span class="metric-label">Fraud Rate</span>
                        <span class="metric-value">{format_percentage(metrics_a.fraud_rate)}</span>
                    </div>
                    {f'<div class="metric-row"><span class="metric-label">Pending Labels</span><span class="metric-value">{metrics_a.pending_label_count}</span></div>' if metrics_a.pending_label_count else ''}
                    {expand_note_a}
                    {support_a}
                    {calibration_a}
                </div>
                
                <div class="window-panel window-b">
                    <div class="window-title">{response.windowB.label}{power_badge_b}</div>
                    <div class="metric-row">
                        <span class="metric-label">Total Transactions</span>
                        <span class="metric-value">{format_number(metrics_b.total_transactions)}</span>
                    </div>
                    <div class="metric-row">
                        <span class="metric-label">Over Threshold</span>
                        <span class="metric-value">{format_number(metrics_b.over_threshold)}</span>
                    </div>
                    <div class="metric-row">
                        <span class="metric-label">Precision</span>
                        <span class="metric-value">{format_percentage(metrics_b.precision)}{precision_ci_b}</span>
                    </div>
                    <div class="metric-row">
                        <span class="metric-label">Recall</span>
                        <span class="metric-value">{format_percentage(metrics_b.recall)}{recall_ci_b}</span>
                    </div>
                    <div class="metric-row">
                        <span class="metric-label">F1 Score</span>
                        <span class="metric-value">{format_percentage(metrics_b.f1)}</span>
                    </div>
                    <div class="metric-row">
                        <span class="metric-label">Accuracy</span>
                        <span class="metric-value">{format_percentage(metrics_b.accuracy)}{accuracy_ci_b}</span>
                    </div>
                    <div class="metric-row">
                        <span class="metric-label">Fraud Rate</span>
                        <span class="metric-value">{format_percentage(metrics_b.fraud_rate)}</span>
                    </div>
                    {f'<div class="metric-row"><span class="metric-label">Pending Labels</span><span class="metric-value">{metrics_b.pending_label_count}</span></div>' if metrics_b.pending_label_count else ''}
                    {expand_note_b}
                    {support_b}
                    {calibration_b}
                </div>
            </div>
        </div>
    """


def _generate_delta_section(response: ComparisonResponse) -> str:
    """Generate delta metrics section."""
    delta = response.delta

    return f"""
        <div class="section">
            <h2 class="section-title">Delta Metrics (Window B - Window A)</h2>
            <div class="delta-section">
                <div class="delta-grid">
                    <div class="delta-item">
                        <div class="delta-label">Precision</div>
                        <div class="delta-value {get_delta_color_class(delta.precision)}">
                            {delta.precision:+.4f}
                        </div>
                    </div>
                    <div class="delta-item">
                        <div class="delta-label">Recall</div>
                        <div class="delta-value {get_delta_color_class(delta.recall)}">
                            {delta.recall:+.4f}
                        </div>
                    </div>
                    <div class="delta-item">
                        <div class="delta-label">F1 Score</div>
                        <div class="delta-value {get_delta_color_class(delta.f1)}">
                            {delta.f1:+.4f}
                        </div>
                    </div>
                    <div class="delta-item">
                        <div class="delta-label">Accuracy</div>
                        <div class="delta-value {get_delta_color_class(delta.accuracy)}">
                            {delta.accuracy:+.4f}
                        </div>
                    </div>
                    <div class="delta-item">
                        <div class="delta-label">Fraud Rate</div>
                        <div class="delta-value {get_delta_color_class(delta.fraud_rate)}">
                            {delta.fraud_rate:+.4f}
                        </div>
                    </div>
                    {f'<div class="delta-item"><div class="delta-label">PSI</div><div class="delta-value">{delta.psi_predicted_risk:.4f}</div></div>' if delta.psi_predicted_risk else ''}
                    {f'<div class="delta-item"><div class="delta-label">KS Statistic</div><div class="delta-value">{delta.ks_stat_predicted_risk:.4f}</div></div>' if delta.ks_stat_predicted_risk else ''}
                </div>
            </div>
        </div>
    """


def _generate_confusion_matrices(response: ComparisonResponse) -> str:
    """Generate confusion matrix section."""
    return f"""
        <div class="section">
            <h2 class="section-title">Confusion Matrices</h2>
            <div class="confusion-matrix-grid">
                <div>
                    <h3 style="color: #00d4ff; margin-bottom: 15px;">{response.windowA.label}</h3>
                    <div class="confusion-matrix">
                        <div class="matrix-cell tp">
                            <div class="matrix-label">True Positive</div>
                            <div class="matrix-value">{format_number(response.A.TP)}</div>
                        </div>
                        <div class="matrix-cell fp">
                            <div class="matrix-label">False Positive</div>
                            <div class="matrix-value">{format_number(response.A.FP)}</div>
                        </div>
                        <div class="matrix-cell tn">
                            <div class="matrix-label">True Negative</div>
                            <div class="matrix-value">{format_number(response.A.TN)}</div>
                        </div>
                        <div class="matrix-cell fn">
                            <div class="matrix-label">False Negative</div>
                            <div class="matrix-value">{format_number(response.A.FN)}</div>
                        </div>
                    </div>
                </div>
                <div>
                    <h3 style="color: #ff6b6b; margin-bottom: 15px;">{response.windowB.label}</h3>
                    <div class="confusion-matrix">
                        <div class="matrix-cell tp">
                            <div class="matrix-label">True Positive</div>
                            <div class="matrix-value">{format_number(response.B.TP)}</div>
                        </div>
                        <div class="matrix-cell fp">
                            <div class="matrix-label">False Positive</div>
                            <div class="matrix-value">{format_number(response.B.FP)}</div>
                        </div>
                        <div class="matrix-cell tn">
                            <div class="matrix-label">True Negative</div>
                            <div class="matrix-value">{format_number(response.B.TN)}</div>
                        </div>
                        <div class="matrix-cell fn">
                            <div class="matrix-label">False Negative</div>
                            <div class="matrix-value">{format_number(response.B.FN)}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    """


def _generate_charts_section(
    histogram_a: Optional[Dict],
    histogram_b: Optional[Dict],
    timeseries_a: Optional[Dict],
    timeseries_b: Optional[Dict],
    response: ComparisonResponse,
) -> str:
    """Generate charts section."""
    charts_html = ""

    if histogram_a or histogram_b:
        charts_html += f"""
            <div class="section">
                <h2 class="section-title">Risk Distribution Histograms</h2>
                <div class="chart-container">
                    <div class="chart-wrapper">
                        <canvas id="histogramChart"></canvas>
                    </div>
                </div>
            </div>
        """

    if timeseries_a or timeseries_b:
        charts_html += f"""
            <div class="section">
                <h2 class="section-title">Daily Transaction Timeseries</h2>
                <div class="chart-container">
                    <div class="chart-wrapper">
                        <canvas id="timeseriesChart"></canvas>
                    </div>
                </div>
            </div>
        """

    return charts_html


def _generate_per_merchant_section(response: ComparisonResponse) -> str:
    """Generate per-merchant breakdown section."""
    if not response.per_merchant or len(response.per_merchant) == 0:
        return ""

    rows = ""
    for pm in response.per_merchant:
        merchant_id = pm.merchant_id
        metrics_a = pm.A
        metrics_b = pm.B
        delta = pm.delta

        rows += f"""
            <tr>
                <td>{merchant_id}</td>
                <td>{format_number(metrics_a.get('total_transactions', 0))}</td>
                <td>{format_number(metrics_b.get('total_transactions', 0))}</td>
                <td>{format_percentage(metrics_a.get('precision', 0))}</td>
                <td>{format_percentage(metrics_b.get('precision', 0))}</td>
                <td class="{get_delta_color_class(delta.get('precision', 0))}">
                    {delta.get('precision', 0):+.4f}
                </td>
            </tr>
        """

    return f"""
        <div class="section">
            <h2 class="section-title">Per-Merchant Breakdown</h2>
            <table class="merchant-table">
                <thead>
                    <tr>
                        <th>Merchant ID</th>
                        <th>Window A Transactions</th>
                        <th>Window B Transactions</th>
                        <th>Window A Precision</th>
                        <th>Window B Precision</th>
                        <th>Delta Precision</th>
                    </tr>
                </thead>
                <tbody>
                    {rows}
                </tbody>
            </table>
        </div>
    """


def _generate_footer() -> str:
    """Generate report footer with Olorin branding."""
    return OLORIN_FOOTER


def _prepare_histogram_data(histogram: Optional[List[HistogramBin]]) -> Optional[Dict]:
    """Prepare histogram data for Chart.js."""
    if not histogram:
        return None

    bins = []
    counts = []
    for bin_data in histogram:
        bins.append(bin_data.bin)
        counts.append(bin_data.n)

    return {"labels": bins, "data": counts}


def _prepare_timeseries_data(
    timeseries: Optional[List[TimeseriesDaily]],
) -> Optional[Dict]:
    """Prepare timeseries data for Chart.js."""
    if not timeseries:
        return None

    dates = []
    counts = []
    tps = []
    fps = []
    tns = []
    fns = []

    for ts in timeseries:
        dates.append(ts.date)
        counts.append(ts.count)
        tps.append(ts.TP or 0)
        fps.append(ts.FP or 0)
        tns.append(ts.TN or 0)
        fns.append(ts.FN or 0)

    return {
        "labels": dates,
        "counts": counts,
        "tp": tps,
        "fp": fps,
        "tn": tns,
        "fn": fns,
    }


def _generate_workload_metrics_section(
    response: ComparisonResponse, additional_metrics: Dict[str, Any]
) -> str:
    """Generate workload-aware metrics section."""
    workload_a = additional_metrics.get("workload_metrics_a", {})
    workload_b = additional_metrics.get("workload_metrics_b", {})
    precision_at_k_a = additional_metrics.get("precision_at_k_a", {})
    precision_at_k_b = additional_metrics.get("precision_at_k_b", {})
    recall_at_budget_a = additional_metrics.get("recall_at_budget_a", {})
    recall_at_budget_b = additional_metrics.get("recall_at_budget_b", {})

    if not workload_a and not workload_b:
        return ""

    precision_at_k_rows = ""
    for k in [100, 500, 1000]:
        pk_a = precision_at_k_a.get(k, {})
        pk_b = precision_at_k_b.get(k, {})
        if pk_a or pk_b:
            precision_at_k_rows += f"""
                <tr>
                    <td>Top {k}</td>
                    <td>{format_percentage(pk_a.get('precision_at_k', 0))}</td>
                    <td>{format_percentage(pk_a.get('recall_at_k', 0))}</td>
                    <td>{format_percentage(pk_b.get('precision_at_k', 0))}</td>
                    <td>{format_percentage(pk_b.get('recall_at_k', 0))}</td>
                </tr>
            """

    recall_at_budget_rows = ""
    for budget in [50, 100, 150]:
        rb_a = recall_at_budget_a.get(budget, {})
        rb_b = recall_at_budget_b.get(budget, {})
        if rb_a or rb_b:
            recall_at_budget_rows += f"""
                <tr>
                    <td>{budget} alerts/day</td>
                    <td>{format_percentage(rb_a.get('recall_at_budget', 0))}</td>
                    <td>{format_percentage(rb_a.get('precision_at_budget', 0))}</td>
                    <td>{format_percentage(rb_b.get('recall_at_budget', 0))}</td>
                    <td>{format_percentage(rb_b.get('precision_at_budget', 0))}</td>
                </tr>
            """

    return f"""
        <div class="section">
            <h2 class="section-title">Workload-Aware Metrics</h2>
            <div class="metrics-grid">
                <div class="window-panel window-a">
                    <div class="window-title">{response.windowA.label} - Operational Metrics</div>
                    <div class="metric-row">
                        <span class="metric-label">Alerts per Day</span>
                        <span class="metric-value">{workload_a.get('alerts_per_day', 0):.1f}</span>
                    </div>
                    <div class="metric-row">
                        <span class="metric-label">% of Traffic Alerted</span>
                        <span class="metric-value">{workload_a.get('pct_traffic_alerted', 0):.2f}%</span>
                    </div>
                    <div class="metric-row">
                        <span class="metric-label">Total Alerts</span>
                        <span class="metric-value">{format_number(workload_a.get('total_alerts', 0))}</span>
                    </div>
                </div>
                <div class="window-panel window-b">
                    <div class="window-title">{response.windowB.label} - Operational Metrics</div>
                    <div class="metric-row">
                        <span class="metric-label">Alerts per Day</span>
                        <span class="metric-value">{workload_b.get('alerts_per_day', 0):.1f}</span>
                    </div>
                    <div class="metric-row">
                        <span class="metric-label">% of Traffic Alerted</span>
                        <span class="metric-value">{workload_b.get('pct_traffic_alerted', 0):.2f}%</span>
                    </div>
                    <div class="metric-row">
                        <span class="metric-label">Total Alerts</span>
                        <span class="metric-value">{format_number(workload_b.get('total_alerts', 0))}</span>
                    </div>
                </div>
            </div>
            
            {f'''
            <h3 style="color: #00d4ff; margin-top: 30px; margin-bottom: 15px;">Precision@K (Top-K Anomalies)</h3>
            <table class="merchant-table">
                <thead>
                    <tr>
                        <th>K (Top Anomalies)</th>
                        <th>Window A Precision@K</th>
                        <th>Window A Recall@K</th>
                        <th>Window B Precision@K</th>
                        <th>Window B Recall@K</th>
                    </tr>
                </thead>
                <tbody>
                    {precision_at_k_rows}
                </tbody>
            </table>
            ''' if precision_at_k_rows else ''}
            
            {f'''
            <h3 style="color: #00d4ff; margin-top: 30px; margin-bottom: 15px;">Recall at Fixed Alert Budget</h3>
            <table class="merchant-table">
                <thead>
                    <tr>
                        <th>Daily Alert Budget</th>
                        <th>Window A Recall</th>
                        <th>Window A Precision</th>
                        <th>Window B Recall</th>
                        <th>Window B Precision</th>
                    </tr>
                </thead>
                <tbody>
                    {recall_at_budget_rows}
                </tbody>
            </table>
            ''' if recall_at_budget_rows else ''}
        </div>
    """


def _generate_threshold_curves_section(
    threshold_curve_a: Optional[List[Dict]],
    threshold_curve_b: Optional[List[Dict]],
    response: ComparisonResponse,
) -> str:
    """Generate threshold tuning curves section."""
    if not threshold_curve_a and not threshold_curve_b:
        return ""

    return f"""
        <div class="section">
            <h2 class="section-title">Threshold Tuning Curves</h2>
            <p style="color: #888; margin-bottom: 20px;">
                Precision-Recall curves at different risk thresholds. Use these to select optimal operating points
                based on your team's alert capacity and precision requirements.
            </p>
            <div class="chart-container">
                <div class="chart-wrapper">
                    <canvas id="thresholdCurveChart"></canvas>
                </div>
            </div>
            <div class="chart-container" style="margin-top: 30px;">
                <div class="chart-wrapper">
                    <canvas id="precisionRecallChart"></canvas>
                </div>
            </div>
        </div>
    """


def _generate_chart_scripts(
    histogram_a: Optional[Dict],
    histogram_b: Optional[Dict],
    timeseries_a: Optional[Dict],
    timeseries_b: Optional[Dict],
    threshold_curve_a: Optional[List[Dict]] = None,
    threshold_curve_b: Optional[List[Dict]] = None,
    response: Optional[ComparisonResponse] = None,
) -> str:
    """Generate Chart.js scripts."""
    scripts = ""

    # Get window labels
    window_a_label = response.windowA.label if response else "Window A"
    window_b_label = response.windowB.label if response else "Window B"

    if histogram_a or histogram_b:
        datasets = []
        if histogram_a:
            datasets.append(
                {
                    "label": "Window A",
                    "data": histogram_a["data"],
                    "backgroundColor": "rgba(0, 212, 255, 0.6)",
                    "borderColor": "rgba(0, 212, 255, 1)",
                    "borderWidth": 1,
                }
            )
        if histogram_b:
            datasets.append(
                {
                    "label": "Window B",
                    "data": histogram_b["data"],
                    "backgroundColor": "rgba(255, 107, 107, 0.6)",
                    "borderColor": "rgba(255, 107, 107, 1)",
                    "borderWidth": 1,
                }
            )

        labels = (
            histogram_a["labels"]
            if histogram_a
            else (histogram_b["labels"] if histogram_b else [])
        )

        scripts += f"""
            const histogramCtx = document.getElementById('histogramChart');
            if (histogramCtx) {{
                new Chart(histogramCtx, {{
                    type: 'bar',
                    data: {{
                        labels: {json.dumps(labels)},
                        datasets: {json.dumps(datasets)}
                    }},
                    options: {{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {{
                            legend: {{
                                labels: {{ color: '#e0e0e0' }}
                            }}
                        }},
                        scales: {{
                            y: {{
                                beginAtZero: true,
                                ticks: {{ color: '#888' }},
                                grid: {{ color: '#333' }}
                            }},
                            x: {{
                                ticks: {{ color: '#888' }},
                                grid: {{ color: '#333' }}
                            }}
                        }}
                    }}
                }});
            }}
        """

    if timeseries_a or timeseries_b:
        datasets = []
        if timeseries_a:
            datasets.append(
                {
                    "label": "Window A - Transactions",
                    "data": timeseries_a["counts"],
                    "borderColor": "rgba(0, 212, 255, 1)",
                    "backgroundColor": "rgba(0, 212, 255, 0.1)",
                    "tension": 0.4,
                }
            )
        if timeseries_b:
            datasets.append(
                {
                    "label": "Window B - Transactions",
                    "data": timeseries_b["counts"],
                    "borderColor": "rgba(255, 107, 107, 1)",
                    "backgroundColor": "rgba(255, 107, 107, 0.1)",
                    "tension": 0.4,
                }
            )

        labels = (
            timeseries_a["labels"]
            if timeseries_a
            else (timeseries_b["labels"] if timeseries_b else [])
        )

        scripts += f"""
            const timeseriesCtx = document.getElementById('timeseriesChart');
            if (timeseriesCtx) {{
                new Chart(timeseriesCtx, {{
                    type: 'line',
                    data: {{
                        labels: {json.dumps(labels)},
                        datasets: {json.dumps(datasets)}
                    }},
                    options: {{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {{
                            legend: {{
                                labels: {{ color: '#e0e0e0' }}
                            }}
                        }},
                        scales: {{
                            y: {{
                                beginAtZero: true,
                                ticks: {{ color: '#888' }},
                                grid: {{ color: '#333' }}
                            }},
                            x: {{
                                ticks: {{ color: '#888' }},
                                grid: {{ color: '#333' }}
                            }}
                        }}
                    }}
                }});
            }}
        """

    # Threshold curve charts
    if threshold_curve_a or threshold_curve_b:
        # Precision-Recall vs Threshold chart
        threshold_datasets = []
        if threshold_curve_a:
            thresholds_a = [p["threshold"] for p in threshold_curve_a]
            precision_a = [p["precision"] for p in threshold_curve_a]
            recall_a = [p["recall"] for p in threshold_curve_a]

            threshold_datasets.append(
                {
                    "label": f"{response.windowA.label} - Precision",
                    "data": precision_a,
                    "borderColor": "rgba(0, 212, 255, 1)",
                    "backgroundColor": "rgba(0, 212, 255, 0.1)",
                    "yAxisID": "y",
                    "tension": 0.4,
                }
            )
            threshold_datasets.append(
                {
                    "label": f"{response.windowA.label} - Recall",
                    "data": recall_a,
                    "borderColor": "rgba(0, 212, 255, 0.6)",
                    "backgroundColor": "rgba(0, 212, 255, 0.05)",
                    "yAxisID": "y",
                    "tension": 0.4,
                    "borderDash": [5, 5],
                }
            )

        if threshold_curve_b:
            thresholds_b = [p["threshold"] for p in threshold_curve_b]
            precision_b = [p["precision"] for p in threshold_curve_b]
            recall_b = [p["recall"] for p in threshold_curve_b]

            threshold_datasets.append(
                {
                    "label": f"{response.windowB.label} - Precision",
                    "data": precision_b,
                    "borderColor": "rgba(255, 107, 107, 1)",
                    "backgroundColor": "rgba(255, 107, 107, 0.1)",
                    "yAxisID": "y",
                    "tension": 0.4,
                }
            )
            threshold_datasets.append(
                {
                    "label": f"{response.windowB.label} - Recall",
                    "data": recall_b,
                    "borderColor": "rgba(255, 107, 107, 0.6)",
                    "backgroundColor": "rgba(255, 107, 107, 0.05)",
                    "yAxisID": "y",
                    "tension": 0.4,
                    "borderDash": [5, 5],
                }
            )

        threshold_labels = (
            thresholds_a
            if threshold_curve_a
            else (thresholds_b if threshold_curve_b else [])
        )
        threshold_labels_str = [f"{t:.1f}" for t in threshold_labels]

        scripts += f"""
            const thresholdCtx = document.getElementById('thresholdCurveChart');
            if (thresholdCtx) {{
                new Chart(thresholdCtx, {{
                    type: 'line',
                    data: {{
                        labels: {json.dumps(threshold_labels_str)},
                        datasets: {json.dumps(threshold_datasets)}
                    }},
                    options: {{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {{
                            legend: {{
                                labels: {{ color: '#e0e0e0' }}
                            }},
                            title: {{
                                display: true,
                                text: 'Precision & Recall vs Risk Threshold',
                                color: '#e0e0e0',
                                font: {{ size: 18 }}
                            }}
                        }},
                        scales: {{
                            y: {{
                                beginAtZero: true,
                                max: 1.0,
                                ticks: {{
                                    color: '#888',
                                    callback: function(value) {{
                                        return (value * 100).toFixed(0) + '%';
                                    }}
                                }},
                                grid: {{ color: '#333' }}
                            }},
                            x: {{
                                title: {{
                                    display: true,
                                    text: 'Risk Threshold',
                                    color: '#888'
                                }},
                                ticks: {{ color: '#888' }},
                                grid: {{ color: '#333' }}
                            }}
                        }}
                    }}
                }});
            }}
        """

        # Precision-Recall curve chart
        pr_datasets = []
        if threshold_curve_a:
            precision_a = [p["precision"] for p in threshold_curve_a]
            recall_a = [p["recall"] for p in threshold_curve_a]
            pr_data_a = [[r, p] for r, p in zip(recall_a, precision_a)]
            pr_datasets.append(
                {
                    "label": window_a_label,
                    "data": pr_data_a,
                    "borderColor": "rgba(0, 212, 255, 1)",
                    "backgroundColor": "rgba(0, 212, 255, 0.1)",
                    "pointRadius": 3,
                    "tension": 0.4,
                }
            )

        if threshold_curve_b:
            precision_b = [p["precision"] for p in threshold_curve_b]
            recall_b = [p["recall"] for p in threshold_curve_b]
            pr_data_b = [[r, p] for r, p in zip(recall_b, precision_b)]
            pr_datasets.append(
                {
                    "label": window_b_label,
                    "data": pr_data_b,
                    "borderColor": "rgba(255, 107, 107, 1)",
                    "backgroundColor": "rgba(255, 107, 107, 0.1)",
                    "pointRadius": 3,
                    "tension": 0.4,
                }
            )

        scripts += f"""
            const prCtx = document.getElementById('precisionRecallChart');
            if (prCtx) {{
                new Chart(prCtx, {{
                    type: 'line',
                    data: {{
                        datasets: {json.dumps(pr_datasets)}
                    }},
                    options: {{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {{
                            legend: {{
                                labels: {{ color: '#e0e0e0' }}
                            }},
                            title: {{
                                display: true,
                                text: 'Precision-Recall Curve',
                                color: '#e0e0e0',
                                font: {{ size: 18 }}
                            }}
                        }},
                        scales: {{
                            y: {{
                                beginAtZero: true,
                                max: 1.0,
                                title: {{
                                    display: true,
                                    text: 'Precision',
                                    color: '#888'
                                }},
                                ticks: {{
                                    color: '#888',
                                    callback: function(value) {{
                                        return (value * 100).toFixed(0) + '%';
                                    }}
                                }},
                                grid: {{ color: '#333' }}
                            }},
                            x: {{
                                beginAtZero: true,
                                max: 1.0,
                                title: {{
                                    display: true,
                                    text: 'Recall',
                                    color: '#888'
                                }},
                                ticks: {{
                                    color: '#888',
                                    callback: function(value) {{
                                        return (value * 100).toFixed(0) + '%';
                                    }}
                                }},
                                grid: {{ color: '#333' }}
                            }}
                        }}
                    }}
                }});
            }}
        """

    return scripts
