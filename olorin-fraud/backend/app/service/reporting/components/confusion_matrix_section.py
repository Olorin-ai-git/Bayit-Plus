"""
Confusion Matrix Section Component.

Generates the classification matrix HTML section for reports.
Used by both standalone transaction analysis reports and startup reports.

Feature: unified-report-hierarchy
"""

from typing import Any, Dict, List, Optional


def generate_confusion_matrix_section(
    tp: int,
    fp: int,
    tn: int,
    fn: int,
    excluded: int = 0,
    precision: float = 0.0,
    recall: float = 0.0,
    f1_score: float = 0.0,
    accuracy: float = 0.0,
    risk_threshold: float = 0.3,
    entity_count: int = 1,
    show_visual_grid: bool = True,
    show_metrics_cards: bool = True,
    show_entity_breakdown: bool = False,
    entity_matrices: Optional[List[Any]] = None,
) -> str:
    """
    Generate confusion matrix HTML section.

    Args:
        tp: True Positives count
        fp: False Positives count
        tn: True Negatives count
        fn: False Negatives count
        excluded: Excluded transactions count
        precision: Precision metric (0-1)
        recall: Recall metric (0-1)
        f1_score: F1 score (0-1)
        accuracy: Accuracy metric (0-1)
        risk_threshold: Risk threshold used
        entity_count: Number of entities analyzed
        show_visual_grid: Include 2x2 visual matrix grid
        show_metrics_cards: Include metrics cards
        show_entity_breakdown: Include per-entity breakdown table
        entity_matrices: List of per-entity matrices for breakdown

    Returns:
        HTML string for the confusion matrix section
    """
    total = tp + fp + tn + fn

    if total == 0:
        return _generate_empty_section(risk_threshold, entity_count, excluded)

    sections = []

    # Header
    sections.append(_generate_section_header(entity_count, risk_threshold))

    # Visual 2x2 grid
    if show_visual_grid:
        sections.append(_generate_visual_grid(tp, fp, tn, fn))

    # Classification table
    sections.append(_generate_classification_table(tp, fp, tn, fn, excluded))

    # Metrics cards
    if show_metrics_cards:
        sections.append(_generate_metrics_cards(precision, recall, f1_score, accuracy))

    # Per-entity breakdown
    if show_entity_breakdown and entity_matrices:
        sections.append(_generate_entity_breakdown(entity_matrices, entity_count))

    return f"""
    <div class="panel">
        {''.join(sections)}
    </div>
    """


def _generate_empty_section(threshold: float, entity_count: int, excluded: int) -> str:
    """Generate section when no transactions found."""
    return f"""
    <div class="panel">
        <h2>Classification Matrix</h2>
        <p style="color: var(--muted);">No transactions matched the criteria.</p>
        <p style="color: var(--muted); font-size: 0.85rem; margin-top: 8px;">
            Risk Threshold: {threshold:.0%} | Entities: {entity_count} | Excluded: {excluded}
        </p>
    </div>
    """


def _generate_section_header(entity_count: int, threshold: float) -> str:
    """Generate section header."""
    return f"""
    <h2 style="color: var(--accent-secondary);">Classification Matrix</h2>
    <p style="color: var(--muted); font-size: 0.85rem; margin-bottom: 16px;">
        Aggregated across {entity_count} entities at {threshold:.0%} threshold
    </p>
    """


