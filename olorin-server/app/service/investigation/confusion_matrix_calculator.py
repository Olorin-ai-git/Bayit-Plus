"""
Confusion Matrix Calculator with 14-Day Window

Implements confusion matrix calculation using:
- 14-day window ending ≥6 months before today
- Join strategy: PREDICTIONS (Postgres) → IS_FRAUD_TX (Snowflake)
- Aggregates precision/recall/F1 overall and by merchant

Constitutional Compliance:
- Uses existing database provider infrastructure
- All configuration from environment variables
- No hardcoded business logic
"""

import os
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
import pytz
from app.service.logging import get_bridge_logger
from app.service.investigation.prediction_storage import compute_confusion_matrix_with_join

logger = get_bridge_logger(__name__)


def calculate_confusion_matrix_14day(
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    investigation_id: Optional[str] = None,
    by_merchant: bool = True
) -> Dict[str, Any]:
    """
    Calculate confusion matrix using 14-day window ending ≥6 months before today.
    
    Windowing logic:
    - Pick a 14-day slice whose end is ≥6 months before "today"
    - Join to the latest ground truth available today
    
    Args:
        entity_type: Filter by entity type
        entity_id: Filter by entity ID
        investigation_id: Filter by investigation ID
        by_merchant: If True, include merchant-level aggregations
    
    Returns:
        Dict with confusion matrix metrics:
        {
            "overall": {
                "TP": int, "FP": int, "TN": int, "FN": int,
                "precision": float, "recall": float, "f1": float, "accuracy": float
            },
            "by_merchant": {
                "merchant_id": {...}
            },
            "window_info": {
                "window_start": datetime,
                "window_end": datetime,
                "window_days": 14
            }
        }
    """
    # Calculate 14-day window ending ≥6 months before today
    now = datetime.now(pytz.timezone("America/New_York"))
    
    # Get max lookback months (default: 6 months)
    max_lookback_months = int(os.getenv('ANALYTICS_MAX_LOOKBACK_MONTHS', '6'))
    max_lookback_days = max_lookback_months * 30
    
    # Window end: max_lookback_days before now
    window_end = now - timedelta(days=max_lookback_days)
    
    # Window start: 14 days before window_end
    window_duration_days = 14  # Fixed 14-day window for confusion matrix
    window_start = window_end - timedelta(days=window_duration_days)
    
    logger.info(
        f"📊 Calculating confusion matrix with 14-day window: "
        f"{window_start.date()} to {window_end.date()} "
        f"(ending {max_lookback_days} days before today)"
    )
    
    # Get risk threshold (default: 0.5, configurable)
    risk_threshold = float(os.getenv("RISK_THRESHOLD_DEFAULT", "0.5"))
    
    # Compute confusion matrix using join strategy
    result = compute_confusion_matrix_with_join(
        investigation_id=investigation_id,
        entity_type=entity_type,
        entity_id=entity_id,
        window_start=window_start,
        window_end=window_end,
        risk_threshold=risk_threshold,
        by_merchant=by_merchant
    )
    
    # Add window info
    result["window_info"] = {
        "window_start": window_start.isoformat(),
        "window_end": window_end.isoformat(),
        "window_days": window_duration_days,
        "max_lookback_days": max_lookback_days,
        "risk_threshold": risk_threshold
    }
    
    return result


def calculate_confusion_matrix_for_investigation(
    investigation_id: str,
    by_merchant: bool = True
) -> Dict[str, Any]:
    """
    Calculate confusion matrix for a specific investigation.
    
    Args:
        investigation_id: Investigation ID
        by_merchant: If True, include merchant-level aggregations
    
    Returns:
        Dict with confusion matrix metrics
    """
    return calculate_confusion_matrix_14day(
        investigation_id=investigation_id,
        by_merchant=by_merchant
    )


def calculate_confusion_matrix_for_entity(
    entity_type: str,
    entity_id: str,
    by_merchant: bool = True
) -> Dict[str, Any]:
    """
    Calculate confusion matrix for a specific entity.
    
    Args:
        entity_type: Entity type (email, ip, etc.)
        entity_id: Entity identifier
        by_merchant: If True, include merchant-level aggregations
    
    Returns:
        Dict with confusion matrix metrics
    """
    return calculate_confusion_matrix_14day(
        entity_type=entity_type,
        entity_id=entity_id,
        by_merchant=by_merchant
    )

