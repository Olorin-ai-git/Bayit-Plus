"""
Calibration Metrics Calculation

Calculates Brier score and log loss for probability calibration assessment.
Important when all predictions share one risk score (constant per window).

Constitutional Compliance:
- All calculations explicit
- Handles edge cases gracefully
- No hardcoded thresholds
"""

from math import log
from typing import Any, Dict, List, Optional

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


def calculate_brier_score(
    transactions: List[Dict[str, Any]], predicted_risk: Optional[float]
) -> Optional[float]:
    """
    Calculate Brier score (mean squared error between predicted probability and actual outcome).

    Lower is better. Perfect calibration: Brier score ≈ fraud_rate * (1 - fraud_rate).

    Args:
        transactions: List of transaction dicts with actual_outcome
        predicted_risk: Predicted risk score (constant for all transactions in window)

    Returns:
        Brier score or None if no predicted_risk or no labeled transactions
    """
    if predicted_risk is None:
        return None

    squared_errors = []
    labeled_count = 0

    for tx in transactions:
        actual_outcome = tx.get("actual_outcome")

        # Map actual_outcome to 0/1
        if actual_outcome in ("FRAUD", 1, True):
            actual = 1.0
            labeled_count += 1
        elif actual_outcome in ("NOT_FRAUD", 0, False):
            actual = 0.0
            labeled_count += 1
        else:
            continue  # Skip unknown labels

        # Brier score: (predicted - actual)^2
        error = (predicted_risk - actual) ** 2
        squared_errors.append(error)

    if labeled_count == 0:
        return None

    brier = sum(squared_errors) / labeled_count
    return brier


def calculate_log_loss(
    transactions: List[Dict[str, Any]], predicted_risk: Optional[float]
) -> Optional[float]:
    """
    Calculate log loss (cross-entropy loss).

    Penalizes overconfident wrong predictions. Lower is better.
    Perfect prediction: log_loss = 0.

    Args:
        transactions: List of transaction dicts with actual_outcome
        predicted_risk: Predicted risk score (constant for all transactions in window)

    Returns:
        Log loss or None if no predicted_risk or no labeled transactions
    """
    if predicted_risk is None:
        return None

    # Clip predicted_risk to avoid log(0) or log(1)
    epsilon = 1e-15
    clipped_pred = max(epsilon, min(1.0 - epsilon, predicted_risk))

    log_losses = []
    labeled_count = 0

    for tx in transactions:
        actual_outcome = tx.get("actual_outcome")

        # Map actual_outcome to 0/1
        if actual_outcome in ("FRAUD", 1, True):
            actual = 1.0
            labeled_count += 1
        elif actual_outcome in ("NOT_FRAUD", 0, False):
            actual = 0.0
            labeled_count += 1
        else:
            continue  # Skip unknown labels

        # Log loss: -[actual * log(predicted) + (1-actual) * log(1-predicted)]
        if actual == 1.0:
            loss = -log(clipped_pred)
        else:
            loss = -log(1.0 - clipped_pred)

        log_losses.append(loss)

    if labeled_count == 0:
        return None

    avg_log_loss = sum(log_losses) / labeled_count
    return avg_log_loss
