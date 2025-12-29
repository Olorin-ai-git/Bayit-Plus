"""
Transaction Decision Filter

Builds SQL filters for finalized authorization decisions and classifies transactions.
"""

import os
from typing import Optional

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


def build_approved_filter(
    decision_col: str, db_provider: str, use_fallback: bool = True
) -> str:
    """
    Build case-insensitive filter for finalized authorization decisions.

    By default, includes APPROVED, AUTHORIZED, and SETTLED transactions.
    Can be configured via TRANSACTION_DECISION_FILTER env var:
    - "APPROVED_ONLY" (default for risk analyzer compatibility)
    - "FINALIZED" (APPROVED OR AUTHORIZED OR SETTLED) - recommended for confusion matrix
    - "ALL" (no filter)

    Args:
        decision_col: Decision column name (NSURE_LAST_DECISION or nSure_last_decision)
        db_provider: Database provider ('snowflake' or 'postgresql')
        use_fallback: If True, use fallback logic when APPROVED returns 0

    Returns:
        SQL filter expression for transaction decisions
    """
    filter_mode = os.getenv("TRANSACTION_DECISION_FILTER", "FINALIZED").upper()

    if filter_mode == "ALL":
        return "1=1"
    elif filter_mode == "APPROVED_ONLY":
        return f"UPPER({decision_col}) = 'APPROVED'"
    else:
        # FINALIZED: Include APPROVED, AUTHORIZED, SETTLED (default for confusion matrix)
        if use_fallback:
            return f"(UPPER({decision_col}) IN ('APPROVED', 'AUTHORIZED', 'SETTLED') OR {decision_col} IS NULL)"
        else:
            return f"UPPER({decision_col}) IN ('APPROVED', 'AUTHORIZED', 'SETTLED')"


def classify_transaction_fraud(
    risk_score: Optional[float], risk_threshold: float
) -> str:
    """
    Classify transaction as 'Fraud' or 'Not Fraud' based on risk score vs threshold.

    Args:
        risk_score: Investigation risk score (from overall_risk_score or domain_findings)
        risk_threshold: Threshold for classification (RISK_THRESHOLD_DEFAULT)

    Returns:
        'Fraud' if risk_score >= risk_threshold, 'Not Fraud' otherwise
    """
    if risk_score is None:
        return "Not Fraud"

    if risk_score >= risk_threshold:
        return "Fraud"
    else:
        return "Not Fraud"
