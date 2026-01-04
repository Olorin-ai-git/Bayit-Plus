#!/usr/bin/env python3
"""
Analyze confusion matrix classifications to understand why transactions were classified as TP/FP/TN/FN.
"""

import asyncio
import inspect
import os
import sys
from datetime import datetime
from typing import Any, Dict, List

import pytz

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.config.eval import EVAL_DEFAULTS
from app.persistence import list_investigations
from app.service.investigation.comparison_service import calculate_confusion_matrix
from app.service.investigation.investigation_transaction_mapper import (
    map_investigation_to_transactions,
)
from app.service.investigation.metrics_calculation import compute_confusion_matrix
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


def classify_transaction(
    predicted_risk: float, actual_outcome: Any, risk_threshold: float
) -> str:
    """
    Classify a transaction into TP, FP, TN, or FN.

    Returns:
        Classification string: 'TP', 'FP', 'TN', 'FN', or 'EXCLUDED'
    """
    # Map actual_outcome to is_fraud (1, 0, or None)
    if actual_outcome in ("FRAUD", 1, True):
        is_fraud = 1
    elif actual_outcome in ("NOT_FRAUD", 0, False):
        is_fraud = 0
    else:
        return "EXCLUDED"  # Unknown/pending label

    # Skip if predicted_risk is missing
    if predicted_risk is None:
        return "EXCLUDED"

    # Compute predicted_label
    predicted_label = 1 if predicted_risk >= risk_threshold else 0

    # Confusion matrix classification
    if predicted_label == 1 and is_fraud == 1:
        return "TP"
    elif predicted_label == 1 and is_fraud == 0:
        return "FP"
    elif predicted_label == 0 and is_fraud == 0:
        return "TN"
    elif predicted_label == 0 and is_fraud == 1:
        return "FN"
    else:
        return "EXCLUDED"


