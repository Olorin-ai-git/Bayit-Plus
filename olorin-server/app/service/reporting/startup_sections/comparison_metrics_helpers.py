"""
Comparison Metrics Helper Functions for HTML generation.

DPA COMPLIANCE: Entity values obfuscated per Section 9.4.
"""
from typing import Any, Dict, Optional, Tuple

from app.service.reporting.privacy_safe_display import get_display_entity_value


def extract_window_data(
    result: Dict[str, Any],
    artifact_data: Optional[Dict[str, Any]],
) -> Tuple[Dict[str, Any], Dict[str, Any], Dict[str, Any], Dict[str, Any], Dict[str, Any]]:
    """Extract window A, window B, delta, and window info from result/artifact."""
    comparison_response = result.get("comparison_response")
    metrics = result.get("metrics", {})
    use_comparison_response = _should_use_comparison_response(comparison_response)

    if use_comparison_response:
        return _extract_from_comparison_response(comparison_response)

    if artifact_data:
        window_a = artifact_data.get("A", {})
        window_b = artifact_data.get("B", {})
        delta = artifact_data.get("delta", {})
        window_a_info = artifact_data.get("windowA", {})
        window_b_info = artifact_data.get("windowB", {})
        logger.info(f"Extracted metrics from artifact for {entity_value}")
        return window_a, window_b, delta, window_a_info, window_b_info

    # Fallback to metrics dict
    logger.warning(f"No comparison data found for {entity_value} - using empty metrics")
    return (
        metrics.get("window_a", {}),
        metrics.get("window_b", {}),
        metrics.get("delta", {}),
        {"label": "Window A"},
        {"label": "Window B"},
    )


def _should_use_comparison_response(comparison_response: Any) -> bool:
    """Check if comparison_response has valid data."""
    if not comparison_response:
        return False
    if isinstance(comparison_response, dict):
        return "A" in comparison_response and "B" in comparison_response
    return hasattr(comparison_response, "A") and hasattr(comparison_response, "B")


def _extract_from_comparison_response(
    response: Any,
) -> Tuple[Dict[str, Any], Dict[str, Any], Dict[str, Any], Dict[str, Any], Dict[str, Any]]:
    """Extract window data from comparison_response (dict or object)."""
    if isinstance(response, dict):
        return (
            response.get("A", {}),
            response.get("B", {}),
            response.get("delta", {}),
            response.get("windowA", {}),
            response.get("windowB", {}),
        )
    # Object with attributes
    return (
        _extract_window_metrics(response.A),
        _extract_window_metrics(response.B),
        _extract_delta_metrics(response),
        _extract_window_info(response, "windowA", "Window A"),
        _extract_window_info(response, "windowB", "Window B"),
    )


def _extract_window_metrics(window: Any) -> Dict[str, Any]:
    """Extract metrics from a window object."""
    return {
        "total_transactions": getattr(window, "total_transactions", 0),
        "precision": getattr(window, "precision", 0.0),
        "recall": getattr(window, "recall", 0.0),
        "f1": getattr(window, "f1", 0.0),
        "accuracy": getattr(window, "accuracy", 0.0),
        "fraud_rate": getattr(window, "fraud_rate", 0.0),
        "TP": getattr(window, "TP", 0),
        "FP": getattr(window, "FP", 0),
        "TN": getattr(window, "TN", 0),
        "FN": getattr(window, "FN", 0),
        "over_threshold": getattr(window, "over_threshold", 0),
    }


def _extract_delta_metrics(response: Any) -> Dict[str, Any]:
    """Extract delta metrics from response object."""
    if not hasattr(response, "delta"):
        return {}
    delta = response.delta
    return {
        "precision": getattr(delta, "precision", 0.0),
        "recall": getattr(delta, "recall", 0.0),
        "f1": getattr(delta, "f1", 0.0),
        "accuracy": getattr(delta, "accuracy", 0.0),
        "fraud_rate": getattr(delta, "fraud_rate", 0.0),
    }


def _extract_window_info(response: Any, attr_name: str, default_label: str) -> Dict[str, Any]:
    """Extract window info (label, start, end) from response object."""
    if not hasattr(response, attr_name):
        return {"label": default_label}
    window = getattr(response, attr_name)
    return {
        "label": getattr(window, "label", default_label),
        "start": getattr(window, "start", ""),
        "end": getattr(window, "end", ""),
    }


def format_window_label(window_info: Dict[str, Any], default: str) -> str:
    """Format window label with optional date range."""
    label = window_info.get("label", default)
    start = window_info.get("start")
    end = window_info.get("end")
    if start and end:
        label += f" ({start} to {end})"
    return label


