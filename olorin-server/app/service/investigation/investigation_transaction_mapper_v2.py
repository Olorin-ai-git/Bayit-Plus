"""Investigation Transaction Mapper - Maps investigation results to transactions."""

import os
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

import pytz

from app.config.threshold_config import get_risk_threshold
from app.service.investigation.entity_label_helper import get_entity_label, map_label_to_actual_outcome
from app.service.investigation.enhanced_risk_scorer import EnhancedRiskScorer
from app.service.investigation.is_fraud_query import query_isfraud_tx_for_transactions
from app.service.investigation.transaction_key_normalizer import normalize_transaction_keys
from app.service.investigation.transaction_mapper_core import (
    apply_score_to_transaction, extract_risk_score_from_domain_findings,
    extract_transaction_scores, get_entity_clause_and_list,
)
from app.service.investigation.transaction_query_executor import (
    add_unscored_transactions, mark_transactions_unscored,
    query_entity_transactions, query_scored_transactions,
)
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


async def map_investigation_to_transactions(
    investigation: Optional[Dict[str, Any]], window_start: datetime, window_end: datetime,
    entity_type: Optional[str] = None, entity_id: Optional[str] = None,
) -> Tuple[List[Dict[str, Any]], str, Optional[float]]:
    """Map investigation results to Snowflake transactions."""
    is_snowflake = os.getenv("DATABASE_PROVIDER", "snowflake").lower() == "snowflake"

    # Extract scores and entity info
    if investigation:
        transaction_scores, investigation_risk_score, source = extract_transaction_scores(investigation)
        investigation_risk_score = extract_risk_score_from_domain_findings(
            investigation, investigation_risk_score
        )
        entity_type = entity_type or investigation.get("entity_type")
        entity_id = entity_id or investigation.get("entity_id")
    else:
        transaction_scores, investigation_risk_score, source = None, None, "fallback"

    # Build entity clause
    entity_clause, entity_list, entity_type, entity_id = get_entity_clause_and_list(
        investigation, entity_type, entity_id, is_snowflake
    )

    if not entity_clause:
        logger.warning("No entity_type/entity_id or entity_list available")
        return [], source, None

    # Query transactions
    transactions = await _query_transactions(
        transaction_scores, entity_clause, window_start, window_end, is_snowflake
    )

    if not transactions:
        return [], source, investigation_risk_score

    # Normalize keys and apply enhanced scoring
    transactions = normalize_transaction_keys(transactions)
    transactions, investigation_risk_score, transaction_scores = await _apply_enhanced_scoring(
        transactions, investigation, entity_type, entity_id,
        investigation_risk_score, transaction_scores
    )

    # Map scores to transactions
    mapped = _map_scores_to_transactions(
        transactions, transaction_scores, investigation_risk_score,
        entity_type, entity_id
    )

    # Query IS_FRAUD_TX for ground truth
    mapped = await _apply_is_fraud_labels(mapped, window_end, is_snowflake)

    return mapped, source, None if transaction_scores else investigation_risk_score


async def _query_transactions(
    transaction_scores: Optional[Dict[str, float]], entity_clause: str,
    window_start: datetime, window_end: datetime, is_snowflake: bool,
) -> List[Dict[str, Any]]:
    """Query transactions based on scores availability."""
    include_all = os.getenv("INCLUDE_ALL_ENTITY_TRANSACTIONS", "true").lower() == "true"

    if not transaction_scores:
        if include_all:
            txs = await query_entity_transactions(entity_clause, window_start, window_end, is_snowflake)
            return mark_transactions_unscored(txs)
        return []

    transactions = await query_scored_transactions(list(transaction_scores.keys()), is_snowflake)
    if include_all:
        all_entity = await query_entity_transactions(entity_clause, window_start, window_end, is_snowflake)
        transactions, added = add_unscored_transactions(transactions, all_entity)
        logger.info(f"Added {added} unscored transactions for TN calculation")
    return transactions


async def _apply_enhanced_scoring(
    transactions: List[Dict[str, Any]], investigation: Optional[Dict[str, Any]],
    entity_type: Optional[str], entity_id: Optional[str],
    investigation_risk_score: Optional[float], transaction_scores: Optional[Dict[str, float]],
) -> Tuple[List[Dict[str, Any]], Optional[float], Optional[Dict[str, float]]]:
    """Apply enhanced risk scoring if enabled."""
    if os.getenv("USE_ENHANCED_RISK_SCORING", "true").lower() != "true":
        return transactions, investigation_risk_score, transaction_scores

    try:
        scorer = EnhancedRiskScorer()
        is_merchant = entity_type and entity_type.lower() in ["merchant", "merchant_name"]
        assessment = scorer.calculate_entity_risk(transactions, entity_id, entity_type, is_merchant_investigation=is_merchant)

        if investigation_risk_score is None or assessment["overall_risk_score"] > investigation_risk_score:
            investigation_risk_score = assessment["overall_risk_score"]

        transaction_scores = {**(transaction_scores or {}), **assessment["transaction_scores"]}

        inv_id = investigation.get("id") if investigation else None
        if inv_id and assessment["transaction_scores"]:
            from app.service.transaction_score_service import TransactionScoreService
            TransactionScoreService.save_transaction_scores(inv_id, assessment["transaction_scores"])
    except Exception as e:
        logger.error(f"Enhanced scoring failed: {e}", exc_info=True)

    return transactions, investigation_risk_score, transaction_scores


def _map_scores_to_transactions(
    transactions: List[Dict[str, Any]], transaction_scores: Optional[Dict[str, float]],
    investigation_risk_score: Optional[float], entity_type: Optional[str], entity_id: Optional[str],
) -> List[Dict[str, Any]]:
    """Map risk scores to transactions and classify."""
    risk_threshold = get_risk_threshold()
    entity_is_fraud = investigation_risk_score is not None and investigation_risk_score >= risk_threshold
    align = os.getenv("ALIGN_TX_WITH_ENTITY_DECISION", "true").lower() == "true"
    entity_label = get_entity_label(entity_type, entity_id) if entity_type and entity_id else None

    mapped = []
    for tx in transactions:
        result = apply_score_to_transaction(tx, transaction_scores, entity_is_fraud, align, investigation_risk_score)
        if result:
            result["actual_outcome"] = map_label_to_actual_outcome(entity_label) if entity_label else None
            mapped.append(result)
    logger.info(f"Mapped {len(mapped)}/{len(transactions)} transactions with scores")
    return mapped


async def _apply_is_fraud_labels(transactions: List[Dict[str, Any]], window_end: datetime, is_snowflake: bool) -> List[Dict[str, Any]]:
    """Apply IS_FRAUD_TX ground truth labels."""
    utc = pytz.UTC
    window_end = window_end.astimezone(utc) if window_end.tzinfo else utc.localize(window_end)
    tx_ids = [tx.get("transaction_id") for tx in transactions if tx.get("transaction_id")]
    if not tx_ids:
        return transactions

    try:
        is_fraud_map = await query_isfraud_tx_for_transactions(tx_ids, window_end, is_snowflake)
        for tx in transactions:
            tx_id = str(tx.get("transaction_id", ""))
            if tx.get("actual_outcome") is None and tx_id in is_fraud_map:
                tx["actual_outcome"] = is_fraud_map[tx_id]
    except Exception as e:
        logger.error(f"Failed to query IS_FRAUD_TX: {e}", exc_info=True)
    return transactions
