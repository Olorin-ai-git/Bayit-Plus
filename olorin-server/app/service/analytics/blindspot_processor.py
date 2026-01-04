"""
Blindspot Analysis Result Processor.

Processes raw query results into structured blindspot analysis format.
Calculates metrics, identifies blindspots, and generates summaries.

Feature: blindspot-analysis
"""

from datetime import datetime
from typing import Any, Dict, List

from app.service.analytics.blindspot_metrics import (
    aggregate_gmv_by_score_bin,
    calculate_cell_metrics,
    calculate_summary,
)
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
    summary = calculate_summary(cells)
    gmv_by_score = aggregate_gmv_by_score_bin(cells, score_bins)

    return {
        "status": "success",
        "training_info": training_info,
        "matrix": {
            "score_bins": score_bins,
            "gmv_bins": gmv_bins_labels,
            "cells": cells,
        },
        "gmv_by_score": gmv_by_score,
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
    fp_gmv = float(_get_value(row, "fp_gmv", "FP_GMV") or 0)
    avg_score = float(_get_value(row, "avg_score", "AVG_SCORE") or 0)

    fn_rate, fp_rate, precision, recall, f1 = calculate_cell_metrics(tp, fp, fn, tn, total)

    tp_gmv = float(_get_value(row, "tp_gmv", "TP_GMV") or 0)
    fn_gmv = float(_get_value(row, "fn_gmv", "FN_GMV") or 0)
    tn_gmv = float(_get_value(row, "tn_gmv", "TN_GMV") or 0)

    # nSure classifications (based on nSure's actual decision)
    nsure_tp = int(_get_value(row, "nsure_tp", "NSURE_TP") or 0)
    nsure_fp = int(_get_value(row, "nsure_fp", "NSURE_FP") or 0)
    nsure_fn = int(_get_value(row, "nsure_fn", "NSURE_FN") or 0)
    nsure_tn = int(_get_value(row, "nsure_tn", "NSURE_TN") or 0)
    nsure_tp_gmv = float(_get_value(row, "nsure_tp_gmv", "NSURE_TP_GMV") or 0)
    nsure_fp_gmv = float(_get_value(row, "nsure_fp_gmv", "NSURE_FP_GMV") or 0)
    nsure_fn_gmv = float(_get_value(row, "nsure_fn_gmv", "NSURE_FN_GMV") or 0)
    nsure_tn_gmv = float(_get_value(row, "nsure_tn_gmv", "NSURE_TN_GMV") or 0)

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
        "tp_gmv": tp_gmv,
        "fp_gmv": fp_gmv,
        "fn_gmv": fn_gmv,
        "tn_gmv": tn_gmv,
        "nsure_tp": nsure_tp,
        "nsure_fp": nsure_fp,
        "nsure_fn": nsure_fn,
        "nsure_tn": nsure_tn,
        "nsure_tp_gmv": nsure_tp_gmv,
        "nsure_fp_gmv": nsure_fp_gmv,
        "nsure_fn_gmv": nsure_fn_gmv,
        "nsure_tn_gmv": nsure_tn_gmv,
        "avg_score": avg_score,
    }


def _get_value(row: Dict[str, Any], key_lower: str, key_upper: str) -> Any:
    """Get value from row with case-insensitive key lookup."""
    return row.get(key_lower) or row.get(key_upper)


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
