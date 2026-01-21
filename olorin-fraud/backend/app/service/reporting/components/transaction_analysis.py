"""
Transaction Analysis Component (formerly Confusion Matrix).

Generates HTML for transaction classification metrics showing
TP, FP, FN, TN with precision, recall, F1 score, and optional ROI.

Feature: unified-report-hierarchy
"""

from typing import Optional


def generate_transaction_analysis_section(
    tp: int,
    fp: int,
    fn: int,
    tn: int,
    title: str = "Transaction Analysis",
    subtitle: str = "Classification Results",
    precision: Optional[str] = None,
    recall: Optional[str] = None,
    f1_score: Optional[str] = None,
    roi: Optional[str] = None,
    drill_down_url: Optional[str] = None,
) -> str:
    """
    Generate HTML for transaction analysis section.

    Args:
        tp: True positives (fraud caught)
        fp: False positives (false alarms)
        fn: False negatives (fraud missed)
        tn: True negatives (legitimate confirmed)
        title: Section title
        subtitle: Section subtitle
        precision: Formatted precision percentage
        recall: Formatted recall percentage
        f1_score: Formatted F1 score percentage
        roi: Formatted ROI percentage (optional)
        drill_down_url: URL for drill-down link (optional)

    Returns:
        HTML string for transaction analysis section
    """
    # Calculate metrics if not provided
    if precision is None:
        precision = _calculate_precision(tp, fp)
    if recall is None:
        recall = _calculate_recall(tp, fn)
    if f1_score is None:
        f1_score = _calculate_f1(precision, recall)

    matrix_html = _generate_matrix_grid(tp, fp, fn, tn)
    metrics_html = _generate_metrics_pills(precision, recall, f1_score, roi)
    drill_link = _generate_drill_link(drill_down_url) if drill_down_url else ""

    return f"""
    <div class="transaction-analysis">
        <h2 style="margin-bottom: 10px; color: var(--accent);">
            📊 {title} ({subtitle})
        </h2>
        {matrix_html}
        {metrics_html}
        {drill_link}
    </div>
    """


def generate_compact_transaction_analysis(
    tp: int,
    fp: int,
    fn: int,
    tn: int,
    title: str = "Transaction Analysis",
) -> str:
    """
    Generate compact transaction analysis for card views.

    Args:
        tp: True positives
        fp: False positives
        fn: False negatives
        tn: True negatives
        title: Section title

    Returns:
        Compact HTML for embedding in cards
    """
    return f"""
    <div class="ta-compact">
        <h4 style="color: var(--accent); margin-bottom: 10px; font-size: 0.9rem;">
            {title}
        </h4>
        <div class="ta-grid" style="max-width: 280px; gap: 6px;">
            <div class="ta-cell ta-tp" style="padding: 8px; font-size: 0.85rem;">
                TP: {tp}<br><small>Caught</small>
            </div>
            <div class="ta-cell ta-fp" style="padding: 8px; font-size: 0.85rem;">
                FP: {fp}<br><small>Alarms</small>
            </div>
            <div class="ta-cell ta-fn" style="padding: 8px; font-size: 0.85rem;">
                FN: {fn}<br><small>Missed</small>
            </div>
            <div class="ta-cell ta-tn" style="padding: 8px; font-size: 0.85rem;">
                TN: {tn}<br><small>Legit</small>
            </div>
        </div>
    </div>
    """


def _generate_matrix_grid(tp: int, fp: int, fn: int, tn: int) -> str:
    """Generate the 2x2 classification matrix grid."""
    return f"""
    <div class="ta-grid">
        <div class="ta-cell ta-tp">
            TP: {tp}<br><small>Fraud Caught</small>
        </div>
        <div class="ta-cell ta-fp">
            FP: {fp}<br><small>False Alarms</small>
        </div>
        <div class="ta-cell ta-fn">
            FN: {fn}<br><small>Fraud Missed</small>
        </div>
        <div class="ta-cell ta-tn">
            TN: {tn}<br><small>Legit Confirmed</small>
        </div>
    </div>
    """


def _generate_metrics_pills(
    precision: str,
    recall: str,
    f1_score: str,
    roi: Optional[str] = None,
) -> str:
    """Generate metrics pills row."""
    roi_pill = f'<div class="metric-pill"><strong>ROI:</strong> {roi}</div>' if roi else ""

    return f"""
    <div class="metrics-row">
        <div class="metric-pill"><strong>Precision:</strong> {precision}</div>
        <div class="metric-pill"><strong>Recall:</strong> {recall}</div>
        <div class="metric-pill"><strong>F1 Score:</strong> {f1_score}</div>
        {roi_pill}
    </div>
    """


def _generate_drill_link(url: str) -> str:
    """Generate drill-down link."""
    return f"""
    <div style="text-align: center; margin-top: 15px;">
        <a href="{url}" class="drill-down-link">
            View Detailed Analysis →
        </a>
    </div>
    """


def _calculate_precision(tp: int, fp: int) -> str:
    """Calculate precision percentage."""
    if tp + fp == 0:
        return "N/A"
    precision = tp / (tp + fp)
    return f"{precision * 100:.2f}%"


def _calculate_recall(tp: int, fn: int) -> str:
    """Calculate recall percentage."""
    if tp + fn == 0:
        return "N/A"
    recall = tp / (tp + fn)
    return f"{recall * 100:.2f}%"


def _calculate_f1(precision_str: str, recall_str: str) -> str:
    """Calculate F1 score from precision and recall strings."""
    try:
        if precision_str == "N/A" or recall_str == "N/A":
            return "N/A"
        precision = float(precision_str.rstrip("%")) / 100
        recall = float(recall_str.rstrip("%")) / 100
        if precision + recall == 0:
            return "N/A"
        f1 = 2 * (precision * recall) / (precision + recall)
        return f"{f1 * 100:.2f}%"
    except (ValueError, ZeroDivisionError):
        return "N/A"


# Backwards compatibility aliases
def generate_confusion_section(
    title: str,
    subtitle: str,
    tp: int,
    fp: int,
    fn: int,
    tn: int,
    precision: str,
    recall: str,
    f1: str,
    roi: Optional[str] = None,
) -> str:
    """
    Legacy wrapper for confusion matrix generation.

    @deprecated Use generate_transaction_analysis_section instead
    """
    return generate_transaction_analysis_section(
        tp=tp,
        fp=fp,
        fn=fn,
        tn=tn,
        title=title,
        subtitle=subtitle,
        precision=precision,
        recall=recall,
        f1_score=f1,
        roi=roi,
    )
