"""Comparison Metrics Section for Startup Reports."""

import logging
from typing import Any, Dict

from .comparisons_section import generate_comparison_summary, generate_zero_metrics_explanation
from .comparison_metrics_helpers import (
    build_comparison_table_html,
    extract_window_data,
    format_window_label,
)
from .comparison_metrics_loader import load_artifact_data, load_comparison_results

logger = logging.getLogger(__name__)


def generate_comparison_metrics_section(data: Dict[str, Any]) -> str:
    """Generate comprehensive comparison metrics section with full metrics for each comparison."""
    results, zip_dir = load_comparison_results(data)

    if not results:
        return _generate_no_results_section()

    comparison_tables = []

    for i, result in enumerate(results, 1):
        if result.get("status") != "success":
            continue

        table_html = _build_comparison_table(i, result, zip_dir)
        if table_html:
            comparison_tables.append(table_html)

    if not comparison_tables:
        return _generate_no_success_section()

    return f"""
    <div class="panel">
      <h2>Comparison Metrics</h2>
      <p style="color: var(--muted); margin-bottom: 24px;">
        Detailed performance metrics comparing fraud detection effectiveness between two time windows.
        Delta values show the change from Window A to Window B (positive = improvement, negative = degradation).
      </p>
      {''.join(comparison_tables)}
    </div>
    """


def _build_comparison_table(
    index: int,
    result: Dict[str, Any],
    zip_dir: Any,
) -> str:
    """Build a single comparison table for a result."""
    entity_value = result.get("entity_value", result.get("entity", "N/A"))
    investigation_id = result.get("investigation_id", "N/A")

    # Load artifact data
    artifact_data = load_artifact_data(result, zip_dir)

    # Extract window data
    window_a, window_b, delta, window_a_info, window_b_info = extract_window_data(result, artifact_data)

    # Format labels
    window_a_label = format_window_label(window_a_info, "Window A")
    window_b_label = format_window_label(window_b_info, "Window B")

    # Generate zero metrics explanation if needed
    zero_metrics_html = ""
    if _has_zero_metrics(window_a, window_b):
        zero_metrics_html = generate_zero_metrics_explanation(window_a, window_b, artifact_data)

    # Generate comparison summary
    comparison_summary_html = generate_comparison_summary(window_a, window_b, delta, artifact_data)

    return build_comparison_table_html(
        index=index,
        entity_value=entity_value,
        investigation_id=investigation_id,
        window_a=window_a,
        window_b=window_b,
        delta=delta,
        window_a_label=window_a_label,
        window_b_label=window_b_label,
        zero_metrics_html=zero_metrics_html,
        comparison_summary_html=comparison_summary_html,
    )


def _has_zero_metrics(window_a: Dict[str, Any], window_b: Dict[str, Any]) -> bool:
    """Check if both windows have zero TP and FP."""
    return (
        window_a.get("TP", 0) == 0 and
        window_a.get("FP", 0) == 0 and
        window_b.get("TP", 0) == 0 and
        window_b.get("FP", 0) == 0
    )


def _generate_no_results_section() -> str:
    """Generate section when no comparison results available."""
    return """
    <div class="panel">
      <h2>Comparison Metrics</h2>
      <p style="color: var(--muted);">No comparison results available.</p>
    </div>
    """


def _generate_no_success_section() -> str:
    """Generate section when no successful comparison results available."""
    return """
    <div class="panel">
      <h2>Comparison Metrics</h2>
      <p style="color: var(--muted);">No successful comparison results available.</p>
    </div>
    """
