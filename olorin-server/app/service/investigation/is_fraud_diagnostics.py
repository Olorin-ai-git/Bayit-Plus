"""IS_FRAUD_TX Diagnostics - Optional queries for data quality debugging."""

import os
from datetime import datetime, timedelta
from typing import Any, List

import pytz

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


def is_diagnostics_enabled() -> bool:
    """Check if diagnostic queries are enabled."""
    return os.getenv("ENABLE_ISFRAUD_TX_DIAGNOSTICS", "false").lower() == "true"


async def run_diagnostic_overall(
    db_provider: Any,
    table_name: str,
    tx_id_col: str,
    is_fraud_col: str,
    transaction_ids_str: str,
    is_async: bool,
) -> None:
    """Diagnostic 1: Check overall IS_FRAUD_TX distribution (no date filter)."""
    query = f"""
    SELECT
        COUNT(*) as total_in_table,
        COUNT({is_fraud_col}) as non_null_count,
        COUNT(*) - COUNT({is_fraud_col}) as null_count,
        SUM(CASE WHEN {is_fraud_col} = 1 THEN 1 ELSE 0 END) as fraud_count,
        SUM(CASE WHEN {is_fraud_col} = 0 THEN 1 ELSE 0 END) as not_fraud_count
    FROM {table_name}
    WHERE {tx_id_col} IN ('{transaction_ids_str}')
    """

    try:
        if is_async:
            results = await db_provider.execute_query_async(query)
        else:
            results = db_provider.execute_query(query)

        if results:
            row = results[0]
            total = row.get("TOTAL_IN_TABLE") or row.get("total_in_table", 0)
            non_null = row.get("NON_NULL_COUNT") or row.get("non_null_count", 0)
            null_count = row.get("NULL_COUNT") or row.get("null_count", 0)
            fraud = row.get("FRAUD_COUNT") or row.get("fraud_count", 0)
            not_fraud = row.get("NOT_FRAUD_COUNT") or row.get("not_fraud_count", 0)

            logger.info(
                f"[DIAGNOSTIC 1] IS_FRAUD_TX distribution (no date filter): "
                f"Total={total}, Non-NULL={non_null}, NULL={null_count}, "
                f"Fraud={fraud}, Not Fraud={not_fraud}"
            )
    except Exception as e:
        logger.warning(f"[DIAGNOSTIC 1] Query failed: {e}")


async def run_diagnostic_with_date(
    db_provider: Any,
    table_name: str,
    tx_id_col: str,
    datetime_col: str,
    is_fraud_col: str,
    transaction_ids_str: str,
    window_end_str: str,
    is_async: bool,
) -> None:
    """Diagnostic 2: Check IS_FRAUD_TX distribution WITH date filter."""
    query = f"""
    SELECT
        COUNT(*) as total_with_date_filter,
        COUNT({is_fraud_col}) as non_null_count,
        COUNT(*) - COUNT({is_fraud_col}) as null_count,
        SUM(CASE WHEN {is_fraud_col} = 1 THEN 1 ELSE 0 END) as fraud_count,
        SUM(CASE WHEN {is_fraud_col} = 0 THEN 1 ELSE 0 END) as not_fraud_count,
        MIN({datetime_col}) as earliest_tx,
        MAX({datetime_col}) as latest_tx
    FROM {table_name}
    WHERE {tx_id_col} IN ('{transaction_ids_str}')
      AND {datetime_col} <= '{window_end_str}'
    """

    try:
        if is_async:
            results = await db_provider.execute_query_async(query)
        else:
            results = db_provider.execute_query(query)

        if results:
            row = results[0]
            total = row.get("TOTAL_WITH_DATE_FILTER") or row.get("total_with_date_filter", 0)
            non_null = row.get("NON_NULL_COUNT") or row.get("non_null_count", 0)
            null_count = row.get("NULL_COUNT") or row.get("null_count", 0)
            fraud = row.get("FRAUD_COUNT") or row.get("fraud_count", 0)
            not_fraud = row.get("NOT_FRAUD_COUNT") or row.get("not_fraud_count", 0)
            earliest = row.get("EARLIEST_TX") or row.get("earliest_tx")
            latest = row.get("LATEST_TX") or row.get("latest_tx")

            logger.info(
                f"[DIAGNOSTIC 2] IS_FRAUD_TX with date filter (<= {window_end_str}): "
                f"Total={total}, Non-NULL={non_null}, NULL={null_count}, "
                f"Fraud={fraud}, Not Fraud={not_fraud}, Range: {earliest} to {latest}"
            )
    except Exception as e:
        logger.warning(f"[DIAGNOSTIC 2] Query failed: {e}")


