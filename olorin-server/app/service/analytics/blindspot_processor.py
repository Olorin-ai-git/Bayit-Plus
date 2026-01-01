"""
Blindspot Analysis Result Processor.

Processes raw query results into structured blindspot analysis format.
Calculates metrics, identifies blindspots, and generates summaries.

Feature: blindspot-analysis
"""

from datetime import datetime
from typing import Any, Dict, List

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


def process_blindspot_results(
    results: List[Dict[str, Any]],
    training_info: Dict[str, Any],
    gmv_bins: List[int],
) -> Dict[str, Any]:
    """
    Process query results into structured blindspot analysis.

    Args:
        results: Raw query results from database
        training_info: Training configuration metadata
        gmv_bins: GMV bin boundaries

    Returns:
        Structured analysis dictionary
    """
    cells = []
    score_bins_set = set()
    gmv_bins_set = set()

    for row in results:
        cell = _process_cell(row)
        if cell:
            cells.append(cell)
            score_bins_set.add(cell["score_bin"])
            gmv_bins_set.add(cell["gmv_bin"])

    score_bins = sorted(score_bins_set)
    gmv_bins_labels = _build_gmv_bin_labels(gmv_bins)

    blindspots = _identify_blindspots(cells)
    summary = _calculate_summary(cells)

    return {
        "status": "success",
        "training_info": training_info,
        "matrix": {
            "score_bins": score_bins,
            "gmv_bins": gmv_bins_labels,
            "cells": cells,
        },
        "blindspots": blindspots,
        "summary": summary,
        "timestamp": datetime.now().isoformat(),
    }


def _process_cell(row: Dict[str, Any]) -> Dict[str, Any]:
    """Process a single row into a cell with calculated metrics."""
    score_bin = _get_value(row, "score_bin", "SCORE_BIN")
    gmv_bin = _get_value(row, "gmv_bin", "GMV_BIN")

    if score_bin is None or gmv_bin is None:
        return None

    tp = int(_get_value(row, "tp", "TP") or 0)
    fp = int(_get_value(row, "fp", "FP") or 0)
    fn = int(_get_value(row, "fn", "FN") or 0)
    tn = int(_get_value(row, "tn", "TN") or 0)
    total = int(_get_value(row, "total_transactions", "TOTAL_TRANSACTIONS") or 0)
    fraud_gmv = float(_get_value(row, "fraud_gmv", "FRAUD_GMV") or 0)
    avg_score = float(_get_value(row, "avg_score", "AVG_SCORE") or 0)

    fn_rate, fp_rate, precision, recall, f1 = _calculate_metrics(tp, fp, fn, tn, total)

    return {
        "score_bin": float(score_bin),
        "score_bin_label": f"{float(score_bin):.2f}-{float(score_bin) + 0.05:.2f}",
        "gmv_bin": str(gmv_bin),
        "tp": tp,
        "fp": fp,
        "fn": fn,
        "tn": tn,
        "fn_rate": fn_rate,
        "fp_rate": fp_rate,
        "precision": precision,
        "recall": recall,
        "f1": f1,
        "total_transactions": total,
        "fraud_gmv": fraud_gmv,
        "avg_score": avg_score,
    }


def _get_value(row: Dict[str, Any], key_lower: str, key_upper: str) -> Any:
    """Get value from row with case-insensitive key lookup."""
    return row.get(key_lower) or row.get(key_upper)


def _calculate_metrics(tp: int, fp: int, fn: int, tn: int, total: int) -> tuple:
    """Calculate classification metrics."""
    # Fraud miss rate: what % of actual fraud was missed (FN / actual_fraud)
    actual_fraud = tp + fn
    fn_rate = fn / actual_fraud if actual_fraud > 0 else 0

    # False alarm rate: what % of predicted fraud was wrong (FP / predicted_fraud)
    predicted_fraud = tp + fp
    fp_rate = fp / predicted_fraud if predicted_fraud > 0 else 0

    precision = tp / (tp + fp) if (tp + fp) > 0 else 0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0
    f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0

    return (
        round(fn_rate, 4),
        round(fp_rate, 4),
        round(precision, 4),
        round(recall, 4),
        round(f1, 4),
    )


