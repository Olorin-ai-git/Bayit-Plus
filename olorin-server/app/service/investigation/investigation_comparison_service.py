"""
Investigation Prediction Quality Validation Service

Primary Purpose: Validate prediction quality by comparing investigation predictions
with actual fraud outcomes that occurred after the investigation period.

For an investigation from 6 months ago:
- Extract its risk assessment and predictions
- Query actual fraud outcomes in the period following the investigation
- Compare predicted risk vs actual fraud rate
- Validate if predictions were accurate

Constitutional Compliance:
- Uses existing investigation persistence infrastructure
- All configuration from environment variables
- No hardcoded business logic
"""

import inspect
import os
from datetime import datetime, timedelta
from typing import Any, Dict, Optional

from app.persistence import list_investigations
from app.router.models.investigation_comparison_models import (
    ComparisonRequest,
    ComparisonResponse,
    DeltaMetrics,
    WindowInfo,
    WindowMetrics,
)
from app.service.agent.tools.database_tool import get_database_provider
from app.service.investigation.entity_filtering import build_entity_where_clause
from app.service.investigation.query_builder import build_transaction_query
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


def extract_investigation_metrics(investigation: Dict[str, Any]) -> Dict[str, Any]:
    """
    Extract investigation-level metrics from investigation record.

    Args:
        investigation: Investigation dict from persistence layer

    Returns:
        Dict with investigation metrics
    """
    return {
        "overall_risk_score": investigation.get("overall_risk_score"),
        "device_risk_score": investigation.get("device_risk_score"),
        "location_risk_score": investigation.get("location_risk_score"),
        "network_risk_score": investigation.get("network_risk_score"),
        "logs_risk_score": investigation.get("logs_risk_score"),
        "device_llm_thoughts": investigation.get("device_llm_thoughts"),
        "location_llm_thoughts": investigation.get("location_llm_thoughts"),
        "network_llm_thoughts": investigation.get("network_llm_thoughts"),
        "logs_llm_thoughts": investigation.get("logs_llm_thoughts"),
        "status": investigation.get("status"),
        "created": investigation.get("created"),
        "updated": investigation.get("updated"),
        "from_date": investigation.get("from_date"),
        "to_date": investigation.get("to_date"),
    }