async def analyze_investigation_confusion_matrix(
    investigation_id: str, risk_threshold: float
):
    """Analyze confusion matrix for a specific investigation."""
    from app.persistence import get_investigation

    investigation = get_investigation(investigation_id)
    if not investigation:
        print(f"❌ Investigation {investigation_id} not found")
        return None

    # Convert to dict if needed
    if hasattr(investigation, "__dict__"):
        inv_dict = investigation.__dict__
    elif isinstance(investigation, dict):
        inv_dict = investigation
    else:
        inv_dict = {}

    entity_type = inv_dict.get("entity_type")
    entity_id = inv_dict.get("entity_id")

    # Get time window from investigation
    # Try multiple possible field names
    window_start = (
        inv_dict.get("from_date") or inv_dict.get("start_time") or inv_dict.get("start")
    )
    window_end = (
        inv_dict.get("to_date") or inv_dict.get("end_time") or inv_dict.get("end")
    )

    # Also check settings_json for time_range
    if not window_start or not window_end:
        settings_json = inv_dict.get("settings_json")
        if settings_json:
            import json

            try:
                if isinstance(settings_json, str):
                    settings = json.loads(settings_json)
                else:
                    settings = settings_json

                time_range = settings.get("time_range") or settings.get("timeRange")
                if isinstance(time_range, dict):
                    window_start = (
                        window_start
                        or time_range.get("start_time")
                        or time_range.get("from")
                        or time_range.get("start")
                    )
                    window_end = (
                        window_end
                        or time_range.get("end_time")
                        or time_range.get("to")
                        or time_range.get("end")
                    )
            except Exception as e:
                logger.debug(f"Error parsing settings_json: {e}")

    if not window_start or not window_end:
        print(
            f"⚠️ Investigation {investigation_id} has no time window (from_date/to_date)"
        )
        print(f"   Available keys: {list(inv_dict.keys())[:10]}")
        return None

    # Parse datetime strings if needed
    if isinstance(window_start, str):
        window_start = datetime.fromisoformat(window_start.replace("Z", "+00:00"))
    if isinstance(window_end, str):
        window_end = datetime.fromisoformat(window_end.replace("Z", "+00:00"))

    # Ensure timezone-aware
    utc = pytz.UTC
    if window_start.tzinfo is None:
        window_start = utc.localize(window_start)
    else:
        window_start = window_start.astimezone(utc)
    if window_end.tzinfo is None:
        window_end = utc.localize(window_end)
    else:
        window_end = window_end.astimezone(utc)

    print(f"\n{'='*85}")
    print(f"Investigation: {investigation_id}")
    print(f"Entity: {entity_type}={entity_id}")
    print(f"Window: {window_start} to {window_end}")
    print(f"Risk Threshold: {risk_threshold}")
    print(f"{'='*85}\n")

    # Map investigation to transactions
    transactions, source, investigation_risk_score = (
        await map_investigation_to_transactions(
            investigation=inv_dict,
            window_start=window_start,
            window_end=window_end,
            entity_type=entity_type,
            entity_id=entity_id,
        )
    )

    if not transactions:
        print(f"⚠️ No transactions found for investigation {investigation_id}")
        return None

    print(f"📊 Found {len(transactions)} transactions\n")

    # Analyze each transaction
    classifications = {"TP": [], "FP": [], "TN": [], "FN": [], "EXCLUDED": []}

    for tx in transactions:
        tx_id = tx.get("transaction_id") or tx.get("TRANSACTION_ID") or "unknown"
        predicted_risk = tx.get("predicted_risk")
        actual_outcome = tx.get("actual_outcome")
        predicted_label_str = tx.get("predicted_label", "Unknown")

        classification = classify_transaction(
            predicted_risk, actual_outcome, risk_threshold
        )

        tx_info = {
            "tx_id": tx_id,
            "predicted_risk": predicted_risk,
            "actual_outcome": actual_outcome,
            "predicted_label": predicted_label_str,
            "classification": classification,
        }

        classifications[classification].append(tx_info)

    # Print summary
    print(f"{'Classification':<15} {'Count':<10} {'Percentage':<15}")
    print("-" * 40)
    total_classified = sum(
        len(v) for k, v in classifications.items() if k != "EXCLUDED"
    )

    for class_type in ["TP", "FP", "TN", "FN"]:
        count = len(classifications[class_type])
        pct = (count / total_classified * 100) if total_classified > 0 else 0
        print(f"{class_type:<15} {count:<10} {pct:.1f}%")

    excluded_count = len(classifications["EXCLUDED"])
    if excluded_count > 0:
        print(f"{'EXCLUDED':<15} {excluded_count:<10} -")

    print(f"\nTotal transactions: {len(transactions)}")
    print(f"Total classified: {total_classified}")

    # Print analysis of why classifications occurred
    print(f"\n{'='*85}")
    print("CLASSIFICATION ANALYSIS")
    print(f"{'='*85}\n")

    # Analyze risk score distribution
    risk_scores = [
        tx.get("predicted_risk")
        for tx in transactions
        if tx.get("predicted_risk") is not None
    ]
    if risk_scores:
        min_risk = min(risk_scores)
        max_risk = max(risk_scores)
        avg_risk = sum(risk_scores) / len(risk_scores)
        above_threshold = sum(1 for r in risk_scores if r >= risk_threshold)
        below_threshold = sum(1 for r in risk_scores if r < risk_threshold)

        print(f"Investigation Risk Score: {investigation_risk_score:.3f}")
        print(f"Risk Threshold: {risk_threshold}")
        print(f"\nTransaction Risk Score Distribution:")
        print(f"   Min: {min_risk:.3f}")
        print(f"   Max: {max_risk:.3f}")
        print(f"   Average: {avg_risk:.3f}")
        print(
            f"   Above threshold (>= {risk_threshold}): {above_threshold} transactions"
        )
        print(
            f"   Below threshold (< {risk_threshold}): {below_threshold} transactions"
        )

    # Analyze actual outcomes
    actual_outcomes = [
        tx.get("actual_outcome")
        for tx in transactions
        if tx.get("actual_outcome") is not None
    ]
    fraud_count = sum(1 for o in actual_outcomes if o in (1, True, "FRAUD"))
    not_fraud_count = sum(1 for o in actual_outcomes if o in (0, False, "NOT_FRAUD"))

    print(f"\nActual Outcomes (IS_FRAUD_TX):")
    print(f"   Fraud (1): {fraud_count} transactions")
    print(f"   Not Fraud (0): {not_fraud_count} transactions")
    print(f"   NULL: {len(transactions) - len(actual_outcomes)} transactions")

    # Explain why we got these classifications
    print(f"\n{'='*85}")
    print("WHY THESE CLASSIFICATIONS OCCURRED")
    print(f"{'='*85}\n")

    if classifications["TP"]:
        print(f"✅ TP (True Positives): {len(classifications['TP'])} transactions")
        print(f"   → Investigation correctly identified fraud!")
        print(
            f"   → Investigation risk_score ({investigation_risk_score:.3f}) >= threshold ({risk_threshold})"
        )
        print(f"   → AND IS_FRAUD_TX = 1 (actually fraud)")
        print()

    if classifications["FP"]:
        print(f"⚠️ FP (False Positives): {len(classifications['FP'])} transactions")
        print(
            f"   → Investigation predicted fraud, but transactions were NOT actually fraud"
        )
        print(
            f"   → Investigation risk_score ({investigation_risk_score:.3f}) >= threshold ({risk_threshold})"
        )
        print(f"   → BUT IS_FRAUD_TX = 0 (not fraud)")
        print(f"   → This means the investigation was too aggressive/overly cautious")
        print(f"   → Possible reasons:")
        print(f"      - Risk threshold ({risk_threshold}) may be too low")
        print(
            f"      - Investigation identified suspicious patterns that didn't result in confirmed fraud"
        )
        print(f"      - IS_FRAUD_TX may not be updated yet for these transactions")
        print()

    if classifications["TN"]:
        print(f"✅ TN (True Negatives): {len(classifications['TN'])} transactions")
        print(f"   → Investigation correctly identified non-fraud!")
        print(
            f"   → Investigation risk_score ({investigation_risk_score:.3f}) < threshold ({risk_threshold})"
        )
        print(f"   → AND IS_FRAUD_TX = 0 (not fraud)")
        print()

    if classifications["FN"]:
        print(f"❌ FN (False Negatives): {len(classifications['FN'])} transactions")
        print(f"   → Investigation missed fraud!")
        print(
            f"   → Investigation risk_score ({investigation_risk_score:.3f}) < threshold ({risk_threshold})"
        )
        print(f"   → BUT IS_FRAUD_TX = 1 (actually fraud)")
        print(f"   → This means the investigation was not sensitive enough")
        print(f"   → Possible reasons:")
        print(f"      - Risk threshold ({risk_threshold}) may be too high")
        print(f"      - Investigation didn't detect fraud indicators")
        print()

    # Print detailed breakdown for each classification
    print(f"\n{'='*85}")
    print("DETAILED BREAKDOWN")
    print(f"{'='*85}\n")

    for class_type in ["TP", "FP", "TN", "FN"]:
        if classifications[class_type]:
            print(f"\n{class_type} ({len(classifications[class_type])} transactions):")
            print(
                f"{'TX ID':<20} {'Predicted Risk':<20} {'Actual Outcome':<20} {'Predicted Label':<20} {'Reason'}"
            )
            print("-" * 100)

            for tx_info in classifications[class_type][:10]:  # Show first 10
                tx_id = tx_info["tx_id"]
                predicted_risk = tx_info["predicted_risk"]
                actual_outcome = tx_info["actual_outcome"]
                predicted_label = tx_info["predicted_label"]

                # Determine reason
                if class_type == "TP":
                    reason = f"Predicted Fraud (risk={predicted_risk:.3f} >= {risk_threshold}) AND Actually Fraud (IS_FRAUD_TX={actual_outcome})"
                elif class_type == "FP":
                    reason = f"Predicted Fraud (risk={predicted_risk:.3f} >= {risk_threshold}) BUT Actually Not Fraud (IS_FRAUD_TX={actual_outcome})"
                elif class_type == "TN":
                    reason = f"Predicted Not Fraud (risk={predicted_risk:.3f} < {risk_threshold}) AND Actually Not Fraud (IS_FRAUD_TX={actual_outcome})"
                elif class_type == "FN":
                    reason = f"Predicted Not Fraud (risk={predicted_risk:.3f} < {risk_threshold}) BUT Actually Fraud (IS_FRAUD_TX={actual_outcome})"
                else:
                    reason = "Unknown"

                print(
                    f"{str(tx_id):<20} {str(predicted_risk):<20} {str(actual_outcome):<20} {predicted_label:<20} {reason}"
                )

            if len(classifications[class_type]) > 10:
                print(
                    f"... and {len(classifications[class_type]) - 10} more {class_type} transactions"
                )

    # Show excluded transactions
    if classifications["EXCLUDED"]:
        print(f"\nEXCLUDED ({len(classifications['EXCLUDED'])} transactions):")
        print(f"{'TX ID':<20} {'Predicted Risk':<20} {'Actual Outcome':<20} {'Reason'}")
        print("-" * 80)

        for tx_info in classifications["EXCLUDED"][:5]:  # Show first 5
            tx_id = tx_info["tx_id"]
            predicted_risk = tx_info["predicted_risk"]
            actual_outcome = tx_info["actual_outcome"]

            if predicted_risk is None:
                reason = "Missing predicted_risk"
            elif actual_outcome is None:
                reason = "Missing actual_outcome (IS_FRAUD_TX is NULL)"
            else:
                reason = "Unknown exclusion reason"

            print(
                f"{str(tx_id):<20} {str(predicted_risk):<20} {str(actual_outcome):<20} {reason}"
            )

    # Calculate and verify confusion matrix (only_flagged=True to reduce FP count)
    tp, fp, tn, fn, excluded, below_threshold = compute_confusion_matrix(
        transactions, risk_threshold, only_flagged=True
    )

    print(f"\n{'='*85}")
    print("VERIFICATION - Confusion Matrix Calculation")
    print(f"{'='*85}")
    print(f"TP (True Positives):  {tp}")
    print(f"FP (False Positives): {fp}")
    print(f"TN (True Negatives):  {tn}")
    print(f"FN (False Negatives): {fn}")
    print(f"Excluded:             {excluded}")
    print(f"Total:                {tp + fp + tn + fn + excluded}")
    print(f"Expected Total:       {len(transactions)}")

    if (tp + fp + tn + fn + excluded) != len(transactions):
        print(f"⚠️ WARNING: Sum mismatch!")
    else:
        print(f"✅ Sum check passed")

    return {
        "investigation_id": investigation_id,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "investigation_risk_score": investigation_risk_score,
        "risk_threshold": risk_threshold,
        "TP": tp,
        "FP": fp,
        "TN": tn,
        "FN": fn,
        "excluded": excluded,
        "total_transactions": len(transactions),
        "classifications": classifications,
    }