def _generate_visual_grid(tp: int, fp: int, tn: int, fn: int) -> str:
    """Generate visual 2x2 confusion matrix grid."""
    total = tp + fp + tn + fn

    def pct(val: int) -> str:
        return f"{val/total:.0%}" if total > 0 else "0%"

    return f"""
    <div style="display: grid; grid-template-columns: auto 1fr 1fr; gap: 4px;
                max-width: 500px; margin: 20px auto;">
        <div></div>
        <div style="text-align: center; font-weight: 600; color: var(--muted); padding: 8px;">
            Actual Fraud
        </div>
        <div style="text-align: center; font-weight: 600; color: var(--muted); padding: 8px;">
            Actual Legit
        </div>

        <div style="font-weight: 600; color: var(--muted); padding: 16px;
                    writing-mode: vertical-lr; text-orientation: mixed; transform: rotate(180deg);">
            Predicted Fraud
        </div>
        <div style="background: var(--ok); color: #fff; padding: 20px;
                    border-radius: 8px 0 0 0; text-align: center;">
            <div style="font-size: 1.5rem; font-weight: bold;">TP: {tp}</div>
            <div style="font-size: 0.85rem;">{pct(tp)}</div>
            <div style="font-size: 0.75rem; opacity: 0.8;">Correctly Flagged</div>
        </div>
        <div style="background: var(--warning); color: #000; padding: 20px;
                    border-radius: 0 8px 0 0; text-align: center;">
            <div style="font-size: 1.5rem; font-weight: bold;">FP: {fp}</div>
            <div style="font-size: 0.85rem;">{pct(fp)}</div>
            <div style="font-size: 0.75rem; opacity: 0.8;">False Alarm</div>
        </div>

        <div style="font-weight: 600; color: var(--muted); padding: 16px;
                    writing-mode: vertical-lr; text-orientation: mixed; transform: rotate(180deg);">
            Predicted Legit
        </div>
        <div style="background: var(--danger); color: #fff; padding: 20px;
                    border-radius: 0 0 0 8px; text-align: center;">
            <div style="font-size: 1.5rem; font-weight: bold;">FN: {fn}</div>
            <div style="font-size: 0.85rem;">{pct(fn)}</div>
            <div style="font-size: 0.75rem; opacity: 0.8;">Missed Fraud</div>
        </div>
        <div style="background: var(--ok); color: #fff; padding: 20px;
                    border-radius: 0 0 8px 0; text-align: center;">
            <div style="font-size: 1.5rem; font-weight: bold;">TN: {tn}</div>
            <div style="font-size: 0.85rem;">{pct(tn)}</div>
            <div style="font-size: 0.75rem; opacity: 0.8;">Correctly Cleared</div>
        </div>
    </div>
    """


def _generate_classification_table(
    tp: int, fp: int, tn: int, fn: int, excluded: int
) -> str:
    """Generate classification counts table."""
    total = tp + fp + tn + fn

    def pct(val: int) -> str:
        return f"{val/total:.1%}" if total > 0 else "0%"

    return f"""
    <div style="margin: 16px 0;">
        <table style="width: 100%; border-collapse: collapse;">
            <thead>
                <tr style="border-bottom: 2px solid var(--border);">
                    <th style="text-align: left; padding: 12px 8px;">Classification</th>
                    <th style="text-align: right; padding: 12px 8px;">Count</th>
                    <th style="text-align: right; padding: 12px 8px;">Rate</th>
                </tr>
            </thead>
            <tbody>
                <tr style="border-bottom: 1px solid var(--border);">
                    <td style="padding: 10px 8px;">
                        <strong>True Positives (TP)</strong><br>
                        <span style="color: var(--muted); font-size: 12px;">Correctly Flagged as Fraud</span>
                    </td>
                    <td style="text-align: right; padding: 10px 8px; font-weight: 600; color: var(--ok);">{tp}</td>
                    <td style="text-align: right; padding: 10px 8px;">{pct(tp)}</td>
                </tr>
                <tr style="border-bottom: 1px solid var(--border);">
                    <td style="padding: 10px 8px;">
                        <strong>False Positives (FP)</strong><br>
                        <span style="color: var(--muted); font-size: 12px;">False Alarm (Not Actually Fraud)</span>
                    </td>
                    <td style="text-align: right; padding: 10px 8px; font-weight: 600; color: var(--warning);">{fp}</td>
                    <td style="text-align: right; padding: 10px 8px;">{pct(fp)}</td>
                </tr>
                <tr style="border-bottom: 1px solid var(--border);">
                    <td style="padding: 10px 8px;">
                        <strong>True Negatives (TN)</strong><br>
                        <span style="color: var(--muted); font-size: 12px;">Correctly Cleared</span>
                    </td>
                    <td style="text-align: right; padding: 10px 8px; font-weight: 600; color: var(--ok);">{tn}</td>
                    <td style="text-align: right; padding: 10px 8px;">{pct(tn)}</td>
                </tr>
                <tr style="border-bottom: 1px solid var(--border);">
                    <td style="padding: 10px 8px;">
                        <strong>False Negatives (FN)</strong><br>
                        <span style="color: var(--muted); font-size: 12px;">Missed Fraud</span>
                    </td>
                    <td style="text-align: right; padding: 10px 8px; font-weight: 600; color: var(--danger);">{fn}</td>
                    <td style="text-align: right; padding: 10px 8px;">{pct(fn)}</td>
                </tr>
                <tr style="border-bottom: 2px solid var(--border);">
                    <td style="padding: 10px 8px;">
                        <strong>Excluded</strong><br>
                        <span style="color: var(--muted); font-size: 12px;">Missing predicted_risk</span>
                    </td>
                    <td style="text-align: right; padding: 10px 8px;">{excluded}</td>
                    <td style="text-align: right; padding: 10px 8px; color: var(--muted);">-</td>
                </tr>
                <tr style="background: var(--panel-glass); border-top: 2px solid var(--border);">
                    <td style="padding: 10px 8px;"><strong>Total</strong></td>
                    <td style="text-align: right; padding: 10px 8px; font-weight: 600;">{total}</td>
                    <td style="text-align: right; padding: 10px 8px;">100%</td>
                </tr>
            </tbody>
        </table>
    </div>
    """