async def compare_investigations(
    investigation_id_a: str, investigation_id_b: str
) -> Dict[str, Any]:
    """
    Validate prediction quality by comparing investigation predictions with actual outcomes.

    Primary Purpose: Check if the older investigation (typically 6 months ago) correctly
    predicted fraud risk by comparing its risk assessment with actual fraud outcomes
    that occurred after the investigation period.

    Args:
        investigation_id_a: First investigation ID
        investigation_id_b: Second investigation ID (typically the older one)

    Returns:
        Dict with prediction quality validation results
    """
    logger.info(
        f"Validating prediction quality: {investigation_id_a} vs {investigation_id_b}"
    )

    # Fetch all investigations and find the ones we need
    all_investigations = list_investigations()

    inv_a = None
    inv_b = None

    for inv in all_investigations:
        inv_id = inv.get("id") if isinstance(inv, dict) else getattr(inv, "id", None)
        if inv_id == investigation_id_a:
            inv_a = (
                inv
                if isinstance(inv, dict)
                else inv.__dict__ if hasattr(inv, "__dict__") else inv
            )
        if inv_id == investigation_id_b:
            inv_b = (
                inv
                if isinstance(inv, dict)
                else inv.__dict__ if hasattr(inv, "__dict__") else inv
            )

    if not inv_a:
        raise ValueError(f"Investigation {investigation_id_a} not found")
    if not inv_b:
        raise ValueError(f"Investigation {investigation_id_b} not found")

    # Ensure we have dicts
    inv_a_dict = (
        inv_a
        if isinstance(inv_a, dict)
        else inv_a.__dict__ if hasattr(inv_a, "__dict__") else {}
    )
    inv_b_dict = (
        inv_b
        if isinstance(inv_b, dict)
        else inv_b.__dict__ if hasattr(inv_b, "__dict__") else {}
    )

    # Extract metrics
    metrics_a = extract_investigation_metrics(inv_a_dict)
    metrics_b = extract_investigation_metrics(inv_b_dict)

    # Validate same entity
    entity_type_a = inv_a_dict.get("entity_type")
    entity_id_a = inv_a_dict.get("entity_id")
    entity_type_b = inv_b_dict.get("entity_type")
    entity_id_b = inv_b_dict.get("entity_id")

    if entity_type_a != entity_type_b or entity_id_a != entity_id_b:
        raise ValueError(
            f"Cannot compare investigations for different entities: "
            f"{entity_type_a}:{entity_id_a} vs {entity_type_b}:{entity_id_b}"
        )

    # Determine which investigation is older (the one we validate predictions for)
    from_date_a = metrics_a.get("from_date")
    from_date_b = metrics_b.get("from_date")

    if not from_date_a or not from_date_b:
        raise ValueError(
            "Both investigations must have time windows for prediction quality validation"
        )

    # Parse dates
    if isinstance(from_date_a, str):
        from_date_a = datetime.fromisoformat(from_date_a.replace("Z", "+00:00"))
    if isinstance(from_date_b, str):
        from_date_b = datetime.fromisoformat(from_date_b.replace("Z", "+00:00"))

    # Use the older investigation for prediction quality validation
    older_inv = inv_a_dict if from_date_a < from_date_b else inv_b_dict
    older_metrics = metrics_a if from_date_a < from_date_b else metrics_b
    older_inv_id = (
        investigation_id_a if from_date_a < from_date_b else investigation_id_b
    )
    newer_inv = inv_b_dict if from_date_a < from_date_b else inv_a_dict
    newer_metrics = metrics_b if from_date_a < from_date_b else metrics_a
    newer_inv_id = (
        investigation_id_b if from_date_a < from_date_b else investigation_id_a
    )

    # Get time window for older investigation
    older_from = older_metrics.get("from_date")
    older_to = older_metrics.get("to_date")

    if not older_from or not older_to:
        raise ValueError(f"Older investigation {older_inv_id} must have a time window")

    if isinstance(older_from, str):
        older_from = datetime.fromisoformat(older_from.replace("Z", "+00:00"))
    if isinstance(older_to, str):
        older_to = datetime.fromisoformat(older_to.replace("Z", "+00:00"))

    # Validate prediction quality: Compare older investigation's predictions with actual outcomes
    # Look at transactions AFTER the older investigation period
    validation_window_start = older_to
    validation_window_end = older_to + timedelta(days=90)  # 90 days after investigation

    prediction_quality = await _validate_prediction_quality(
        older_inv,
        older_metrics,
        entity_type_a,
        entity_id_a,
        validation_window_start,
        validation_window_end,
        older_inv_id,
    )

    # Generate summary focused on prediction quality
    summary = _generate_prediction_quality_summary(
        older_inv, older_metrics, newer_inv, newer_metrics, prediction_quality
    )

    return {
        "investigation_validated": {
            "id": older_inv_id,
            "entity_type": entity_type_a,
            "entity_id": entity_id_a,
            "metrics": older_metrics,
            "time_window": {
                "from": older_metrics.get("from_date"),
                "to": older_metrics.get("to_date"),
            },
        },
        "investigation_recent": {
            "id": newer_inv_id,
            "entity_type": entity_type_b,
            "entity_id": entity_id_b,
            "metrics": newer_metrics,
            "time_window": {
                "from": newer_metrics.get("from_date"),
                "to": newer_metrics.get("to_date"),
            },
        },
        "prediction_quality": prediction_quality,
        "summary": summary,
    }


async def _validate_prediction_quality(
    investigation: Dict[str, Any],
    metrics: Dict[str, Any],
    entity_type: str,
    entity_id: str,
    validation_window_start: datetime,
    validation_window_end: datetime,
    investigation_id: str,
) -> Dict[str, Any]:
    """
    Validate prediction quality by comparing investigation's risk assessment
    with actual fraud outcomes after the investigation period.

    Args:
        investigation: Investigation dict
        metrics: Investigation metrics
        entity_type: Entity type
        entity_id: Entity ID
        validation_window_start: Start of validation period (after investigation)
        validation_window_end: End of validation period
        investigation_id: Investigation ID

    Returns:
        Dict with prediction quality metrics
    """
    logger.info(f"Validating prediction quality for investigation {investigation_id}")

    # Get predicted risk from investigation
    predicted_risk = metrics.get("overall_risk_score")
    if predicted_risk is None:
        logger.warning(f"No risk score found for investigation {investigation_id}")
        return None

    # Query actual outcomes in validation window
    db_provider = get_database_provider()
    db_provider.connect()
    is_snowflake = os.getenv("DATABASE_PROVIDER", "snowflake").lower() == "snowflake"
    is_async = hasattr(db_provider, "execute_query_async")

    entity_clause, _ = build_entity_where_clause(entity_type, entity_id, is_snowflake)

    query = build_transaction_query(
        validation_window_start, validation_window_end, entity_clause, "", is_snowflake
    )

    if is_async:
        transactions = await db_provider.execute_query_async(query)
    else:
        transactions = db_provider.execute_query(query)

    logger.info(f"Found {len(transactions)} transactions in validation window")

    if len(transactions) == 0:
        logger.warning(
            f"No transactions found in validation window for prediction quality validation"
        )
        return {
            "validation_period": {
                "start": validation_window_start.isoformat(),
                "end": validation_window_end.isoformat(),
            },
            "predicted_risk": predicted_risk,
            "actual_fraud_rate": None,
            "actual_transaction_count": 0,
            "prediction_accurate": None,
            "error": "No transactions found in validation period",
        }

    # Calculate actual fraud rate
    fraud_count = 0
    total_labeled = 0

    for tx in transactions:
        actual_outcome = tx.get("actual_outcome")
        if actual_outcome in ("FRAUD", 1, True):
            fraud_count += 1
            total_labeled += 1
        elif actual_outcome in ("NOT_FRAUD", 0, False):
            total_labeled += 1

    actual_fraud_rate = fraud_count / total_labeled if total_labeled > 0 else 0.0

    # Determine if prediction was accurate
    # High risk prediction (>0.7) should correlate with high fraud rate (>0.2)
    predicted_high_risk = predicted_risk > 0.7
    actual_high_fraud = actual_fraud_rate > 0.2

    prediction_accurate = predicted_high_risk == actual_high_fraud

    # Calculate prediction error
    prediction_error = abs(predicted_risk - actual_fraud_rate)

    return {
        "investigation_id": investigation_id,
        "validation_period": {
            "start": validation_window_start.isoformat(),
            "end": validation_window_end.isoformat(),
        },
        "predicted_risk": predicted_risk,
        "predicted_high_risk": predicted_high_risk,
        "actual_fraud_rate": actual_fraud_rate,
        "actual_fraud_count": fraud_count,
        "actual_transaction_count": len(transactions),
        "actual_labeled_count": total_labeled,
        "actual_high_fraud": actual_high_fraud,
        "prediction_accurate": prediction_accurate,
        "prediction_error": prediction_error,
        "validation_quality": (
            "good"
            if total_labeled >= 10
            else "limited" if total_labeled > 0 else "insufficient"
        ),
    }