def format_delta(value: Any) -> str:
    """Format delta value with color indicator."""
    if value is None:
        return "N/A"
    if value > 0:
        return f'<span style="color: var(--ok);">+{value:.3f}</span>'
    if value < 0:
        return f'<span style="color: var(--danger);">{value:.3f}</span>'
    return f'<span style="color: var(--muted);">{value:.3f}</span>'


def format_pct(value: Any) -> str:
    """Format value as percentage."""
    if value is None:
        return "N/A"
    return f"{value:.1%}"


def build_comparison_table_html(
    index: int,
    entity_value: str,
    investigation_id: str,
    window_a: Dict[str, Any],
    window_b: Dict[str, Any],
    delta: Dict[str, Any],
    window_a_label: str,
    window_b_label: str,
    zero_metrics_html: str,
    comparison_summary_html: str,
) -> str:
    """
    Build HTML for a single comparison table.

    DPA COMPLIANCE: Entity value is obfuscated per Section 9.4.
    """
    # Obfuscate entity value for DPA compliance
    obfuscated_entity = get_display_entity_value(
        entity_value=entity_value,
        entity_type="email"
    )

    inv_id_display = investigation_id[:30] + "..." if len(investigation_id) > 30 else investigation_id

    rows = _build_metric_rows(window_a, window_b, delta)

    return f"""
    <div style="margin-bottom: 32px; padding: 20px; background: var(--panel-glass); border-radius: 12px; border: 1px solid var(--border);">
      <h3 style="margin: 0 0 16px 0; color: var(--accent);">Comparison {index}: {obfuscated_entity}</h3>
      <p style="color: var(--muted); margin-bottom: 16px; font-size: 13px;">
        Investigation ID: <code style="background: var(--chip); padding: 2px 6px; border-radius: 4px;">{inv_id_display}</code>
      </p>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
        <thead>
          <tr style="background: var(--panel);">
            <th style="padding: 12px; text-align: left; border-bottom: 2px solid var(--border);">Metric</th>
            <th style="padding: 12px; text-align: right; border-bottom: 2px solid var(--border);">{window_a_label}</th>
            <th style="padding: 12px; text-align: right; border-bottom: 2px solid var(--border);">{window_b_label}</th>
            <th style="padding: 12px; text-align: right; border-bottom: 2px solid var(--border);">Delta (B - A)</th>
          </tr>
        </thead>
        <tbody>{rows}</tbody>
      </table>
      {zero_metrics_html}
      {comparison_summary_html}
    </div>
    """


def _build_metric_rows(window_a: Dict[str, Any], window_b: Dict[str, Any], delta: Dict[str, Any]) -> str:
    """Build HTML rows for all metrics."""
    rows = []
    count_metrics = [("Total Transactions", "total_transactions", False), ("Over Threshold", "over_threshold", False),
                     ("True Positives (TP)", "TP", True), ("False Positives (FP)", "FP", False),
                     ("True Negatives (TN)", "TN", False), ("False Negatives (FN)", "FN", False)]
    for label, key, hl in count_metrics:
        val_a, val_b = window_a.get(key, 0), window_b.get(key, 0)
        bg = "background: rgba(168, 85, 247, 0.05);" if hl else ""
        rows.append(f'<tr style="{bg}"><td style="padding: 10px; font-weight: 600;">{label}</td>'
                    f'<td style="padding: 10px; text-align: right;">{val_a:,}</td>'
                    f'<td style="padding: 10px; text-align: right;">{val_b:,}</td>'
                    f'<td style="padding: 10px; text-align: right;">{format_delta(val_b - val_a)}</td></tr>')
    perf_metrics = [("Precision", "precision"), ("Recall", "recall"), ("F1 Score", "f1"),
                    ("Accuracy", "accuracy"), ("Fraud Rate", "fraud_rate")]
    for label, key in perf_metrics:
        border = " border-top: 2px solid var(--border);" if key == "precision" else ""
        rows.append(f'<tr style="background: rgba(168, 85, 247, 0.1);{border}">'
                    f'<td style="padding: 10px; font-weight: 700;">{label}</td>'
                    f'<td style="padding: 10px; text-align: right; font-weight: 600;">{format_pct(window_a.get(key, 0.0))}</td>'
                    f'<td style="padding: 10px; text-align: right; font-weight: 600;">{format_pct(window_b.get(key, 0.0))}</td>'
                    f'<td style="padding: 10px; text-align: right; font-weight: 600;">{format_delta(delta.get(key, 0.0))}</td></tr>')
    return "".join(rows)
