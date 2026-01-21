"""
IS_FRAUD_TX Query Service

Queries IS_FRAUD_TX ground truth values from database for transaction comparison.
"""

import os
from datetime import datetime
from typing import Any, Dict, List, Optional

import pytz

from app.service.agent.tools.database_tool import get_database_provider
from app.service.investigation.is_fraud_diagnostics import run_all_diagnostics
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


def _build_is_fraud_query(
    table_name: str,
    tx_id_col: str,
    is_fraud_col: str,
    transaction_ids_str: str,
    max_rows: int,
    is_snowflake: bool,
) -> str:
    """Build the IS_FRAUD_TX query for Snowflake or PostgreSQL."""
    if is_snowflake:
        return f"""
        SELECT
            CAST({tx_id_col} AS VARCHAR) as transaction_id,
            {is_fraud_col} as is_fraud_tx
        FROM {table_name}
        WHERE CAST({tx_id_col} AS VARCHAR) IN ('{transaction_ids_str}')
        LIMIT {max_rows}
        """
    else:
        return f"""
        SELECT
            {tx_id_col}::TEXT as transaction_id,
            {is_fraud_col} as is_fraud_tx
        FROM {table_name}
        WHERE {tx_id_col}::TEXT IN ('{transaction_ids_str}')
        LIMIT {max_rows}
        """


def _map_is_fraud_results(results: List[Dict[str, Any]]) -> Dict[str, Optional[int]]:
    """Map query results to transaction_id -> IS_FRAUD_TX dictionary."""
    is_fraud_map = {}
    null_count = 0
    fraud_count = 0
    not_fraud_count = 0

    for row in results:
        tx_id = row.get("transaction_id") or row.get("TRANSACTION_ID")
        is_fraud_value = row.get("is_fraud_tx") or row.get("IS_FRAUD_TX")

        if not tx_id:
            continue

        tx_id = str(tx_id)

        if is_fraud_value is None:
            is_fraud_map[tx_id] = None
            null_count += 1
        elif is_fraud_value in (1, "1", True, "True", "true"):
            is_fraud_map[tx_id] = 1
            fraud_count += 1
        elif is_fraud_value in (0, "0", False, "False", "false"):
            is_fraud_map[tx_id] = 0
            not_fraud_count += 1
        else:
            try:
                is_fraud_map[tx_id] = int(is_fraud_value)
                if is_fraud_map[tx_id] == 1:
                    fraud_count += 1
                else:
                    not_fraud_count += 1
            except (ValueError, TypeError):
                is_fraud_map[tx_id] = None
                null_count += 1

    logger.info(
        f"Queried IS_FRAUD_TX: {fraud_count} fraud, {not_fraud_count} not fraud, {null_count} NULL"
    )
    return is_fraud_map


async def query_isfraud_tx_for_transactions(
    transaction_ids: List[str], window_end: datetime, is_snowflake: bool
) -> Dict[str, Optional[int]]:
    """
    Query IS_FRAUD_TX values for transactions AFTER investigation completes.

    Args:
        transaction_ids: List of transaction IDs to query
        window_end: Investigation window end date
        is_snowflake: Whether using Snowflake

    Returns:
        Dictionary mapping transaction_id to IS_FRAUD_TX value (1, 0, or None)
    """
    if not transaction_ids:
        return {}

    batch_size = int(os.getenv("ISFRAUD_BATCH_SIZE", "500"))

    # Batch processing for large lists
    if len(transaction_ids) > batch_size:
        logger.info(f"[IS_FRAUD_TX] Batching {len(transaction_ids)} IDs into {batch_size}-size chunks")
        result = {}
        for i in range(0, len(transaction_ids), batch_size):
            batch = transaction_ids[i:i + batch_size]
            batch_result = await query_isfraud_tx_for_transactions(batch, window_end, is_snowflake)
            result.update(batch_result)
        return result

    db_provider = get_database_provider()
    db_provider.connect()

    table_name = db_provider.get_full_table_name()
    tx_id_col = "TX_ID_KEY" if is_snowflake else "tx_id_key"
    datetime_col = "TX_DATETIME" if is_snowflake else "tx_datetime"
    is_fraud_col = "IS_FRAUD_TX" if is_snowflake else "is_fraud_tx"

    # Escape and join transaction IDs
    transaction_ids_escaped = [str(tx_id).replace("'", "''") for tx_id in transaction_ids]
    transaction_ids_str = "', '".join(transaction_ids_escaped)

    # Normalize window_end to UTC
    utc = pytz.UTC
    if window_end.tzinfo is None:
        window_end_utc = utc.localize(window_end)
    else:
        window_end_utc = window_end.astimezone(utc)
    window_end_str = window_end_utc.strftime("%Y-%m-%d %H:%M:%S")

    max_expected_rows = len(transaction_ids) * 2
    is_async = hasattr(db_provider, "execute_query_async")

    # Run diagnostics if enabled
    await run_all_diagnostics(
        db_provider, table_name, tx_id_col, datetime_col, is_fraud_col,
        transaction_ids_str, window_end_str, is_async
    )

    # Build and execute main query
    query = _build_is_fraud_query(
        table_name, tx_id_col, is_fraud_col, transaction_ids_str, max_expected_rows, is_snowflake
    )

    logger.info(f"[IS_FRAUD_TX] Querying {len(transaction_ids)} transactions")

    try:
        if is_async:
            results = await db_provider.execute_query_async(query)
        else:
            results = db_provider.execute_query(query)

        result_count = len(results) if results else 0
        logger.info(f"[IS_FRAUD_TX] Query returned {result_count} rows")

        if result_count > max_expected_rows:
            logger.error(f"[IS_FRAUD_TX] Unexpected row count {result_count}, truncating")
            results = results[:max_expected_rows]

        if not results:
            return {}

        return _map_is_fraud_results(results)

    except Exception as e:
        logger.error(f"Failed to query IS_FRAUD_TX: {e}", exc_info=True)
        return {}
