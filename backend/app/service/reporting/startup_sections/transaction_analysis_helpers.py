"""Transaction Analysis HTML Helper Functions."""

from typing import Any, List


def fmt_pct(val: float) -> str:
    """Format value as percentage."""
    return f"{val:.1%}" if val is not None else "N/A"


def generate_classification_table(
    tp: int,
    fp: int,
    tn: int,
    fn: int,
    excluded: int = 0,
    title: str = "Classification",
    subtitle: str = "",
    ok_color: str = "var(--ok)",
    warn_color: str = "var(--warn)",
    danger_color: str = "var(--danger)",
) -> str:
    """Generate HTML table for classification counts."""
    total = tp + fp + tn + fn
    total_with_excluded = total + excluded

    rows = [
        _classification_row("True Positives (TP)", "Correctly Flagged as Fraud", tp, total, ok_color),
        _classification_row("False Positives (FP)", "False Alarm (Not Actually Fraud)", fp, total, warn_color),
        _classification_row("True Negatives (TN)", "Correctly Cleared", tn, total, ok_color),
        _classification_row("False Negatives (FN)", "Missed Fraud", fn, total, danger_color),
    ]

    excluded_row = ""
    if excluded > 0:
        excluded_row = f"""
        <tr style="border-bottom: 2px solid var(--border);">
          <td style="padding: 10px 8px;"><strong>Excluded</strong><br>
            <span style="color: var(--muted); font-size: 12px;">Missing predicted_risk</span></td>
          <td style="text-align: right; padding: 10px 8px;">{excluded}</td>
          <td style="text-align: right; padding: 10px 8px; color: var(--muted);">
            {fmt_pct(excluded / total_with_excluded) if total_with_excluded > 0 else '0%'}</td>
        </tr>"""

    subtitle_html = f'<p style="color: var(--muted); font-size: 12px; margin-bottom: 12px;">{subtitle}</p>' if subtitle else ""

    return f"""
    <h3>{title}</h3>
    {subtitle_html}
    <div style="margin: 16px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="border-bottom: 2px solid var(--border);">
            <th style="text-align: left; padding: 12px 8px;">Metric</th>
            <th style="text-align: right; padding: 12px 8px;">Count</th>
            <th style="text-align: right; padding: 12px 8px;">Percentage</th>
          </tr>
        </thead>
        <tbody>
          {''.join(rows)}
          {excluded_row}
          <tr style="background: var(--panel-glass); border-top: 2px solid var(--border);">
            <td style="padding: 10px 8px;"><strong>Total Transactions</strong></td>
            <td style="text-align: right; padding: 10px 8px; font-weight: 600;">{total_with_excluded}</td>
            <td style="text-align: right; padding: 10px 8px;">100%</td>
          </tr>
        </tbody>
      </table>
    </div>
    """


def _classification_row(label: str, desc: str, count: int, total: int, color: str) -> str:
    """Generate a single classification table row."""
    pct = fmt_pct(count / total) if total > 0 else "0%"
    return f"""
    <tr style="border-bottom: 1px solid var(--border);">
      <td style="padding: 10px 8px;"><strong>{label}</strong><br>
        <span style="color: var(--muted); font-size: 12px;">{desc}</span></td>
      <td style="text-align: right; padding: 10px 8px; font-weight: 600;">{count}</td>
      <td style="text-align: right; padding: 10px 8px; color: {color};">{pct}</td>
    </tr>"""


def generate_metrics_table(
    precision: float,
    recall: float,
    f1_score: float,
    accuracy: float,
) -> str:
    """Generate performance metrics table."""
    return f"""
    <h3>Performance Metrics</h3>
    <div style="margin: 16px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="border-bottom: 2px solid var(--border);">
            <th style="text-align: left; padding: 12px 8px;">Metric</th>
            <th style="text-align: right; padding: 12px 8px;">Value</th>
            <th style="text-align: left; padding: 12px 8px;">Description</th>
          </tr>
        </thead>
        <tbody>
          {_metric_row("Precision", precision, "TP / (TP + FP) - Of flagged, how many were fraud?")}
          {_metric_row("Recall", recall, "TP / (TP + FN) - Of all fraud, how many did we catch?")}
          {_metric_row("F1 Score", f1_score, "Harmonic mean of Precision and Recall")}
          {_metric_row("Accuracy", accuracy, "(TP + TN) / Total - Overall correctness")}
        </tbody>
      </table>
    </div>
    """


