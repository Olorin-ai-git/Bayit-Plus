"""
Metrics Calculation Service

Computes confusion matrix, derived metrics, histograms, and timeseries
from transaction data. Guards against divide-by-zero.

Constitutional Compliance:
- All calculations explicit, no hardcoded thresholds
- Divide-by-zero guards return 0.0 with warnings
- Handles empty sets gracefully
"""

from collections import defaultdict
from typing import Any, Dict, List, Optional, Tuple

from app.config.eval import EVAL_DEFAULTS
from app.router.models.investigation_comparison_models import HistogramBin
from app.service.investigation.ci_utils import wilson_interval
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


def compute_confusion_matrix(
    transactions: List[Dict[str, Any]], risk_threshold: float
) -> Tuple[int, int, int, int, int]:
    """
    Compute confusion matrix from transactions.

    Args:
        transactions: List of transaction dicts with predicted_risk, actual_outcome
        risk_threshold: Threshold for predicted_label

    Returns:
        Tuple of (TP, FP, TN, FN, excluded_missing_predicted_risk)
    """
    tp = fp = tn = fn = 0
    excluded_missing_predicted_risk = 0

    for tx in transactions:
        predicted_risk = tx.get("predicted_risk")
        actual_outcome = tx.get("actual_outcome")

        # Map actual_outcome to is_fraud (1, 0, or None)
        if actual_outcome in ("FRAUD", 1, True):
            is_fraud = 1
        elif actual_outcome in ("NOT_FRAUD", 0, False):
            is_fraud = 0
        else:
            is_fraud = None  # Unknown/pending label

        # Skip if predicted_risk is missing
        if predicted_risk is None:
            excluded_missing_predicted_risk += 1
            continue

        # Skip if label is unknown (exclude from confusion matrix)
        if is_fraud is None:
            continue

        # Compute predicted_label
        predicted_label = 1 if predicted_risk >= risk_threshold else 0

        # Confusion matrix
        if predicted_label == 1 and is_fraud == 1:
            tp += 1
        elif predicted_label == 1 and is_fraud == 0:
            fp += 1
        elif predicted_label == 0 and is_fraud == 0:
            tn += 1
        elif predicted_label == 0 and is_fraud == 1:
            fn += 1

    return tp, fp, tn, fn, excluded_missing_predicted_risk


