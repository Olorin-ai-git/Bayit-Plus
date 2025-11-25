"""
Timeseries Calculation Service

Computes daily timeseries aggregates for transaction data.

Constitutional Compliance:
- Generates timeseries for all dates in window
- Handles missing data gracefully
- No hardcoded thresholds
"""

from collections import defaultdict
from datetime import datetime, timedelta
from typing import Any, Dict, List

from app.router.models.investigation_comparison_models import TimeseriesDaily


def compute_timeseries_daily(
    transactions: List[Dict[str, Any]],
    window_start: datetime,
    window_end: datetime,
    risk_threshold: float = 0.7,
) -> List[TimeseriesDaily]:
    """
    Compute daily timeseries aggregates.

    Args:
        transactions: List of transactions with event_ts, predicted_risk, actual_outcome
        window_start: Window start datetime
        window_end: Window end datetime
        risk_threshold: Risk threshold for predicted_label (default 0.7)

    Returns:
        List of TimeseriesDaily objects
    """
    # Group transactions by date
    daily_data = defaultdict(lambda: {"count": 0, "tp": 0, "fp": 0, "tn": 0, "fn": 0})

    for tx in transactions:
        event_ts = tx.get("event_ts")
        if not event_ts:
            continue

        # Parse event_ts if string
        if isinstance(event_ts, str):
            try:
                event_ts = datetime.fromisoformat(event_ts.replace("Z", "+00:00"))
            except Exception:
                continue

        # Get date string (YYYY-MM-DD)
        date_str = event_ts.date().isoformat()

        daily_data[date_str]["count"] += 1

        # Compute confusion matrix for this transaction
        predicted_risk = tx.get("predicted_risk")
        actual_outcome = tx.get("actual_outcome")

        if predicted_risk is None or actual_outcome is None:
            continue

        # Map actual_outcome
        if actual_outcome in ("FRAUD", 1, True):
            is_fraud = 1
        elif actual_outcome in ("NOT_FRAUD", 0, False):
            is_fraud = 0
        else:
            continue  # Skip unknown labels

        predicted_label = 1 if predicted_risk >= risk_threshold else 0

        if predicted_label == 1 and is_fraud == 1:
            daily_data[date_str]["tp"] += 1
        elif predicted_label == 1 and is_fraud == 0:
            daily_data[date_str]["fp"] += 1
        elif predicted_label == 0 and is_fraud == 0:
            daily_data[date_str]["tn"] += 1
        elif predicted_label == 0 and is_fraud == 1:
            daily_data[date_str]["fn"] += 1

    # Generate timeseries for all dates in window
    timeseries = []
    current_date = window_start.date()
    end_date = window_end.date()

    while current_date <= end_date:
        date_str = current_date.isoformat()
        data = daily_data.get(
            date_str, {"count": 0, "tp": 0, "fp": 0, "tn": 0, "fn": 0}
        )
        timeseries.append(
            TimeseriesDaily(
                date=date_str,
                count=data["count"],
                TP=data["tp"] if data["tp"] > 0 else None,
                FP=data["fp"] if data["fp"] > 0 else None,
                TN=data["tn"] if data["tn"] > 0 else None,
                FN=data["fn"] if data["fn"] > 0 else None,
            )
        )
        current_date += timedelta(days=1)

    return timeseries