def _metric_row(name: str, value: float, description: str) -> str:
    """Generate a single metric table row."""
    return f"""
    <tr style="border-bottom: 1px solid var(--border);">
      <td style="padding: 10px 8px;"><strong>{name}</strong></td>
      <td style="text-align: right; padding: 10px 8px; font-weight: 600; color: var(--accent);">{fmt_pct(value)}</td>
      <td style="padding: 10px 8px; color: var(--muted); font-size: 12px;">{description}</td>
    </tr>"""


def generate_metrics_cards(
    precision: float,
    recall: float,
    f1_score: float,
    accuracy: float,
) -> str:
    """Generate compact metrics cards grid."""
    return f"""
    <div style="margin: 16px 0; display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;">
      {_metric_card("Precision", precision)}
      {_metric_card("Recall", recall)}
      {_metric_card("F1 Score", f1_score)}
      {_metric_card("Accuracy", accuracy)}
    </div>
    """


def _metric_card(label: str, value: float) -> str:
    """Generate a single metric card."""
    return f"""
    <div style="background: var(--panel-glass); padding: 12px; border-radius: 8px; text-align: center;">
      <div style="font-size: 18px; font-weight: 600; color: var(--accent);">{fmt_pct(value)}</div>
      <div style="font-size: 11px; color: var(--muted);">{label}</div>
    </div>"""


def generate_entity_breakdown(
    entity_matrices: List[Any],
    entity_count: int,
) -> str:
    """Generate per-entity breakdown table."""
    if not entity_matrices:
        return ""

    rows = []
    for matrix in entity_matrices:
        entity_id = matrix.entity_id
        truncated = f"{entity_id[:50]}..." if len(entity_id) > 50 else entity_id
        rows.append(f"""
        <tr>
          <td><code>{truncated}</code></td>
          <td>{matrix.TP}</td><td>{matrix.FP}</td><td>{matrix.TN}</td><td>{matrix.FN}</td>
          <td>{matrix.excluded_count}</td>
          <td>{fmt_pct(matrix.precision)}</td><td>{fmt_pct(matrix.recall)}</td>
          <td>{fmt_pct(matrix.f1_score)}</td><td>{fmt_pct(matrix.accuracy)}</td>
        </tr>""")

    return f"""
    <details style="margin-top: 16px; padding: 16px; background: var(--panel-glass);
                    border-radius: 8px; border: 1px solid var(--border);">
      <summary style="cursor: pointer; font-weight: 600; color: var(--accent); font-size: 14px;">
        Per-Entity Breakdown ({entity_count} entities)
      </summary>
      <div style="margin-top: 16px; overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
          <thead>
            <tr style="border-bottom: 1px solid var(--border);">
              <th style="text-align: left; padding: 8px;">Entity</th>
              <th style="text-align: right; padding: 8px;">TP</th>
              <th style="text-align: right; padding: 8px;">FP</th>
              <th style="text-align: right; padding: 8px;">TN</th>
              <th style="text-align: right; padding: 8px;">FN</th>
              <th style="text-align: right; padding: 8px;">Excl</th>
              <th style="text-align: right; padding: 8px;">Prec</th>
              <th style="text-align: right; padding: 8px;">Recall</th>
              <th style="text-align: right; padding: 8px;">F1</th>
              <th style="text-align: right; padding: 8px;">Acc</th>
            </tr>
          </thead>
          <tbody>{''.join(rows)}</tbody>
        </table>
      </div>
    </details>
    """
