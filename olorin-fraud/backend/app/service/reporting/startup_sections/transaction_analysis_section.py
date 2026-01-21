"""Transaction Analysis Section for Startup Reports."""

import logging
from typing import Any, Dict

from .transaction_analysis_helpers import (
    generate_classification_table,
    generate_entity_breakdown,
    generate_metrics_cards,
    generate_metrics_table,
)

logger = logging.getLogger(__name__)


def generate_transaction_analysis_section(data: Dict[str, Any]) -> str:
    """Generate transaction analysis section with dual-table layout."""
    confusion_data = data.get("confusion_matrix", {})
    aggregated_matrix = confusion_data.get("aggregated")

    logger.debug(f"[TRANSACTION_ANALYSIS] confusion_data: {confusion_data}")
    logger.debug(f"[TRANSACTION_ANALYSIS] aggregated_matrix type: {type(aggregated_matrix)}")

    if not aggregated_matrix:
        if hasattr(confusion_data.get("aggregated"), "total_TP"):
            aggregated_matrix = confusion_data.get("aggregated")
        else:
            return _generate_no_data_section()

    # Extract Review Precision metrics (flagged transactions only)
    review_metrics = _extract_review_metrics(aggregated_matrix)
    overall_metrics = _extract_overall_metrics(aggregated_matrix)
    metadata = _extract_metadata(aggregated_matrix)

    overall_total = sum([overall_metrics["tp"], overall_metrics["fp"],
                         overall_metrics["tn"], overall_metrics["fn"]])
    if overall_total == 0:
        return _generate_empty_section(metadata)

    # Build section parts
    header = _generate_header(metadata["entity_count"])
    methodology_note = _generate_methodology_note()

    review_table = generate_classification_table(
        tp=review_metrics["tp"], fp=review_metrics["fp"],
        tn=review_metrics["tn"], fn=review_metrics["fn"],
        excluded=review_metrics["excluded"],
        title="Review Precision (Flagged Transactions Only)",
        subtitle="Metrics for transactions from entities flagged as potentially fraudulent (risk score >= threshold).",
    )

    metrics_table = generate_metrics_table(
        review_metrics["precision"], review_metrics["recall"],
        review_metrics["f1"], review_metrics["accuracy"],
    )

    overall_table = generate_classification_table(
        tp=overall_metrics["tp"], fp=overall_metrics["fp"],
        tn=overall_metrics["tn"], fn=overall_metrics["fn"],
        title="<span style='margin-top: 24px;'>Overall Classification (All Transactions)</span>",
        subtitle="Classification metrics across ALL transactions, including those from entities below threshold.",
    )

    overall_cards = generate_metrics_cards(
        overall_metrics["precision"], overall_metrics["recall"],
        overall_metrics["f1"], overall_metrics["accuracy"],
    )

    footer = _generate_footer(metadata)
    entity_breakdown = ""
    if aggregated_matrix.entity_matrices:
        entity_breakdown = generate_entity_breakdown(
            aggregated_matrix.entity_matrices, metadata["entity_count"]
        )

    return f"""
    <div class="panel">
      {header}
      {methodology_note}
      {review_table}
      {metrics_table}
      {overall_table}
      {overall_cards}
      {footer}
      {entity_breakdown}
    </div>
    """


def _extract_review_metrics(matrix: Any) -> Dict[str, Any]:
    """Extract review precision metrics from aggregated matrix."""
    return {
        "tp": matrix.total_TP, "fp": matrix.total_FP,
        "tn": matrix.total_TN, "fn": matrix.total_FN,
        "excluded": matrix.total_excluded,
        "precision": matrix.aggregated_precision,
        "recall": matrix.aggregated_recall,
        "f1": matrix.aggregated_f1_score,
        "accuracy": matrix.aggregated_accuracy,
    }


def _extract_overall_metrics(matrix: Any) -> Dict[str, Any]:
    """Extract overall classification metrics from aggregated matrix."""
    return {
        "tp": matrix.overall_total_TP, "fp": matrix.overall_total_FP,
        "tn": matrix.overall_total_TN, "fn": matrix.overall_total_FN,
        "precision": matrix.overall_aggregated_precision,
        "recall": matrix.overall_aggregated_recall,
        "f1": matrix.overall_aggregated_f1_score,
        "accuracy": matrix.overall_aggregated_accuracy,
    }


def _extract_metadata(matrix: Any) -> Dict[str, Any]:
    """Extract metadata from aggregated matrix."""
    timestamp = "N/A"
    if hasattr(matrix.calculation_timestamp, "strftime"):
        timestamp = matrix.calculation_timestamp.strftime("%Y-%m-%d %H:%M:%S UTC")
    return {
        "risk_threshold": matrix.risk_threshold,
        "entity_count": matrix.entity_count,
        "timestamp": timestamp,
    }


def _generate_header(entity_count: int) -> str:
    """Generate section header."""
    return f"""
    <h2>Transaction Analysis (Investigation Window)</h2>
    <p style="color: var(--muted); margin-bottom: 8px;">
      Aggregated confusion matrix metrics across {entity_count} investigated entities.
      Only APPROVED transactions (NSURE_LAST_DECISION = 'APPROVED') are included.
    </p>
    """


def _generate_methodology_note() -> str:
    """Generate methodology note about investigation vs GMV window."""
    return """
    <p style="padding: 10px; background: rgba(74, 158, 255, 0.1); border-radius: 6px;
              font-size: 12px; color: var(--accent); margin-bottom: 16px;
              border-left: 3px solid var(--accent);">
      <strong>Note:</strong> These metrics measure fraud detection accuracy during the
      <em>Investigation Period</em> only. The Financial Analysis section uses a separate
      <em>GMV Window</em> to measure future fraud prevented.
    </p>
    """


def _generate_footer(metadata: Dict[str, Any]) -> str:
    """Generate section footer with metadata."""
    return f"""
    <p style="color: var(--muted); font-size: 13px; margin-top: 16px;">
      <strong>Risk Threshold:</strong> {metadata['risk_threshold']:.1%} |
      <strong>Entities Analyzed:</strong> {metadata['entity_count']} |
      <strong>Calculation Time:</strong> {metadata['timestamp']}
    </p>
    """


def _generate_no_data_section() -> str:
    """Generate section when no aggregated matrix available."""
    return """
    <div class="panel">
      <h2>Transaction Analysis Metrics</h2>
      <p style="color: var(--muted);">No classification data available.</p>
      <p style="color: var(--muted); font-size: 13px; margin-top: 8px;">
        <strong>Debug Info:</strong> aggregated_confusion_matrix is None. This may indicate:
        <ul style="margin: 8px 0 0 20px; color: var(--muted);">
          <li>No transactions were found for the investigated entities</li>
          <li>All transactions had missing predicted_risk values</li>
          <li>Investigation risk scores were not available</li>
        </ul>
      </p>
    </div>
    """


def _generate_empty_section(metadata: Dict[str, Any]) -> str:
    """Generate section when no transactions matched criteria."""
    return f"""
    <div class="panel">
      <h2>Transaction Analysis Metrics</h2>
      <p style="color: var(--muted);">No transactions matched the criteria for analysis.</p>
      <p style="color: var(--muted); font-size: 13px; margin-top: 8px;">
        <strong>Risk Threshold:</strong> {metadata['risk_threshold']:.1%} |
        <strong>Entities Analyzed:</strong> {metadata['entity_count']}
      </p>
    </div>
    """
