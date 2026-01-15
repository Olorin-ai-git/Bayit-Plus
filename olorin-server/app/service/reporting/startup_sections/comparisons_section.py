"""
Auto Comparisons Section for Startup Reports.

Handles auto-comparisons results table, zero metrics explanations,
and comparison summary details.

DPA COMPLIANCE: Entity values obfuscated per Section 9.4.
"""

from typing import Any, Dict, Optional

from app.config.threshold_config import get_risk_threshold
from app.service.reporting.privacy_safe_display import get_display_entity_value


def generate_auto_comparisons_section(data: Dict[str, Any]) -> str:
    """Generate auto-comparisons section."""
    comp_data = data["auto_comparisons"]
    status = "✅ Completed" if comp_data["completed"] else "❌ Not Completed"
    zip_path = comp_data["zip_path"] or "N/A"

    results_table = _build_results_table(comp_data["results"]) if comp_data["results"] else ""

    return f"""
    <div class="panel">
      <h2>Auto Comparisons</h2>
      <div class="kvs">
        <div class="kv">Status:</div><div>{status}</div>
        <div class="kv">Count:</div><div>{comp_data["count"]}</div>
        <div class="kv">Package:</div><div>{zip_path}</div>
      </div>
      {results_table}
    </div>
    """


def _build_results_table(results: list) -> str:
    """
    Build HTML table for comparison results.

    DPA COMPLIANCE: Entity values are obfuscated per Section 9.4.
    """
    rows = []
    for i, result in enumerate(results[:10], 1):
        raw_entity_value = result.get("entity_value", result.get("entity", "N/A"))

        # Obfuscate entity value for DPA compliance
        entity_value = get_display_entity_value(
            entity_value=raw_entity_value,
            entity_type=result.get("entity_type", "email")
        )

        investigation_id = result.get("investigation_id", "N/A")
        status = result.get("status", "unknown")
        success = result.get("success", False) if isinstance(result.get("success"), bool) else (status == "success")
        status_icon = "✅" if success else "❌"

        error_html = ""
        if status == "error" or not success:
            error_msg = result.get("error", result.get("error_explanation", "Unknown error"))
            error_html = f'''<tr><td colspan="4"><div style="color: var(--danger); font-size: 12px; margin-top: 4px; padding: 8px; background: rgba(239, 68, 68, 0.1); border-radius: 4px; border-left: 3px solid var(--danger);"><strong>Error:</strong> {error_msg}</div></td></tr>'''

        inv_id_display = f"{investigation_id[:20]}..." if investigation_id != "N/A" and len(investigation_id) > 20 else investigation_id

        rows.append(f"""
        <tr>
          <td>{i}</td>
          <td>{entity_value}</td>
          <td>{inv_id_display}</td>
          <td>{status_icon} {status.capitalize() if status != "success" else ""}</td>
        </tr>
        {error_html}
        """)

    return f"""
    <table style="width: 100%;">
      <thead>
        <tr>
          <th style="width: 5%;">#</th>
          <th style="width: 25%;">Entity</th>
          <th style="width: 30%;">Investigation ID</th>
          <th style="width: 15%;">Status</th>
        </tr>
      </thead>
      <tbody>{''.join(rows)}</tbody>
    </table>
    """


def generate_zero_metrics_explanation(
    window_a: Dict[str, Any],
    window_b: Dict[str, Any],
    artifact_data: Optional[Dict[str, Any]] = None,
) -> str:
    """Generate explanation for why metrics are zero."""
    threshold = get_risk_threshold()
    fn_count = window_a.get("FN", 0)
    total_tx_a = window_a.get("total_transactions", 0)
    total_tx_b = window_b.get("total_transactions", 0)

    reasons = _get_zero_metrics_reasons(total_tx_a, total_tx_b, threshold)
    reasons_html = _format_reasons_html(reasons)

    fn_note = ""
    if fn_count > 0:
        fn_note = f'<p style="margin: 8px 0 0 0; font-size: 13px;"><strong>Note:</strong> Window A shows {fn_count} False Negatives (fraud missed by risk assessment).</p>'

    return f"""
    <div style="margin-top: 16px; padding: 12px; background: rgba(245, 158, 11, 0.1); border-radius: 8px; border-left: 3px solid var(--warn);">
      <strong style="color: var(--warn);">Zero Metrics Explanation:</strong>
      <ul style="margin: 8px 0 0 20px; padding-left: 0; font-size: 13px; line-height: 1.6;">{reasons_html}</ul>
      {fn_note}
    </div>
    """