def _generate_metrics_cards(
    precision: float, recall: float, f1_score: float, accuracy: float
) -> str:
    """Generate performance metrics cards."""

    def fmt(val: float) -> str:
        return f"{val:.1%}" if val is not None else "N/A"

    return f"""
    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-top: 16px;">
        <div style="background: var(--panel-glass); padding: 16px; border-radius: 8px; text-align: center;">
            <div style="color: var(--accent); font-size: 1.5rem; font-weight: bold;">{fmt(precision)}</div>
            <div style="color: var(--muted); font-size: 0.8rem;">Precision</div>
            <div style="color: var(--muted); font-size: 0.7rem; margin-top: 4px;">TP / (TP + FP)</div>
        </div>
        <div style="background: var(--panel-glass); padding: 16px; border-radius: 8px; text-align: center;">
            <div style="color: var(--accent); font-size: 1.5rem; font-weight: bold;">{fmt(recall)}</div>
            <div style="color: var(--muted); font-size: 0.8rem;">Recall</div>
            <div style="color: var(--muted); font-size: 0.7rem; margin-top: 4px;">TP / (TP + FN)</div>
        </div>
        <div style="background: var(--panel-glass); padding: 16px; border-radius: 8px; text-align: center;">
            <div style="color: var(--accent); font-size: 1.5rem; font-weight: bold;">{fmt(f1_score)}</div>
            <div style="color: var(--muted); font-size: 0.8rem;">F1 Score</div>
            <div style="color: var(--muted); font-size: 0.7rem; margin-top: 4px;">Harmonic Mean</div>
        </div>
        <div style="background: var(--panel-glass); padding: 16px; border-radius: 8px; text-align: center;">
            <div style="color: var(--accent); font-size: 1.5rem; font-weight: bold;">{fmt(accuracy)}</div>
            <div style="color: var(--muted); font-size: 0.8rem;">Accuracy</div>
            <div style="color: var(--muted); font-size: 0.7rem; margin-top: 4px;">(TP + TN) / Total</div>
        </div>
    </div>
    """


def _generate_entity_breakdown(entity_matrices: List[Any], entity_count: int) -> str:
    """Generate per-entity breakdown table."""

    def fmt_pct(val: float) -> str:
        return f"{val:.1%}" if val is not None else "N/A"

    rows = []
    for matrix in entity_matrices:
        entity_id = getattr(matrix, "entity_id", str(matrix.get("entity_id", "?")))
        rows.append(f"""
            <tr>
                <td><code>{entity_id[:50]}{'...' if len(entity_id) > 50 else ''}</code></td>
                <td>{matrix.TP if hasattr(matrix, 'TP') else matrix.get('TP', 0)}</td>
                <td>{matrix.FP if hasattr(matrix, 'FP') else matrix.get('FP', 0)}</td>
                <td>{matrix.TN if hasattr(matrix, 'TN') else matrix.get('TN', 0)}</td>
                <td>{matrix.FN if hasattr(matrix, 'FN') else matrix.get('FN', 0)}</td>
                <td>{fmt_pct(matrix.precision if hasattr(matrix, 'precision') else matrix.get('precision', 0))}</td>
            </tr>
        """)

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
                        <th style="text-align: right; padding: 8px;">Precision</th>
                    </tr>
                </thead>
                <tbody>
                    {''.join(rows)}
                </tbody>
            </table>
        </div>
    </details>
    """
