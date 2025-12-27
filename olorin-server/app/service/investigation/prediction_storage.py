"""
Prediction Storage Service

Stores predictions from Snowflake investigations to Postgres for confusion matrix calculation.
Implements the join strategy: TXS → PREDICTIONS → IS_FRAUD_TX.

Constitutional Compliance:
- Uses existing database provider infrastructure
- All configuration from environment variables
- No hardcoded business logic
"""

import os
from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy import func, text

from app.config.threshold_config import get_risk_threshold
from app.persistence.database import get_db_session, init_database
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


def store_predictions(
    transactions: List[Dict[str, Any]],
    investigation_id: Optional[str] = None,
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    predicted_risk: Optional[float] = None,
    window_start: Optional[datetime] = None,
    window_end: Optional[datetime] = None,
    model_version: Optional[str] = None,
    risk_threshold: Optional[float] = None,
) -> int:
    """
    Store predictions from Snowflake transactions to Postgres PREDICTIONS table.

    Args:
        transactions: List of transaction dictionaries from Snowflake
        investigation_id: Investigation ID that generated these predictions
        entity_type: Entity type (email, ip, etc.)
        entity_id: Entity identifier
        predicted_risk: Risk score to use for all transactions (if None, uses per-transaction scores)
        window_start: Window start time
        window_end: Window end time
        model_version: Model version identifier (defaults to investigation_id)
        risk_threshold: Risk threshold for predicted_label (defaults to RISK_THRESHOLD_DEFAULT)

    Returns:
        Number of predictions stored
    """
    if not transactions:
        logger.warning("No transactions provided for prediction storage")
        return 0

    # Get unified risk threshold
    if risk_threshold is None:
        risk_threshold = get_risk_threshold()

    if model_version is None:
        model_version = investigation_id or "unknown"

    stored_count = 0

    try:
        # PostgreSQL only (SQLite support removed)
        updated_at_expr = "NOW()"

        with get_db_session() as db:

            # Prepare insert query with ON CONFLICT handling
            insert_query_text = f"""
                INSERT INTO predictions (
                    transaction_id, predicted_risk, predicted_label, model_version,
                    investigation_id, entity_type, entity_id, merchant_id,
                    window_start, window_end, risk_threshold
                ) VALUES (
                    :transaction_id, :predicted_risk, :predicted_label, :model_version,
                    :investigation_id, :entity_type, :entity_id, :merchant_id,
                    :window_start, :window_end, :risk_threshold
                )
                ON CONFLICT (transaction_id) DO UPDATE SET
                    predicted_risk = EXCLUDED.predicted_risk,
                    predicted_label = EXCLUDED.predicted_label,
                    model_version = EXCLUDED.model_version,
                    investigation_id = EXCLUDED.investigation_id,
                    entity_type = EXCLUDED.entity_type,
                    entity_id = EXCLUDED.entity_id,
                    merchant_id = EXCLUDED.merchant_id,
                    window_start = EXCLUDED.window_start,
                    window_end = EXCLUDED.window_end,
                    risk_threshold = EXCLUDED.risk_threshold,
                    updated_at = {updated_at_expr}
            """
            insert_query = text(insert_query_text)

            for tx in transactions:
                # Extract transaction ID
                transaction_id = (
                    tx.get("TX_ID_KEY")
                    or tx.get("tx_id_key")
                    or tx.get("transaction_id")
                )
                if not transaction_id:
                    logger.debug(f"Skipping transaction without TX_ID_KEY: {tx}")
                    continue

                # Use per-transaction predicted_risk if available, otherwise use provided predicted_risk
                tx_predicted_risk = tx.get("predicted_risk") or predicted_risk
                if tx_predicted_risk is None:
                    logger.debug(
                        f"Skipping transaction {transaction_id} without predicted_risk"
                    )
                    continue

                # Compute predicted_label
                predicted_label = 1 if tx_predicted_risk >= risk_threshold else 0

                # Extract merchant_id
                merchant_id = (
                    tx.get("STORE_ID")
                    or tx.get("store_id")
                    or tx.get("MERCHANT_ID")
                    or tx.get("merchant_id")
                    or None
                )

                # Prepare parameters
                params = {
                    "transaction_id": str(transaction_id),
                    "predicted_risk": float(tx_predicted_risk),
                    "predicted_label": predicted_label,
                    "model_version": model_version,
                    "investigation_id": investigation_id,
                    "entity_type": entity_type,
                    "entity_id": entity_id,
                    "merchant_id": merchant_id,
                    "window_start": window_start,
                    "window_end": window_end,
                    "risk_threshold": risk_threshold,
                }

                # updated_at is handled by PostgreSQL NOW() function

                # Execute insert
                db.execute(insert_query, params)
                stored_count += 1

            db.commit()
            logger.info(
                f"✅ Stored {stored_count} predictions to Postgres PREDICTIONS table "
                f"(investigation_id={investigation_id}, model_version={model_version}, "
                f"risk_threshold={risk_threshold})"
            )

    except Exception as e:
        logger.error(f"❌ Failed to store predictions to Postgres: {e}", exc_info=True)
        raise

    return stored_count