def _get_zero_metrics_reasons(total_tx_a: int, total_tx_b: int, threshold: float) -> list:
    """Get list of reasons for zero metrics."""
    reasons = []

    if total_tx_a == 0 and total_tx_b == 0:
        reasons.extend([
            "<strong>CRITICAL:</strong> No transactions found in either time window.",
            "  • Entity had no transactions during investigation or validation periods",
            "  • Time windows may be incorrect or outside transaction history",
            "  • Database query may have failed or returned empty results",
        ])
    elif total_tx_a == 0:
        reasons.append("<strong>CRITICAL:</strong> No transactions found in Window A (Historical Investigation)")
    elif total_tx_b == 0:
        reasons.append("<strong>CRITICAL:</strong> No transactions found in Window B (Validation Period)")
    else:
        reasons.extend([
            "All performance metrics are 0.0% because no transactions were flagged as fraud (TP=0, FP=0).",
            "",
            "Possible reasons:",
            "  • <strong>Risk score not applied:</strong> predicted_risk is missing or None",
            "  • <strong>Risk score extraction failed:</strong> overall_risk_score is 0.0",
            f"  • <strong>Threshold too high:</strong> Risk threshold ({threshold:.1%}) > all predicted_risk values",
            "  • <strong>No fraud predictions:</strong> No transactions had predicted_risk >= threshold",
        ])

    return reasons


def _format_reasons_html(reasons: list) -> str:
    """Format reasons list as HTML."""
    items = []
    for r in reasons:
        style = "margin: 2px 0; margin-left: 20px;" if r.startswith("  •") else "margin: 4px 0;"
        items.append(f"<li style='{style}'>{r}</li>")
    return "".join(items)


def generate_comparison_summary(
    window_a: Dict[str, Any],
    window_b: Dict[str, Any],
    delta: Dict[str, Any],
    artifact_data: Optional[Dict[str, Any]] = None,
) -> str:
    """Generate detailed explanation of comparison metrics."""
    threshold = get_risk_threshold()

    return f"""
    <details style="margin-top: 20px; padding: 16px; background: var(--panel-glass); border-radius: 8px; border: 1px solid var(--border);">
      <summary style="cursor: pointer; font-weight: 600; color: var(--accent); font-size: 16px; margin-bottom: 12px;">
        Comparison Metrics Explanation
      </summary>
      <div style="margin-top: 16px; font-size: 13px; line-height: 1.8;">
        <h4 style="margin: 16px 0 8px 0; color: var(--accent);">Understanding the Metrics</h4>
        <p style="margin: 8px 0;"><strong>Risk Threshold:</strong> {threshold:.1%} - Transactions with predicted_risk >= {threshold:.1%} are flagged as potential fraud.</p>

        <h5 style="margin: 16px 0 8px 0; color: var(--accent-secondary);">Transaction Analysis Components:</h5>
        <ul style="margin: 8px 0 0 20px; padding-left: 0;">
          <li><strong>True Positives (TP):</strong> Correctly flagged as fraud</li>
          <li><strong>False Positives (FP):</strong> Incorrectly flagged as fraud</li>
          <li><strong>True Negatives (TN):</strong> Correctly identified as not fraud</li>
          <li><strong>False Negatives (FN):</strong> Missed fraud</li>
        </ul>

        <h5 style="margin: 16px 0 8px 0; color: var(--accent-secondary);">Performance Metrics:</h5>
        <ul style="margin: 8px 0 0 20px; padding-left: 0;">
          <li><strong>Precision:</strong> TP / (TP + FP) - Of flagged fraud, how many were actually fraud?</li>
          <li><strong>Recall:</strong> TP / (TP + FN) - Of all actual fraud, how many did we catch?</li>
          <li><strong>F1 Score:</strong> Harmonic mean of Precision and Recall</li>
          <li><strong>Accuracy:</strong> (TP + TN) / Total - Overall correctness</li>
        </ul>

        <h5 style="margin: 16px 0 8px 0; color: var(--accent-secondary);">Delta Values:</h5>
        <p style="margin: 8px 0;">Delta shows change from Window A to Window B.
        <span style="color: var(--ok);">Positive</span> = improvement,
        <span style="color: var(--danger);">negative</span> = degradation.</p>
      </div>
    </details>
    """
