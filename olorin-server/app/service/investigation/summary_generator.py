"""
Investigation Summary Generator

Generates human-readable prose summaries (3-6 sentences) highlighting
entity scope, headline counts, key deltas, and notable patterns.

Constitutional Compliance:
- No hardcoded templates, dynamic prose generation
- Highlights significant changes and patterns
"""

from typing import Dict, Any, Optional
from app.service.logging import get_bridge_logger
from app.router.models.investigation_comparison_models import WindowMetrics, DeltaMetrics

logger = get_bridge_logger(__name__)


def generate_investigation_summary(
    entity: Optional[Dict[str, str]],
    window_a_metrics: WindowMetrics,
    window_b_metrics: WindowMetrics,
    delta: DeltaMetrics,
    window_a_label: str,
    window_b_label: str
) -> str:
    """
    Generate investigation summary prose (3-6 sentences).

    Args:
        entity: Entity filter dict with type and value
        window_a_metrics: Window A metrics
        window_b_metrics: Window B metrics
        delta: Delta metrics (B - A)
        window_a_label: Window A label
        window_b_label: Window B label

    Returns:
        Human-readable summary string (3-6 sentences)
    """
    sentences = []

    # Sentence 1: Entity scope
    if entity:
        entity_type = entity.get("type", "entity")
        entity_value = entity.get("value", "unknown")
        sentences.append(
            f"Comparison analysis for {entity_type} '{entity_value}' comparing "
            f"{window_a_label} ({window_a_metrics.total_transactions} transactions) "
            f"vs {window_b_label} ({window_b_metrics.total_transactions} transactions)."
        )
    else:
        sentences.append(
            f"Comparison analysis comparing {window_a_label} "
            f"({window_a_metrics.total_transactions} transactions) vs {window_b_label} "
            f"({window_b_metrics.total_transactions} transactions)."
        )

    # Sentence 2: Headline counts
    if window_b_metrics.total_transactions > window_a_metrics.total_transactions:
        change_pct = ((window_b_metrics.total_transactions - window_a_metrics.total_transactions) /
                     window_a_metrics.total_transactions * 100) if window_a_metrics.total_transactions > 0 else 0
        sentences.append(
            f"Transaction volume increased by {change_pct:.1f}% in {window_b_label}, "
            f"with {window_b_metrics.over_threshold} transactions exceeding risk threshold "
            f"(vs {window_a_metrics.over_threshold} in {window_a_label})."
        )
    elif window_b_metrics.total_transactions < window_a_metrics.total_transactions:
        change_pct = ((window_a_metrics.total_transactions - window_b_metrics.total_transactions) /
                     window_a_metrics.total_transactions * 100) if window_b_metrics.total_transactions > 0 else 0
        sentences.append(
            f"Transaction volume decreased by {change_pct:.1f}% in {window_b_label}, "
            f"with {window_b_metrics.over_threshold} transactions exceeding risk threshold "
            f"(vs {window_a_metrics.over_threshold} in {window_a_label})."
        )
    else:
        sentences.append(
            f"Transaction volume remained stable ({window_b_metrics.total_transactions} transactions), "
            f"with {window_b_metrics.over_threshold} transactions exceeding risk threshold "
            f"in {window_b_label}."
        )

    # Sentence 3: Key deltas
    notable_deltas = []
    if abs(delta.fraud_rate) > 0.02:  # 2 percentage points
        direction = "increased" if delta.fraud_rate > 0 else "decreased"
        notable_deltas.append(f"fraud rate {direction} by {abs(delta.fraud_rate):.1%}")
    if abs(delta.recall) > 0.05:  # 5 percentage points
        direction = "improved" if delta.recall > 0 else "declined"
        notable_deltas.append(f"recall {direction} by {abs(delta.recall):.1%}")
    if abs(delta.precision) > 0.05:
        direction = "improved" if delta.precision > 0 else "declined"
        notable_deltas.append(f"precision {direction} by {abs(delta.precision):.1%}")

    if notable_deltas:
        sentences.append(
            f"Key metric changes: {', '.join(notable_deltas)}. "
            f"Model performance shows {'improvement' if delta.f1 > 0 else 'decline'} "
            f"with F1 score {'increasing' if delta.f1 > 0 else 'decreasing'} by {abs(delta.f1):.1%}."
        )
    else:
        sentences.append(
            f"Model performance metrics remained relatively stable, with F1 score "
            f"{'slightly improving' if delta.f1 > 0 else 'slightly declining'} by {abs(delta.f1):.1%}."
        )

    # Sentence 4: Pending labels (if present)
    if window_b_metrics.pending_label_count and window_b_metrics.pending_label_count > 0:
        sentences.append(
            f"Note: {window_b_metrics.pending_label_count} transactions in {window_b_label} "
            f"have pending labels and were excluded from confusion matrix calculations."
        )

    # Sentence 5: Notable patterns (if significant)
    if window_b_metrics.fraud_rate > 0.2 and delta.fraud_rate > 0.05:
        sentences.append(
            f"High fraud rate ({window_b_metrics.fraud_rate:.1%}) with significant increase "
            f"suggests potential fraud pattern escalation requiring immediate investigation."
        )

    return " ".join(sentences)