def compute_confusion_matrix_with_join(
    investigation_id: Optional[str] = None,
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    window_start: Optional[datetime] = None,
    window_end: Optional[datetime] = None,
    risk_threshold: Optional[float] = None,
    by_merchant: bool = False,
) -> Dict[str, Any]:
    """
    Compute confusion matrix by joining PREDICTIONS (Postgres) to IS_FRAUD_TX (Snowflake).

    Join strategy:
    1. Read predictions from Postgres PREDICTIONS table
    2. Join to Snowflake TXS.IS_FRAUD_TX by TRANSACTION_ID
    3. Compute TP/FP/TN/FN using risk_threshold
    4. Aggregate precision/recall/F1 overall and by merchant

    Args:
        investigation_id: Filter predictions by investigation_id
        entity_type: Filter predictions by entity_type
        entity_id: Filter predictions by entity_id
        window_start: Filter predictions by window_start
        window_end: Filter predictions by window_end
        risk_threshold: Risk threshold for classification (defaults to RISK_THRESHOLD_DEFAULT)
        by_merchant: If True, also return merchant-level aggregations

    Returns:
        Dict with confusion matrix metrics:
        {
            "overall": {
                "TP": int, "FP": int, "TN": int, "FN": int,
                "precision": float, "recall": float, "f1": float, "accuracy": float
            },
            "by_merchant": {
                "merchant_id": {
                    "TP": int, "FP": int, "TN": int, "FN": int,
                    "precision": float, "recall": float, "f1": float, "accuracy": float
                }
            }
        }
    """
    if risk_threshold is None:
        risk_threshold = get_risk_threshold()

    # Step 1: Read predictions from Postgres
    predictions = []
    try:
        with get_db_session() as db:
            query = text(
                """
                SELECT 
                    transaction_id, predicted_risk, predicted_label, merchant_id,
                    investigation_id, entity_type, entity_id
                FROM predictions
                WHERE 1=1
            """
            )

            params = {}
            if investigation_id:
                query = text(str(query) + " AND investigation_id = :investigation_id")
                params["investigation_id"] = investigation_id
            if entity_type:
                query = text(str(query) + " AND entity_type = :entity_type")
                params["entity_type"] = entity_type
            if entity_id:
                query = text(str(query) + " AND entity_id = :entity_id")
                params["entity_id"] = entity_id
            if window_start:
                query = text(str(query) + " AND window_start >= :window_start")
                params["window_start"] = window_start
            if window_end:
                query = text(str(query) + " AND window_end <= :window_end")
                params["window_end"] = window_end

            result = db.execute(query, params)
            predictions = [dict(row._mapping) for row in result]

            logger.info(f"📊 Retrieved {len(predictions)} predictions from Postgres")

    except Exception as e:
        logger.error(f"❌ Failed to read predictions from Postgres: {e}", exc_info=True)
        raise

    if not predictions:
        logger.warning("No predictions found for confusion matrix calculation")
        return {
            "overall": {
                "TP": 0,
                "FP": 0,
                "TN": 0,
                "FN": 0,
                "precision": 0.0,
                "recall": 0.0,
                "f1": 0.0,
                "accuracy": 0.0,
            },
            "by_merchant": {},
        }

    # Step 2: Join to Snowflake IS_FRAUD_TX using resilient label joiner
    from app.service.investigation.resilient_label_joiner import (
        join_actual_labels_resilient_async,
    )

    transaction_ids = [p["transaction_id"] for p in predictions]

    # Use resilient label joiner (handles sparse IS_FRAUD_TX with secondary sources)
    # Note: This function is async, but compute_confusion_matrix_with_join is sync
    # We'll need to handle this properly
    import asyncio

    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            # We're in an async context - need to await
            # But this function is sync, so we'll create a task
            labels_map = asyncio.run(
                join_actual_labels_resilient_async(
                    transaction_ids=transaction_ids, use_secondary_sources=True
                )
            )
        else:
            labels_map = loop.run_until_complete(
                join_actual_labels_resilient_async(
                    transaction_ids=transaction_ids, use_secondary_sources=True
                )
            )
    except RuntimeError:
        # No event loop - create one
        labels_map = asyncio.run(
            join_actual_labels_resilient_async(
                transaction_ids=transaction_ids, use_secondary_sources=True
            )
        )

    logger.info(
        f"📊 Retrieved {len([v for v in labels_map.values() if v is not None])} ground truth labels from Snowflake (with fallbacks)"
    )

    # Step 3: Compute confusion matrix using CURRENT risk_threshold (not stored labels)
    logger.info(
        f"📊 Computing confusion matrix with risk_threshold={risk_threshold} "
        f"(recalculating predicted_label from predicted_risk values)"
    )
    tp = fp = tn = fn = 0
    merchant_counts = defaultdict(lambda: {"TP": 0, "FP": 0, "TN": 0, "FN": 0})

    for pred in predictions:
        tx_id = str(pred["transaction_id"])
        # CRITICAL: Recalculate predicted_label using current risk_threshold
        # Stored predicted_label may have been computed with a different threshold
        predicted_risk = pred.get("predicted_risk", 0.0)
        predicted_label = 1 if predicted_risk >= risk_threshold else 0
        is_fraud = labels_map.get(tx_id)
        merchant_id = pred.get("merchant_id") or "unknown"

        # Skip if label is unknown
        if is_fraud is None:
            continue

        # Compute confusion matrix
        if predicted_label == 1 and is_fraud == 1:
            tp += 1
            merchant_counts[merchant_id]["TP"] += 1
        elif predicted_label == 1 and is_fraud == 0:
            fp += 1
            merchant_counts[merchant_id]["FP"] += 1
        elif predicted_label == 0 and is_fraud == 0:
            tn += 1
            merchant_counts[merchant_id]["TN"] += 1
        elif predicted_label == 0 and is_fraud == 1:
            fn += 1
            merchant_counts[merchant_id]["FN"] += 1

    # Step 4: Calculate metrics
    def calculate_metrics(tp_val, fp_val, tn_val, fn_val):
        precision = tp_val / (tp_val + fp_val) if (tp_val + fp_val) > 0 else 0.0
        recall = tp_val / (tp_val + fn_val) if (tp_val + fn_val) > 0 else 0.0
        f1 = (
            2 * (precision * recall) / (precision + recall)
            if (precision + recall) > 0
            else 0.0
        )
        accuracy = (
            (tp_val + tn_val) / (tp_val + fp_val + tn_val + fn_val)
            if (tp_val + fp_val + tn_val + fn_val) > 0
            else 0.0
        )
        return {
            "TP": tp_val,
            "FP": fp_val,
            "TN": tn_val,
            "FN": fn_val,
            "precision": precision,
            "recall": recall,
            "f1": f1,
            "accuracy": accuracy,
        }

    overall_metrics = calculate_metrics(tp, fp, tn, fn)

    result = {"overall": overall_metrics, "by_merchant": {}}

    # Step 5: Aggregate by merchant if requested
    if by_merchant:
        for merchant_id, counts in merchant_counts.items():
            result["by_merchant"][merchant_id] = calculate_metrics(
                counts["TP"], counts["FP"], counts["TN"], counts["FN"]
            )

    logger.info(
        f"✅ Confusion matrix computed: TP={tp}, FP={fp}, TN={tn}, FN={fn}, "
        f"Precision={overall_metrics['precision']:.3f}, Recall={overall_metrics['recall']:.3f}, "
        f"F1={overall_metrics['f1']:.3f}"
    )

    return result