def _build_gmv_bin_labels(gmv_bins: List[int]) -> List[str]:
    """Build GMV bin labels from boundaries."""
    labels = []
    for i in range(len(gmv_bins) - 1):
        labels.append(f"{gmv_bins[i]}-{gmv_bins[i + 1]}")
    labels.append(f"{gmv_bins[-1]}+")
    return labels


def _identify_blindspots(
    cells: List[Dict[str, Any]],
    fn_rate_threshold: float = 0.05,
    max_blindspots: int = 10,
) -> List[Dict[str, Any]]:
    """
    Identify cells with high FN rate as blindspots.

    Args:
        cells: Processed cell data
        fn_rate_threshold: Minimum FN rate to consider as blindspot
        max_blindspots: Maximum number of blindspots to return

    Returns:
        List of identified blindspots with recommendations
    """
    high_fn_cells = [c for c in cells if c["fn_rate"] >= fn_rate_threshold and c["fn"] > 0]
    sorted_cells = sorted(high_fn_cells, key=lambda x: x["fn_rate"], reverse=True)

    blindspots = []
    for cell in sorted_cells[:max_blindspots]:
        blindspots.append({
            "score_bin": cell["score_bin_label"],
            "gmv_bin": cell["gmv_bin"],
            "fn_count": cell["fn"],
            "fn_rate": cell["fn_rate"],
            "recommendation": _generate_recommendation(cell),
        })

    return blindspots


def _generate_recommendation(cell: Dict[str, Any]) -> str:
    """Generate actionable recommendation for a blindspot."""
    fn_rate = cell["fn_rate"]
    gmv_bin = cell["gmv_bin"]
    score_bin = cell["score_bin"]

    if fn_rate >= 0.10:
        severity = "Critical"
    elif fn_rate >= 0.05:
        severity = "High"
    else:
        severity = "Moderate"

    if score_bin < 0.3:
        focus_area = "low-score transactions"
    elif score_bin < 0.6:
        focus_area = "mid-score transactions"
    else:
        focus_area = "high-score transactions"

    return (
        f"{severity} priority: Focus Olorin analysis on {focus_area} "
        f"in GMV range ${gmv_bin}. nSure FN rate: {fn_rate*100:.1f}%"
    )


def _calculate_summary(cells: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Calculate overall summary statistics."""
    if not cells:
        return {}

    total_tx = sum(c["total_transactions"] for c in cells)
    total_tp = sum(c["tp"] for c in cells)
    total_fp = sum(c["fp"] for c in cells)
    total_fn = sum(c["fn"] for c in cells)
    total_tn = sum(c["tn"] for c in cells)
    total_fraud_gmv = sum(c["fraud_gmv"] for c in cells)

    overall_precision = total_tp / (total_tp + total_fp) if (total_tp + total_fp) > 0 else 0
    overall_recall = total_tp / (total_tp + total_fn) if (total_tp + total_fn) > 0 else 0
    overall_f1 = (
        2 * overall_precision * overall_recall / (overall_precision + overall_recall)
        if (overall_precision + overall_recall) > 0 else 0
    )

    highest_fn = sorted(cells, key=lambda x: x["fn_rate"], reverse=True)[:5]
    lowest_precision = sorted(cells, key=lambda x: x["precision"])[:5]

    return {
        "total_transactions": total_tx,
        "total_fraud": total_tp + total_fn,
        "total_fraud_gmv": round(total_fraud_gmv, 2),
        "overall_precision": round(overall_precision, 4),
        "overall_recall": round(overall_recall, 4),
        "overall_f1": round(overall_f1, 4),
        "highest_fn_cells": [
            {"score_bin": c["score_bin_label"], "gmv_bin": c["gmv_bin"], "fn_rate": c["fn_rate"]}
            for c in highest_fn
        ],
        "lowest_precision_cells": [
            {"score_bin": c["score_bin_label"], "gmv_bin": c["gmv_bin"], "precision": c["precision"]}
            for c in lowest_precision
        ],
    }