async def run_diagnostic_by_age(
    db_provider: Any,
    table_name: str,
    tx_id_col: str,
    datetime_col: str,
    is_fraud_col: str,
    transaction_ids_str: str,
    is_async: bool,
) -> None:
    """Diagnostic 3: Check IS_FRAUD_TX population by transaction age."""
    utc = pytz.UTC
    now = datetime.now(utc)
    days_ago_30 = (now - timedelta(days=30)).strftime("%Y-%m-%d %H:%M:%S")
    days_ago_90 = (now - timedelta(days=90)).strftime("%Y-%m-%d %H:%M:%S")

    query = f"""
    SELECT
        CASE
            WHEN {datetime_col} >= '{days_ago_30}' THEN 'Last 30 days'
            WHEN {datetime_col} >= '{days_ago_90}' THEN '30-90 days ago'
            ELSE 'More than 90 days ago'
        END as age_group,
        COUNT(*) as total,
        COUNT({is_fraud_col}) as non_null_count,
        COUNT(*) - COUNT({is_fraud_col}) as null_count
    FROM {table_name}
    WHERE {tx_id_col} IN ('{transaction_ids_str}')
    GROUP BY age_group
    ORDER BY
        CASE age_group
            WHEN 'Last 30 days' THEN 1
            WHEN '30-90 days ago' THEN 2
            ELSE 3
        END
    """

    try:
        if is_async:
            results = await db_provider.execute_query_async(query)
        else:
            results = db_provider.execute_query(query)

        if results:
            logger.info("[DIAGNOSTIC 3] IS_FRAUD_TX population by transaction age:")
            for row in results:
                age_group = row.get("AGE_GROUP") or row.get("age_group")
                total = row.get("TOTAL") or row.get("total", 0)
                non_null = row.get("NON_NULL_COUNT") or row.get("non_null_count", 0)
                null = row.get("NULL_COUNT") or row.get("null_count", 0)
                if total > 0:
                    null_pct = (null / total) * 100
                    logger.info(
                        f"   {age_group}: {null}/{total} ({null_pct:.1f}%) NULL, "
                        f"{non_null}/{total} ({100-null_pct:.1f}%) populated"
                    )
    except Exception as e:
        logger.warning(f"[DIAGNOSTIC 3] Query failed: {e}")


async def run_all_diagnostics(
    db_provider: Any,
    table_name: str,
    tx_id_col: str,
    datetime_col: str,
    is_fraud_col: str,
    transaction_ids_str: str,
    window_end_str: str,
    is_async: bool,
) -> None:
    """Run all diagnostic queries if enabled."""
    if not is_diagnostics_enabled():
        logger.debug(
            "[IS_FRAUD_TX] Diagnostics disabled (ENABLE_ISFRAUD_TX_DIAGNOSTICS=false)"
        )
        return

    await run_diagnostic_overall(
        db_provider, table_name, tx_id_col, is_fraud_col, transaction_ids_str, is_async
    )
    await run_diagnostic_with_date(
        db_provider, table_name, tx_id_col, datetime_col, is_fraud_col,
        transaction_ids_str, window_end_str, is_async
    )
    await run_diagnostic_by_age(
        db_provider, table_name, tx_id_col, datetime_col, is_fraud_col,
        transaction_ids_str, is_async
    )
