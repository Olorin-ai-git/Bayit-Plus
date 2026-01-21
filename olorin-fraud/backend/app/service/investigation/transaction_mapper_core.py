"""
Transaction Mapper Core - Score extraction, classification, and ID normalization.
"""

import json
from typing import Any, Dict, List, Optional, Tuple

from app.config.threshold_config import get_risk_threshold
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


def extract_transaction_scores(
    investigation: Dict[str, Any],
) -> Tuple[Optional[Dict[str, float]], float, str]:
    """Extract transaction scores from investigation (database > progress_json)."""
    investigation_risk_score = investigation.get("overall_risk_score")
    source = investigation.get("id", "unknown")
    transaction_scores = None

    inv_id = investigation.get("id")
    if inv_id:
        try:
            from app.service.transaction_score_service import TransactionScoreService
            db_scores = TransactionScoreService.get_transaction_scores(inv_id)
            if db_scores:
                transaction_scores = db_scores
                logger.info(f"[EXTRACT_SCORES] Using {len(db_scores)} ENHANCED scores from database")
        except Exception as e:
            logger.warning(f"[EXTRACT_SCORES] Database retrieval failed: {e}")

    if not transaction_scores:
        progress_json = investigation.get("progress_json")
        if progress_json:
            progress_data = json.loads(progress_json) if isinstance(progress_json, str) else progress_json
            if isinstance(progress_data, dict):
                transaction_scores = progress_data.get("transaction_scores")
                if transaction_scores:
                    logger.info(f"[EXTRACT_SCORES] Using {len(transaction_scores)} scores from progress_json")

    return transaction_scores, investigation_risk_score, source


def extract_risk_score_from_domain_findings(
    investigation: Dict[str, Any], current_score: Optional[float]
) -> Optional[float]:
    """Extract risk score from domain_findings if current is None or 0.0."""
    if current_score is not None and current_score != 0.0:
        return current_score

    domain_findings = investigation.get("domain_findings", {})
    if isinstance(domain_findings, dict):
        risk_findings = domain_findings.get("risk", {})
        if isinstance(risk_findings, dict):
            risk_score = risk_findings.get("risk_score")
            if risk_score is not None and risk_score != 0.0:
                logger.info(f"[EXTRACT_RISK] Using domain_findings risk_score: {risk_score}")
                return risk_score
    return current_score


def normalize_transaction_id(tx: Dict[str, Any]) -> Optional[str]:
    """Extract transaction ID handling various key formats."""
    for key in ["transaction_id", "TRANSACTION_ID", "TX_ID_KEY", "tx_id_key"]:
        if tx.get(key):
            return str(tx[key])
    return None


def classify_transaction(
    risk_score: Optional[float], risk_threshold: float,
    entity_is_fraud: bool, align_with_entity: bool,
) -> Tuple[str, float]:
    """Classify transaction as Fraud or Not Fraud."""
    from app.service.investigation.transaction_decision_filter import classify_transaction_fraud

    if not entity_is_fraud and align_with_entity:
        return "Not Fraud", risk_score if risk_score else 0.0

    predicted_label = classify_transaction_fraud(risk_score, risk_threshold)
    return predicted_label, risk_score if risk_score else 0.0


def apply_score_to_transaction(
    tx: Dict[str, Any],
    transaction_scores: Optional[Dict[str, float]],
    entity_is_fraud: bool,
    align_with_entity: bool,
    investigation_risk_score: Optional[float],
) -> Optional[Dict[str, Any]]:
    """Apply risk score and classification to a transaction."""
    risk_threshold = get_risk_threshold()
    mapped_tx = tx.copy()

    tx_id = normalize_transaction_id(tx)
    if not tx_id:
        return None
    mapped_tx["transaction_id"] = tx_id

    # Determine score
    tx_score_float = None
    if tx.get("_unscored"):
        tx_score_float = tx.get("_predicted_risk", 0.0)
    elif transaction_scores and isinstance(transaction_scores, dict):
        tx_score = transaction_scores.get(str(tx_id)) or transaction_scores.get(tx_id)
        if tx_score is not None:
            try:
                tx_score_float = float(tx_score)
                if not (0.0 <= tx_score_float <= 1.0):
                    return None
            except (ValueError, TypeError):
                return None
        else:
            return None
    else:
        return None

    predicted_label, predicted_risk = classify_transaction(
        tx_score_float, risk_threshold, entity_is_fraud, align_with_entity
    )

    if not entity_is_fraud and align_with_entity:
        predicted_risk = investigation_risk_score if investigation_risk_score else 0.0

    mapped_tx["predicted_risk"] = predicted_risk
    mapped_tx["predicted_label"] = predicted_label
    return mapped_tx


def get_entity_clause_and_list(
    investigation: Optional[Dict[str, Any]],
    entity_type: Optional[str],
    entity_id: Optional[str],
    is_snowflake: bool,
) -> Tuple[Optional[str], List[Dict[str, str]], Optional[str], Optional[str]]:
    """Build entity WHERE clause from investigation or parameters."""
    from app.service.investigation.entity_filtering import (
        build_compound_entity_where_clause,
        build_entity_where_clause,
    )

    entity_list = investigation.get("entity_list", []) if investigation else []

    if not entity_type or not entity_id:
        if entity_list:
            entity_type = entity_list[0].get("entity_type")
            entity_id = entity_list[0].get("entity_value")
        else:
            return None, [], entity_type, entity_id

    if len(entity_list) > 1:
        entity_clause, _ = build_compound_entity_where_clause(entity_list, is_snowflake, logic="AND")
        logger.info(f"[ENTITY_CLAUSE] Using COMPOUND clause with {len(entity_list)} entities")
    else:
        entity_clause, _ = build_entity_where_clause(entity_type, entity_id, is_snowflake)

    return entity_clause, entity_list, entity_type, entity_id