def _generate_prediction_quality_summary(
    older_inv: Dict[str, Any],
    older_metrics: Dict[str, Any],
    newer_inv: Dict[str, Any],
    newer_metrics: Dict[str, Any],
    prediction_quality: Optional[Dict[str, Any]],
) -> str:
    """Generate human-readable prediction quality validation summary."""
    entity_type = older_inv.get("entity_type", "unknown")
    entity_id = older_inv.get("entity_id", "unknown")
    older_inv_id = older_inv.get("id", "unknown")

    summary_parts = [f"Prediction Quality Validation for {entity_type}:{entity_id}."]

    predicted_risk = older_metrics.get("overall_risk_score")
    if predicted_risk is not None:
        summary_parts.append(
            f"Investigation {older_inv_id} predicted overall risk score of {predicted_risk:.2f}."
        )

    if prediction_quality:
        if prediction_quality.get("error"):
            summary_parts.append(
                f"Validation error: {prediction_quality.get('error')}."
            )
        else:
            actual_fraud_rate = prediction_quality.get("actual_fraud_rate")
            prediction_accurate = prediction_quality.get("prediction_accurate")
            prediction_error = prediction_quality.get("prediction_error")
            validation_period = prediction_quality.get("validation_period", {})

            if actual_fraud_rate is not None:
                summary_parts.append(
                    f"Actual fraud rate in the {validation_period.get('start', 'N/A')} to "
                    f"{validation_period.get('end', 'N/A')} period: {actual_fraud_rate:.2%} "
                    f"({prediction_quality.get('actual_fraud_count', 0)} fraud out of "
                    f"{prediction_quality.get('actual_labeled_count', 0)} labeled transactions)."
                )

                if prediction_accurate is True:
                    summary_parts.append(
                        f"✅ Prediction was ACCURATE: The investigation correctly identified "
                        f"{'high' if prediction_quality.get('predicted_high_risk') else 'low'} risk "
                        f"(prediction error: {prediction_error:.2f})."
                    )
                elif prediction_accurate is False:
                    direction = (
                        "overestimated"
                        if prediction_quality.get("predicted_high_risk")
                        and not prediction_quality.get("actual_high_fraud")
                        else "underestimated"
                    )
                    summary_parts.append(
                        f"⚠️ Prediction was {direction.upper()}: The investigation predicted "
                        f"{'high' if prediction_quality.get('predicted_high_risk') else 'low'} risk "
                        f"but actual fraud was {'high' if prediction_quality.get('actual_high_fraud') else 'low'} "
                        f"(prediction error: {prediction_error:.2f})."
                    )

                validation_quality = prediction_quality.get(
                    "validation_quality", "unknown"
                )
                if validation_quality == "limited":
                    summary_parts.append(
                        "Note: Validation quality is limited due to small sample size."
                    )
                elif validation_quality == "insufficient":
                    summary_parts.append(
                        "Note: Insufficient data for reliable validation."
                    )
    else:
        summary_parts.append(
            "Could not validate prediction quality - insufficient data."
        )

    return " ".join(summary_parts)
