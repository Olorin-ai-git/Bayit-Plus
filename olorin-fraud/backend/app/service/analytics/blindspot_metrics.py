"""
Blindspot Metrics Calculator.

Calculates classification metrics and aggregations for blindspot analysis.

Feature: blindspot-analysis
"""

from typing import Any, Dict, List


def calculate_cell_metrics(tp: int, fp: int, fn: int, tn: int, total: int) -> tuple:
    """Calculate classification metrics for a single cell."""
    actual_fraud = tp + fn
    fn_rate = fn / actual_fraud if actual_fraud > 0 else 0

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


def calculate_summary(cells: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Calculate overall summary statistics."""
    if not cells:
        return {}

    total_tx = sum(c["total_transactions"] for c in cells)
    total_tp = sum(c["tp"] for c in cells)
    total_fp = sum(c["fp"] for c in cells)
    total_fn = sum(c["fn"] for c in cells)
    total_fraud_gmv = sum(c["fraud_gmv"] for c in cells)
    total_fp_gmv = sum(c.get("fp_gmv", 0) for c in cells)

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
        "total_fp_gmv": round(total_fp_gmv, 2),
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


def aggregate_gmv_by_score_bin(
    cells: List[Dict[str, Any]], score_bins: List[float]
) -> List[Dict[str, Any]]:
    """
    Aggregate GMV by score bin across all GMV ranges for bar chart display.

    Args:
        cells: Processed cell data with GMV breakdowns
        score_bins: Sorted list of score bin values

    Returns:
        List of aggregated GMV data per score bin
    """
    aggregated = {}
    for score_bin in score_bins:
        aggregated[score_bin] = {
            "score_bin": score_bin,
            "score_bin_label": f"{score_bin:.2f}",
            "tp_gmv": 0.0,
            "fp_gmv": 0.0,
            "fn_gmv": 0.0,
            "tn_gmv": 0.0,
            "nsure_tp_gmv": 0.0,
            "nsure_fp_gmv": 0.0,
            "nsure_fn_gmv": 0.0,
            "nsure_tn_gmv": 0.0,
            "total_gmv": 0.0,
        }

    for cell in cells:
        score_bin = cell["score_bin"]
        if score_bin in aggregated:
            aggregated[score_bin]["tp_gmv"] += cell.get("tp_gmv", 0)
            aggregated[score_bin]["fp_gmv"] += cell.get("fp_gmv", 0)
            aggregated[score_bin]["fn_gmv"] += cell.get("fn_gmv", 0)
            aggregated[score_bin]["tn_gmv"] += cell.get("tn_gmv", 0)
            aggregated[score_bin]["nsure_tp_gmv"] += cell.get("nsure_tp_gmv", 0)
            aggregated[score_bin]["nsure_fp_gmv"] += cell.get("nsure_fp_gmv", 0)
            aggregated[score_bin]["nsure_fn_gmv"] += cell.get("nsure_fn_gmv", 0)
            aggregated[score_bin]["nsure_tn_gmv"] += cell.get("nsure_tn_gmv", 0)

    for score_bin in aggregated:
        agg = aggregated[score_bin]
        agg["total_gmv"] = agg["tp_gmv"] + agg["fp_gmv"] + agg["fn_gmv"] + agg["tn_gmv"]
        for key in ["tp_gmv", "fp_gmv", "fn_gmv", "tn_gmv",
                    "nsure_tp_gmv", "nsure_fp_gmv", "nsure_fn_gmv", "nsure_tn_gmv", "total_gmv"]:
            agg[key] = round(agg[key], 2)

    return [aggregated[sb] for sb in score_bins]