async def analyze_recent_investigations(limit: int = 3):
    """Analyze confusion matrix for recent investigations."""
    investigations = list_investigations()

    # Filter completed investigations
    completed = [
        inv
        for inv in investigations
        if (
            inv.get("status") if isinstance(inv, dict) else getattr(inv, "status", None)
        )
        == "completed"
    ]

    if not completed:
        print("⚠️ No completed investigations found")
        return

    # Sort by completion time (most recent first)
    completed.sort(
        key=lambda x: (
            x.get("completion_time")
            if isinstance(x, dict)
            else getattr(x, "completion_time", None)
        )
        or "",
        reverse=True,
    )

    # Limit to most recent
    recent = completed[:limit]

    print(f"📊 Analyzing {len(recent)} recent completed investigations\n")

    # Get risk threshold from environment
    risk_threshold = float(
        os.getenv(
            "RISK_THRESHOLD_DEFAULT", EVAL_DEFAULTS.get("RISK_THRESHOLD_DEFAULT", 0.3)
        )
    )

    results = []
    for inv in recent:
        inv_id = inv.get("id") if isinstance(inv, dict) else getattr(inv, "id", None)
        if inv_id:
            result = await analyze_investigation_confusion_matrix(
                inv_id, risk_threshold
            )
            if result:
                results.append(result)

    # Print aggregated summary
    if results:
        print(f"\n{'='*85}")
        print("AGGREGATED SUMMARY ACROSS ALL INVESTIGATIONS")
        print(f"{'='*85}\n")

        total_tp = sum(r["TP"] for r in results)
        total_fp = sum(r["FP"] for r in results)
        total_tn = sum(r["TN"] for r in results)
        total_fn = sum(r["FN"] for r in results)
        total_excluded = sum(r["excluded"] for r in results)
        total_txs = sum(r["total_transactions"] for r in results)

        print(f"{'Metric':<20} {'Count':<15} {'Percentage':<15}")
        print("-" * 50)

        total_classified = total_tp + total_fp + total_tn + total_fn
        if total_classified > 0:
            print(
                f"{'TP (True Positives)':<20} {total_tp:<15} {total_tp/total_classified*100:.1f}%"
            )
            print(
                f"{'FP (False Positives)':<20} {total_fp:<15} {total_fp/total_classified*100:.1f}%"
            )
            print(
                f"{'TN (True Negatives)':<20} {total_tn:<15} {total_tn/total_classified*100:.1f}%"
            )
            print(
                f"{'FN (False Negatives)':<20} {total_fn:<15} {total_fn/total_classified*100:.1f}%"
            )

        if total_excluded > 0:
            print(f"{'EXCLUDED':<20} {total_excluded:<15} -")

        print(f"\nTotal transactions analyzed: {total_txs}")
        print(f"Total classified: {total_classified}")
        print(f"Total excluded: {total_excluded}")

        # Calculate aggregated metrics
        if (total_tp + total_fp) > 0:
            precision = total_tp / (total_tp + total_fp)
            print(f"\nPrecision: {precision:.3f} (TP / (TP + FP))")

        if (total_tp + total_fn) > 0:
            recall = total_tp / (total_tp + total_fn)
            print(f"Recall: {recall:.3f} (TP / (TP + FN))")

        if total_classified > 0:
            accuracy = (total_tp + total_tn) / total_classified
            print(f"Accuracy: {accuracy:.3f} ((TP + TN) / Total)")

        if (total_tp + total_fp) > 0 and (total_tp + total_fn) > 0:
            f1 = 2 * (precision * recall) / (precision + recall)
            print(f"F1 Score: {f1:.3f}")


async def main():
    """Main entry point."""
    print("=" * 85)
    print("Confusion Matrix Analysis")
    print("=" * 85)

    await analyze_recent_investigations(limit=3)


if __name__ == "__main__":
    asyncio.run(main())