def compute_derived_metrics(
    tp: int,
    fp: int,
    tn: int,
    fn: int,
    transactions: List[Dict[str, Any]],
    ci_confidence: Optional[float] = None,
) -> Tuple[
    float,
    float,
    float,
    float,
    float,
    int,
    Dict[str, Any],
    Dict[str, Any],
    Dict[str, Any],
]:
    """
    Compute derived metrics from confusion matrix with confidence intervals and power assessment.

    Args:
        tp, fp, tn, fn: Confusion matrix values
        transactions: All transactions (for fraud_rate calculation)
        ci_confidence: Confidence level for intervals (default from config)

    Returns:
        Tuple of (precision, recall, f1, accuracy, fraud_rate, pending_label_count, ci_dict, support_dict, power_dict)
    """
    ci_confidence = ci_confidence or EVAL_DEFAULTS["ci_confidence"]

    # Precision: TP / (TP + FP)
    n_pred_pos = tp + fp
    precision = tp / n_pred_pos if n_pred_pos > 0 else 0.0
    if n_pred_pos == 0:
        logger.debug(
            "Divide-by-zero in precision calculation: TP+FP=0 (no positive predictions)"
        )

    # Recall: TP / (TP + FN)
    n_actual_fraud = tp + fn
    recall = tp / n_actual_fraud if n_actual_fraud > 0 else 0.0
    if n_actual_fraud == 0:
        logger.debug(
            "Divide-by-zero in recall calculation: TP+FN=0 (no actual fraud cases)"
        )

    # F1: 2 * (precision * recall) / (precision + recall)
    f1 = (
        2 * (precision * recall) / (precision + recall)
        if (precision + recall) > 0
        else 0.0
    )
    if (precision + recall) == 0:
        logger.debug(
            "Divide-by-zero in F1 calculation: precision+recall=0 (no valid predictions)"
        )

    # Accuracy: (TP + TN) / (TP + FP + TN + FN)
    total_known = tp + fp + tn + fn
    accuracy = (tp + tn) / total_known if total_known > 0 else 0.0
    if total_known == 0:
        logger.debug(
            "Divide-by-zero in accuracy calculation: no known labels (all transactions pending)"
        )

    # Fraud rate: mean of is_fraud (known labels only)
    fraud_sum = 0
    fraud_count = 0
    pending_label_count = 0

    for tx in transactions:
        actual_outcome = tx.get("actual_outcome")
        if actual_outcome in ("FRAUD", 1, True):
            fraud_sum += 1
            fraud_count += 1
        elif actual_outcome in ("NOT_FRAUD", 0, False):
            fraud_count += 1
        else:
            pending_label_count += 1

    fraud_rate = fraud_sum / fraud_count if fraud_count > 0 else 0.0

    # Calculate confidence intervals
    ci_precision = (
        wilson_interval(tp, n_pred_pos, ci_confidence) if n_pred_pos > 0 else None
    )
    ci_recall = (
        wilson_interval(tp, n_actual_fraud, ci_confidence)
        if n_actual_fraud > 0
        else None
    )
    ci_accuracy = (
        wilson_interval(tp + tn, total_known, ci_confidence)
        if total_known > 0
        else None
    )

    ci_dict = {"precision": ci_precision, "recall": ci_recall, "accuracy": ci_accuracy}

    # Validate CI widths and log warnings
    ci_width_threshold = 0.10  # Guardrail: warn if CI width > 10%
    for metric, ci in ci_dict.items():
        if ci and len(ci) == 2:
            width = ci[1] - ci[0]
            if width > ci_width_threshold:
                logger.warning(
                    f"⚠️ Wide confidence interval for {metric}: {width:.3f} "
                    f"(95% CI {ci[0]:.3f}–{ci[1]:.3f}). "
                    f"Results may be unreliable due to small sample size."
                )

    # Support counts
    support_dict = {
        "known_transactions": total_known,
        "predicted_positives": n_pred_pos,
        "actual_frauds": n_actual_fraud,
    }

    # Power assessment
    ms = EVAL_DEFAULTS["min_support"]
    reasons = []
    if total_known < ms["min_transactions"]:
        reasons.append(f"known_transactions<{ms['min_transactions']}")
    if n_actual_fraud < ms["min_actual_frauds"]:
        reasons.append(f"actual_frauds<{ms['min_actual_frauds']}")
    if n_pred_pos < ms["min_predicted_positives"]:
        reasons.append(f"predicted_positives<{ms['min_predicted_positives']}")

    power_dict = {
        "status": "stable" if not reasons else "low_power",
        "reasons": reasons,
    }

    return (
        precision,
        recall,
        f1,
        accuracy,
        fraud_rate,
        pending_label_count,
        ci_dict,
        support_dict,
        power_dict,
    )


def compute_histogram(
    transactions: List[Dict[str, Any]], num_bins: int = 10
) -> List[HistogramBin]:
    """
    Compute risk histogram with specified number of bins.

    Args:
        transactions: List of transactions with predicted_risk
        num_bins: Number of bins (default 10)

    Returns:
        List of HistogramBin objects
    """
    # Filter transactions with valid predicted_risk
    risks = [
        tx.get("predicted_risk")
        for tx in transactions
        if tx.get("predicted_risk") is not None
    ]

    if not risks:
        return [
            HistogramBin(bin=f"{i/num_bins:.1f}-{(i+1)/num_bins:.1f}", n=0)
            for i in range(num_bins)
        ]

    min_risk = min(risks)
    max_risk = max(risks)
    bin_width = (
        (max_risk - min_risk) / num_bins if max_risk > min_risk else 1.0 / num_bins
    )

    # Count transactions per bin
    bins = defaultdict(int)
    for risk in risks:
        bin_idx = (
            min(int((risk - min_risk) / bin_width), num_bins - 1)
            if bin_width > 0
            else 0
        )
        bins[bin_idx] += 1

    # Create HistogramBin objects
    histogram = []
    for i in range(num_bins):
        bin_start = min_risk + (i * bin_width)
        bin_end = min_risk + ((i + 1) * bin_width)
        bin_label = f"{bin_start:.1f}-{bin_end:.1f}"
        histogram.append(HistogramBin(bin=bin_label, n=bins.get(i, 0)))

    return histogram


# Timeseries calculation moved to timeseries_calculation.py
from .timeseries_calculation import compute_timeseries_daily
