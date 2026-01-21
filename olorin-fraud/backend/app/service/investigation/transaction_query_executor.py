"""
Transaction Query Executor

Executes transaction queries against Snowflake/PostgreSQL.
"""

import os
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from app.service.agent.tools.database_tool import get_database_provider
from app.service.investigation.transaction_decision_filter import build_approved_filter
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


def _build_transaction_select_columns(is_snowflake: bool) -> str:
    """Build SELECT column list for transaction queries."""
    if is_snowflake:
        return """
            TX_ID_KEY as transaction_id,
            STORE_ID as merchant_id,
            TX_DATETIME as event_ts,
            PAID_AMOUNT_VALUE_IN_CURRENCY as amount,
            PAID_AMOUNT_CURRENCY as currency,
            BIN, BIN_COUNTRY_CODE, IP_COUNTRY_CODE, IS_CARD_PREPAID, AVS_RESULT,
            EMAIL_NORMALIZED, DEVICE_ID, IP, USER_AGENT, CARD_TYPE,
            IS_DISPOSABLE_EMAIL, MAXMIND_RISK_SCORE, EMAIL_DATA_THIRD_PARTY_RISK_SCORE,
            NSURE_LAST_DECISION, IS_FRAUD_TX"""
    else:
        return """
            tx_id_key as transaction_id,
            store_id as merchant_id, tx_datetime as event_ts,
            paid_amount_value_in_currency as amount, paid_amount_currency as currency,
            bin, bin_country_code, ip_country_code, is_card_prepaid, avs_result,
            email_normalized, device_id, ip, user_agent, card_type,
            is_disposable_email, maxmind_risk_score, email_data_third_party_risk_score,
            nsure_last_decision, is_fraud_tx"""


async def query_entity_transactions(
    entity_clause: str,
    window_start: datetime,
    window_end: datetime,
    is_snowflake: bool,
) -> List[Dict[str, Any]]:
    """
    Query all transactions for an entity in a time window.

    Args:
        entity_clause: SQL WHERE clause for entity filtering
        window_start: Window start time
        window_end: Window end time
        is_snowflake: Whether using Snowflake

    Returns:
        List of transaction dicts
    """
    db_provider = get_database_provider()
    db_provider.connect()
    is_async = hasattr(db_provider, "execute_query_async")

    window_start_str = window_start.strftime("%Y-%m-%d %H:%M:%S")
    window_end_str = window_end.strftime("%Y-%m-%d %H:%M:%S")

    decision_col = "NSURE_LAST_DECISION" if is_snowflake else "nSure_last_decision"
    decision_filter = build_approved_filter(decision_col, "snowflake" if is_snowflake else "postgresql")
    datetime_col = "TX_DATETIME" if is_snowflake else "tx_datetime"
    columns = _build_transaction_select_columns(is_snowflake)

    query = f"""
    SELECT {columns}
    FROM {db_provider.get_full_table_name()}
    WHERE {entity_clause}
        AND {datetime_col} >= '{window_start_str}'
        AND {datetime_col} <= '{window_end_str}'
        AND {decision_filter}
    """

    logger.info(f"[QUERY_ENTITY_TX] Querying entity transactions in window {window_start_str} to {window_end_str}")

    try:
        if is_async:
            results = await db_provider.execute_query_async(query)
        else:
            results = db_provider.execute_query(query)
        return results if results else []
    except Exception as e:
        logger.warning(f"[QUERY_ENTITY_TX] Query failed: {e}")
        return []


async def query_scored_transactions(
    transaction_ids: List[str],
    is_snowflake: bool,
) -> List[Dict[str, Any]]:
    """
    Query transactions by specific IDs (for scored transactions).

    Args:
        transaction_ids: List of transaction IDs to query
        is_snowflake: Whether using Snowflake

    Returns:
        List of transaction dicts
    """
    if not transaction_ids:
        return []

    db_provider = get_database_provider()
    db_provider.connect()
    is_async = hasattr(db_provider, "execute_query_async")

    columns = _build_transaction_select_columns(is_snowflake)
    tx_id_col = "TX_ID_KEY" if is_snowflake else "tx_id_key"
    max_batch = int(os.getenv("TRANSACTION_QUERY_BATCH_SIZE", "1000"))

    transactions = []
    for batch_start in range(0, len(transaction_ids), max_batch):
        batch_ids = transaction_ids[batch_start:batch_start + max_batch]
        batch_ids_str = "', '".join(str(tid) for tid in batch_ids)

        if is_snowflake:
            query = f"""
            SELECT {columns}
            FROM {db_provider.get_full_table_name()}
            WHERE CAST({tx_id_col} AS VARCHAR) IN ('{batch_ids_str}')
            """
        else:
            query = f"""
            SELECT {columns}
            FROM {db_provider.get_full_table_name()}
            WHERE {tx_id_col}::TEXT IN ('{batch_ids_str}')
            """

        batch_num = batch_start // max_batch + 1
        total = (len(transaction_ids) + max_batch - 1) // max_batch
        logger.info(f"[QUERY_SCORED_TX] Batch {batch_num}/{total} ({len(batch_ids)} IDs)")

        try:
            if is_async:
                batch_txs = await db_provider.execute_query_async(query)
            else:
                batch_txs = db_provider.execute_query(query)
            if batch_txs:
                transactions.extend(batch_txs)
        except Exception as e:
            logger.warning(f"[QUERY_SCORED_TX] Batch {batch_num} failed: {e}")

    logger.info(f"[QUERY_SCORED_TX] Retrieved {len(transactions)}/{len(transaction_ids)} transactions")
    return transactions


def mark_transactions_unscored(transactions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Mark all transactions as unscored with predicted_risk=0."""
    for tx in transactions:
        tx["_unscored"] = True
        tx["_predicted_risk"] = 0.0
    return transactions


def add_unscored_transactions(
    scored_transactions: List[Dict[str, Any]],
    all_entity_transactions: List[Dict[str, Any]],
) -> Tuple[List[Dict[str, Any]], int]:
    """
    Add unscored transactions from entity window to scored transactions.

    Args:
        scored_transactions: List of scored transactions
        all_entity_transactions: All transactions for entity in window

    Returns:
        Tuple of (combined transactions, count of added unscored)
    """
    scored_ids = set(
        str(tx.get("transaction_id") or tx.get("TRANSACTION_ID") or "")
        for tx in scored_transactions
    )

    unscored_count = 0
    for tx in all_entity_transactions:
        tx_id = str(tx.get("transaction_id") or tx.get("TRANSACTION_ID") or "")
        if tx_id and tx_id not in scored_ids:
            tx["_unscored"] = True
            tx["_predicted_risk"] = 0.0
            scored_transactions.append(tx)
            unscored_count += 1

    return scored_transactions, unscored_count
