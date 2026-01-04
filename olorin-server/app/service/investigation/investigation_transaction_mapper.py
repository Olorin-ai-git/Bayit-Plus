"""
Investigation Transaction Mapper

Maps Postgres investigation results to Snowflake transaction data for comparison.

This module serves as the public API, re-exporting from specialized modules:
- transaction_decision_filter: SQL filters for authorization decisions
- is_fraud_query: IS_FRAUD_TX ground truth queries
- is_fraud_diagnostics: Diagnostic queries for data quality
- investigation_loader: Investigation data fetching
- investigation_selector: Investigation selection and filtering
- transaction_mapper_core: Core mapping helpers
- transaction_query_executor: Transaction query execution
- investigation_transaction_mapper_v2: Main orchestration logic
"""

from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

# Re-export from transaction_decision_filter
from app.service.investigation.transaction_decision_filter import (
    build_approved_filter,
    classify_transaction_fraud,
)

# Re-export from is_fraud_query
from app.service.investigation.is_fraud_query import (
    query_isfraud_tx_for_transactions,
)

# Re-export from investigation_loader
from app.service.investigation.investigation_loader import (
    get_investigation_by_id,
)

# Re-export from investigation_selector
from app.service.investigation.investigation_selector import (
    get_investigations_for_time_window,
    select_best_investigation,
)

# Re-export from orchestrator
from app.service.investigation.investigation_transaction_mapper_v2 import (
    map_investigation_to_transactions,
)


# Backward compatibility alias
_build_approved_filter = build_approved_filter


async def get_transactions_for_investigation_window(
    investigation_id: str, window_start: datetime, window_end: datetime
) -> Tuple[List[Dict[str, Any]], str, Optional[float]]:
    """
    Get transactions for an investigation's time window.

    Args:
        investigation_id: Investigation ID
        window_start: Window start time
        window_end: Window end time

    Returns:
        Tuple of (transactions list, source string, predicted_risk float or None)
    """
    from app.service.logging import get_bridge_logger

    logger = get_bridge_logger(__name__)

    investigation = get_investigation_by_id(investigation_id)

    if not investigation:
        logger.error(f"Investigation {investigation_id} not found")
        return [], "fallback", None

    return await map_investigation_to_transactions(
        investigation, window_start, window_end
    )


# Export all public functions
__all__ = [
    # Transaction decision filtering
    "build_approved_filter",
    "_build_approved_filter",
    "classify_transaction_fraud",
    # IS_FRAUD_TX queries
    "query_isfraud_tx_for_transactions",
    # Investigation loading
    "get_investigation_by_id",
    # Investigation selection
    "get_investigations_for_time_window",
    "select_best_investigation",
    # Main mapping
    "map_investigation_to_transactions",
    "get_transactions_for_investigation_window",
]
