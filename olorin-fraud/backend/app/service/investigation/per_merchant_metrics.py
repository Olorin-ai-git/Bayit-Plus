"""
Per-Merchant Metrics Service

Computes metrics breakdown per merchant for comparison analysis.

Constitutional Compliance:
- Groups transactions by merchant_id
- Sorts by volume (descending)
- Caps at max_merchants
"""

from collections import defaultdict
from typing import Any, Dict, List

from app.router.models.investigation_comparison_models import PerMerchantMetrics

from .metrics_calculation import compute_confusion_matrix, compute_derived_metrics


def compute_per_merchant_metrics(
    transactions_a: List[Dict[str, Any]],
    transactions_b: List[Dict[str, Any]],
    risk_threshold: float,
    max_merchants: int,
) -> List[PerMerchantMetrics]:
    """
    Compute per-merchant metrics for both windows.

    Args:
        transactions_a: Window A transactions
        transactions_b: Window B transactions
        risk_threshold: Risk threshold for predicted_label
        max_merchants: Maximum number of merchants to return

    Returns:
        List of PerMerchantMetrics, sorted by volume, capped at max_merchants
    """
    # Group transactions by merchant_id
    merchants_a = defaultdict(list)
    merchants_b = defaultdict(list)

    for tx in transactions_a:
        merchant_id = tx.get("merchant_id")
        if merchant_id:
            merchants_a[merchant_id].append(tx)

    for tx in transactions_b:
        merchant_id = tx.get("merchant_id")
        if merchant_id:
            merchants_b[merchant_id].append(tx)

    # Get all unique merchants
    all_merchants = set(merchants_a.keys()) | set(merchants_b.keys())

    # Compute metrics per merchant
    merchant_metrics = []
    for merchant_id in all_merchants:
        tx_a = merchants_a.get(merchant_id, [])
        tx_b = merchants_b.get(merchant_id, [])

        # Compute metrics for Window A (only_flagged=True to reduce FP count)
        tp_a, fp_a, tn_a, fn_a, _, _ = compute_confusion_matrix(
            tx_a, risk_threshold, only_flagged=True
        )
        precision_a, recall_a, f1_a, accuracy_a, fraud_rate_a, _ = (
            compute_derived_metrics(tp_a, fp_a, tn_a, fn_a, tx_a)
        )

        # Compute metrics for Window B (only_flagged=True to reduce FP count)
        tp_b, fp_b, tn_b, fn_b, _, _ = compute_confusion_matrix(
            tx_b, risk_threshold, only_flagged=True
        )
        precision_b, recall_b, f1_b, accuracy_b, fraud_rate_b, _ = (
            compute_derived_metrics(tp_b, fp_b, tn_b, fn_b, tx_b)
        )

        # Compute deltas
        delta_dict = {
            "precision": precision_b - precision_a,
            "recall": recall_b - recall_a,
            "f1": f1_b - f1_a,
            "accuracy": accuracy_b - accuracy_a,
            "fraud_rate": fraud_rate_b - fraud_rate_a,
        }

        merchant_metrics.append(
            PerMerchantMetrics(
                merchant_id=merchant_id,
                A={
                    "total_transactions": len(tx_a),
                    "TP": tp_a,
                    "FP": fp_a,
                    "TN": tn_a,
                    "FN": fn_a,
                    "precision": precision_a,
                    "recall": recall_a,
                    "f1": f1_a,
                    "accuracy": accuracy_a,
                    "fraud_rate": fraud_rate_a,
                },
                B={
                    "total_transactions": len(tx_b),
                    "TP": tp_b,
                    "FP": fp_b,
                    "TN": tn_b,
                    "FN": fn_b,
                    "precision": precision_b,
                    "recall": recall_b,
                    "f1": f1_b,
                    "accuracy": accuracy_b,
                    "fraud_rate": fraud_rate_b,
                },
                delta=delta_dict,
            )
        )

    # Sort by total volume (Window B) descending, cap at max_merchants
    merchant_metrics.sort(key=lambda m: m.B.get("total_transactions", 0), reverse=True)

    return merchant_metrics[:max_merchants]
