"""
Investigation Transaction Mapper

Maps Postgres investigation results to Snowflake transaction data for comparison.

Workflow:
1. Fetch investigation from Postgres (has risk_score, entity_type, entity_id, time window)
2. Query Snowflake transactions for that entity in that time window
3. Use investigation's risk_score as predicted_risk for transactions
4. Compare predicted (from investigation) vs actual (from Snowflake IS_FRAUD_TX)

Constitutional Compliance:
- No database modifications
- Read-only operations
- Handles missing data gracefully

CRITICAL: ALL transactions must receive risk scores (no sampling/limiting to 2000).
Modified to support large transaction volumes (100K+).
"""

import inspect
import os
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

import pytz

from app.persistence import list_investigations
from app.service.agent.tools.database_tool import get_database_provider
from app.service.investigation.enhanced_risk_scorer import EnhancedRiskScorer
from app.service.investigation.entity_filtering import (
    build_compound_entity_where_clause,
    build_entity_where_clause,
)
from app.service.investigation.entity_label_helper import (
    get_entity_label,
    map_label_to_actual_outcome,
)
from app.service.investigation.query_builder import build_transaction_query
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


def _build_approved_filter(
    decision_col: str, db_provider: str, use_fallback: bool = True
) -> str:
    """
    Build case-insensitive filter for finalized authorization decisions.

    By default, includes APPROVED, AUTHORIZED, and SETTLED transactions.
    Can be configured via TRANSACTION_DECISION_FILTER env var:
    - "APPROVED_ONLY" (default for risk analyzer compatibility)
    - "FINALIZED" (APPROVED OR AUTHORIZED OR SETTLED) - recommended for confusion matrix
    - "ALL" (no filter)

    If APPROVED returns 0 transactions and use_fallback=True, automatically falls back to:
    - AUTHORIZED if available
    - SETTLED if available
    - ALL transactions if decision column is NULL historically

    Args:
        decision_col: Decision column name (NSURE_LAST_DECISION or nSure_last_decision)
        db_provider: Database provider ('snowflake' or 'postgresql')
        use_fallback: If True, use fallback logic when APPROVED returns 0

    Returns:
        SQL filter expression for transaction decisions
    """
    filter_mode = os.getenv("TRANSACTION_DECISION_FILTER", "FINALIZED").upper()

    if filter_mode == "ALL":
        # No filter - include all transactions
        return "1=1"
    elif filter_mode == "APPROVED_ONLY":
        # Strict APPROVED-only (for risk analyzer compatibility)
        if db_provider == "snowflake":
            return f"UPPER({decision_col}) = 'APPROVED'"
        else:
            return f"UPPER({decision_col}) = 'APPROVED'"
    else:
        # FINALIZED: Include APPROVED, AUTHORIZED, SETTLED (default for confusion matrix)
        # If use_fallback=True, add fallback for NULL decisions
        if db_provider == "snowflake":
            if use_fallback:
                # Include APPROVED/AUTHORIZED/SETTLED OR NULL (fallback for historical data)
                return f"(UPPER({decision_col}) IN ('APPROVED', 'AUTHORIZED', 'SETTLED') OR {decision_col} IS NULL)"
            else:
                return f"UPPER({decision_col}) IN ('APPROVED', 'AUTHORIZED', 'SETTLED')"
        else:
            if use_fallback:
                return f"(UPPER({decision_col}) IN ('APPROVED', 'AUTHORIZED', 'SETTLED') OR {decision_col} IS NULL)"
            else:
                return f"UPPER({decision_col}) IN ('APPROVED', 'AUTHORIZED', 'SETTLED')"


def classify_transaction_fraud(
    risk_score: Optional[float], risk_threshold: float
) -> str:
    """
    Classify transaction as 'Fraud' or 'Not Fraud' based on investigation risk score vs threshold.

    Args:
        risk_score: Investigation risk score (from overall_risk_score or domain_findings.risk.risk_score)
        risk_threshold: Threshold for classification (RISK_THRESHOLD_DEFAULT, default 0.3)

    Returns:
        'Fraud' if risk_score >= risk_threshold, 'Not Fraud' otherwise
    """
    if risk_score is None:
        return "Not Fraud"

    if risk_score >= risk_threshold:
        return "Fraud"
    else:
        return "Not Fraud"


async def query_isfraud_tx_for_transactions(
    transaction_ids: List[str], window_end: datetime, is_snowflake: bool
) -> Dict[str, Optional[int]]:
    """
    Query IS_FRAUD_TX values for transactions AFTER investigation completes.

    This is a separate query that runs AFTER investigation to get ground truth values.
    CRITICAL: This query is only used for comparison, not during investigation.

    Args:
        transaction_ids: List of transaction IDs to query
        window_end: Investigation window end date (for filtering)
        is_snowflake: Whether using Snowflake (affects column naming)

    Returns:
        Dictionary mapping transaction_id to IS_FRAUD_TX value (1, 0, or None)
    """
    if not transaction_ids:
        return {}

    # CRITICAL FIX: Batch large IN clauses to prevent query malformation and memory issues
    BATCH_SIZE = int(os.getenv("ISFRAUD_BATCH_SIZE", "500"))  # Process in batches of 500
    
    if len(transaction_ids) > BATCH_SIZE:
        logger.info(
            f"[QUERY_ISFRAUD_TX] Batching {len(transaction_ids)} transaction IDs into chunks of {BATCH_SIZE}"
        )
        
        result = {}
        for i in range(0, len(transaction_ids), BATCH_SIZE):
            batch = transaction_ids[i:i + BATCH_SIZE]
            batch_result = await query_isfraud_tx_for_transactions(batch, window_end, is_snowflake)
            result.update(batch_result)
            logger.info(
                f"[QUERY_ISFRAUD_TX] Processed batch {i // BATCH_SIZE + 1}/{(len(transaction_ids) + BATCH_SIZE - 1) // BATCH_SIZE}, "
                f"got {len(batch_result)} results"
            )
        
        return result

    db_provider = get_database_provider()
    db_provider.connect()

    table_name = db_provider.get_full_table_name()
    tx_id_col = "TX_ID_KEY" if is_snowflake else "tx_id_key"
    datetime_col = "TX_DATETIME" if is_snowflake else "tx_datetime"
    is_fraud_col = "IS_FRAUD_TX" if is_snowflake else "is_fraud_tx"

    # Build query to get IS_FRAUD_TX for transactions
    # Filter by transaction IDs and window end date
    # CRITICAL: Cast transaction IDs to VARCHAR to match TX_ID_KEY data type
    # TX_ID_KEY can be VARCHAR containing numeric strings or UUIDs, so we need to cast both sides
    transaction_ids_escaped = [
        str(tx_id).replace("'", "''") for tx_id in transaction_ids
    ]
    transaction_ids_str = "', '".join(transaction_ids_escaped)

    # Format window_end for SQL (ensure timezone-aware)
    utc = pytz.UTC
    if window_end.tzinfo is None:
        window_end_utc = utc.localize(window_end)
    else:
        window_end_utc = window_end.astimezone(utc)

    # Format date for SQL query (Snowflake expects ISO format)
    window_end_str = window_end_utc.strftime("%Y-%m-%d %H:%M:%S")

    # CRITICAL: Cast both TX_ID_KEY and transaction IDs to VARCHAR for proper matching
    # This handles cases where TX_ID_KEY is VARCHAR but contains numeric strings or UUIDs
    # CRITICAL FIX: Add LIMIT to prevent runaway queries and ensure proper filtering
    max_expected_rows = len(transaction_ids) * 2  # Safety margin in case of duplicates
    
    # CRITICAL: Do NOT filter by TX_DATETIME here!
    # We already have the exact transaction IDs from the investigation window.
    # The datetime filter was causing 0 results because IS_FRAUD_TX is populated
    # based on fraud detection time, not transaction time, which can be later.
    # Since Snowflake is source of truth, we query IS_FRAUD_TX for these specific IDs.
    
    if is_snowflake:
        # Snowflake: Cast both sides to VARCHAR for proper comparison
        # NO datetime filter - we already have the correct IDs from the investigation query
        query = f"""
        SELECT
            CAST({tx_id_col} AS VARCHAR) as transaction_id,
            {is_fraud_col} as is_fraud_tx
        FROM {table_name}
        WHERE CAST({tx_id_col} AS VARCHAR) IN ('{transaction_ids_str}')
        LIMIT {max_expected_rows}
        """
    else:
        # PostgreSQL: Cast both sides to TEXT for proper comparison
        # NO datetime filter - we already have the correct IDs from the investigation query
        query = f"""
        SELECT
            {tx_id_col}::TEXT as transaction_id,
            {is_fraud_col} as is_fraud_tx
        FROM {table_name}
        WHERE {tx_id_col}::TEXT IN ('{transaction_ids_str}')
        LIMIT {max_expected_rows}
        """

    logger.info(
        f"[QUERY_ISFRAUD_TX] Querying {len(transaction_ids)} transactions for IS_FRAUD_TX values"
    )
    logger.info(f"[QUERY_ISFRAUD_TX] Window end: {window_end_utc} (UTC)")
    logger.info(f"[QUERY_ISFRAUD_TX] Full query: {query}")
    logger.info(
        f"[QUERY_ISFRAUD_TX] Sample transaction IDs (first 5): {transaction_ids[:5]}"
    )
    logger.info(
        f"[QUERY_ISFRAUD_TX] Transaction ID types: {[type(tx_id).__name__ for tx_id in transaction_ids[:5]]}"
    )
    logger.info(
        f"[QUERY_ISFRAUD_TX] Transaction ID samples (as strings): {[str(tx_id) for tx_id in transaction_ids[:5]]}"
    )

    # Check if diagnostic queries are enabled (default: false for performance)
    enable_diagnostics = (
        os.getenv("ENABLE_ISFRAUD_TX_DIAGNOSTICS", "false").lower() == "true"
    )

    if not enable_diagnostics:
        logger.debug(
            "[QUERY_ISFRAUD_TX] Diagnostic queries disabled (ENABLE_ISFRAUD_TX_DIAGNOSTICS=false). Set to 'true' to enable."
        )

    # DIAGNOSTIC 1: Check overall IS_FRAUD_TX distribution in the table (without date filter)
    if enable_diagnostics:
        diagnostic_query = f"""
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
            is_async_diag = hasattr(db_provider, "execute_query_async")
            if is_async_diag:
                diag_results = await db_provider.execute_query_async(diagnostic_query)
            else:
                diag_results = db_provider.execute_query(diagnostic_query)

            if diag_results:
                diag_row = diag_results[0]
                total_in_table = diag_row.get("TOTAL_IN_TABLE") or diag_row.get(
                    "total_in_table", 0
                )
                non_null = diag_row.get("NON_NULL_COUNT") or diag_row.get(
                    "non_null_count", 0
                )
                null_count = diag_row.get("NULL_COUNT") or diag_row.get("null_count", 0)
                fraud = diag_row.get("FRAUD_COUNT") or diag_row.get("fraud_count", 0)
                not_fraud = diag_row.get("NOT_FRAUD_COUNT") or diag_row.get(
                    "not_fraud_count", 0
                )

                logger.info(
                    f"[QUERY_ISFRAUD_TX] DIAGNOSTIC 1 - Overall IS_FRAUD_TX distribution (no date filter): "
                    f"Total={total_in_table}, Non-NULL={non_null}, NULL={null_count}, "
                    f"Fraud={fraud}, Not Fraud={not_fraud}"
                )

                if total_in_table > 0:
                    null_pct = (null_count / total_in_table) * 100
                    logger.info(
                        f"[QUERY_ISFRAUD_TX] DIAGNOSTIC 1 - {null_count}/{total_in_table} ({null_pct:.1f}%) have NULL IS_FRAUD_TX "
                        f"(this indicates data quality, not query issue)"
                    )
        except Exception as diag_e:
            logger.warning(f"[QUERY_ISFRAUD_TX] Diagnostic query 1 failed: {diag_e}")

        # DIAGNOSTIC 2: Check IS_FRAUD_TX distribution WITH date filter (same as main query)
        diagnostic_query_with_date = f"""
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
            if is_async_diag:
                diag_results2 = await db_provider.execute_query_async(
                    diagnostic_query_with_date
                )
            else:
                diag_results2 = db_provider.execute_query(diagnostic_query_with_date)

            if diag_results2:
                diag_row2 = diag_results2[0]
                total_with_filter = diag_row2.get(
                    "TOTAL_WITH_DATE_FILTER"
                ) or diag_row2.get("total_with_date_filter", 0)
                non_null2 = diag_row2.get("NON_NULL_COUNT") or diag_row2.get(
                    "non_null_count", 0
                )
                null_count2 = diag_row2.get("NULL_COUNT") or diag_row2.get(
                    "null_count", 0
                )
                fraud2 = diag_row2.get("FRAUD_COUNT") or diag_row2.get("fraud_count", 0)
                not_fraud2 = diag_row2.get("NOT_FRAUD_COUNT") or diag_row2.get(
                    "not_fraud_count", 0
                )
                earliest = diag_row2.get("EARLIEST_TX") or diag_row2.get("earliest_tx")
                latest = diag_row2.get("LATEST_TX") or diag_row2.get("latest_tx")

                logger.info(
                    f"[QUERY_ISFRAUD_TX] DIAGNOSTIC 2 - IS_FRAUD_TX distribution WITH date filter (<= {window_end_str}): "
                    f"Total={total_with_filter}, Non-NULL={non_null2}, NULL={null_count2}, "
                    f"Fraud={fraud2}, Not Fraud={not_fraud2}, Date range: {earliest} to {latest}"
                )

                if total_with_filter > 0:
                    null_pct2 = (null_count2 / total_with_filter) * 100
                    logger.info(
                        f"[QUERY_ISFRAUD_TX] DIAGNOSTIC 2 - {null_count2}/{total_with_filter} ({null_pct2:.1f}%) have NULL IS_FRAUD_TX "
                        f"after date filter"
                    )
        except Exception as diag_e2:
            logger.warning(f"[QUERY_ISFRAUD_TX] Diagnostic query 2 failed: {diag_e2}")

        # DIAGNOSTIC 3: Check if IS_FRAUD_TX is populated for older transactions (potential timing issue)
        # This helps determine if NULL values are expected for recent transactions
        now = datetime.now(utc)
        days_ago_30 = (now - timedelta(days=30)).strftime("%Y-%m-%d %H:%M:%S")
        days_ago_90 = (now - timedelta(days=90)).strftime("%Y-%m-%d %H:%M:%S")

        diagnostic_query_timing = f"""
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
            if is_async_diag:
                diag_results3 = await db_provider.execute_query_async(
                    diagnostic_query_timing
                )
            else:
                diag_results3 = db_provider.execute_query(diagnostic_query_timing)

            if diag_results3:
                logger.info(
                    f"[QUERY_ISFRAUD_TX] DIAGNOSTIC 3 - IS_FRAUD_TX population by transaction age:"
                )
                for row in diag_results3:
                    age_group = row.get("AGE_GROUP") or row.get("age_group")
                    total_age = row.get("TOTAL") or row.get("total", 0)
                    non_null_age = row.get("NON_NULL_COUNT") or row.get(
                        "non_null_count", 0
                    )
                    null_age = row.get("NULL_COUNT") or row.get("null_count", 0)
                    if total_age > 0:
                        null_pct_age = (null_age / total_age) * 100
                        logger.info(
                            f"   {age_group}: {null_age}/{total_age} ({null_pct_age:.1f}%) NULL, "
                            f"{non_null_age}/{total_age} ({100-null_pct_age:.1f}%) populated"
                        )
        except Exception as diag_e3:
            logger.warning(f"[QUERY_ISFRAUD_TX] Diagnostic query 3 failed: {diag_e3}")

        # DIAGNOSTIC 4: Check overall database statistics for IS_FRAUD_TX NULL values
        # This helps determine if NULL values are common across the entire table
        # or specific to the queried transactions
        # NOTE: This query scans the entire table and can be VERY slow - PERMANENTLY DISABLED
        # CRITICAL: This diagnostic is permanently disabled because it performs a full table scan
        # and causes timeouts during startup. The query has no entity filter and scans all transactions.
        # DO NOT ENABLE - this will cause startup timeouts.
        # Diagnostic 4 is now completely removed - if you need this diagnostic, use Diagnostic 3 instead
        # which only queries the specific transaction IDs being investigated.
        pass  # Diagnostic 4 permanently disabled - full table scan causes timeouts

    is_async = hasattr(db_provider, "execute_query_async")

    try:
        if is_async:
            results = await db_provider.execute_query_async(query)
        else:
            results = db_provider.execute_query(query)

        # CRITICAL VALIDATION: Ensure query didn't return entire table
        result_count = len(results) if results else 0
        logger.info(f"[QUERY_ISFRAUD_TX] Query returned {result_count} rows")
        
        # If we got significantly more rows than expected, something is wrong
        if result_count > max_expected_rows:
            logger.error(
                f"[QUERY_ISFRAUD_TX] ❌ CRITICAL: Query returned {result_count} rows but only {len(transaction_ids)} transaction IDs were requested! "
                f"Expected max {max_expected_rows} rows. The WHERE IN clause may be malformed or ignored by the database."
            )
            logger.error(f"[QUERY_ISFRAUD_TX] Problematic query: {query[:500]}...")
            logger.error(f"[QUERY_ISFRAUD_TX] Truncating results to first {max_expected_rows} rows to prevent memory overflow")
            results = results[:max_expected_rows]  # Limit to prevent memory issues
        if results:
            logger.info(
                f"[QUERY_ISFRAUD_TX] Sample result row keys: {list(results[0].keys())}"
            )
            logger.info(
                f"[QUERY_ISFRAUD_TX] Sample result row: transaction_id={results[0].get('transaction_id') or results[0].get('TRANSACTION_ID')}, is_fraud_tx={results[0].get('is_fraud_tx') or results[0].get('IS_FRAUD_TX')}"
            )

            # Log first 5 rows for detailed inspection
            logger.info(f"[QUERY_ISFRAUD_TX] First 5 result rows:")
            for i, row in enumerate(results[:5]):
                tx_id = (
                    row.get("transaction_id")
                    if row.get("transaction_id") is not None
                    else row.get("TRANSACTION_ID")
                )
                is_fraud = (
                    row.get("is_fraud_tx")
                    if row.get("is_fraud_tx") is not None
                    else row.get("IS_FRAUD_TX")
                )
                logger.info(
                    f"  Row {i+1}: transaction_id={tx_id}, is_fraud_tx={is_fraud} (type: {type(is_fraud)})"
                )

        # Map transaction_id to IS_FRAUD_TX value
        # Handle both lowercase and uppercase column names (Snowflake returns uppercase)
        is_fraud_map = {}
        null_count = 0
        fraud_count = 0
        not_fraud_count = 0

        for row in results:
            # Try lowercase first (expected from query alias), then uppercase (Snowflake default)
            # CRITICAL: Use 'is not None' to avoid Python falsy gotcha with 0 values
            tx_id = (
                row.get("transaction_id")
                if row.get("transaction_id") is not None
                else row.get("TRANSACTION_ID")
            )
            is_fraud_value = (
                row.get("is_fraud_tx")
                if row.get("is_fraud_tx") is not None
                else row.get("IS_FRAUD_TX")
            )

            # Skip if transaction_id is missing
            if not tx_id:
                logger.warning(
                    f"[QUERY_ISFRAUD_TX] Row missing transaction_id, keys: {list(row.keys())}"
                )
                continue

            # Normalize transaction_id to string for consistent comparison
            tx_id = str(tx_id)

            # Map IS_FRAUD_TX to int (1, 0) or None
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
                # Try to convert to int
                try:
                    is_fraud_map[tx_id] = int(is_fraud_value)
                    if is_fraud_map[tx_id] == 1:
                        fraud_count += 1
                    else:
                        not_fraud_count += 1
                except (ValueError, TypeError):
                    logger.warning(
                        f"[QUERY_ISFRAUD_TX] Unexpected IS_FRAUD_TX value for {tx_id}: {is_fraud_value} (type: {type(is_fraud_value)})"
                    )
                    is_fraud_map[tx_id] = None
                    null_count += 1

        logger.info(
            f"📊 Queried IS_FRAUD_TX for {len(is_fraud_map)}/{len(transaction_ids)} transactions: "
            f"{fraud_count} fraud, {not_fraud_count} not fraud, {null_count} NULL"
        )

        # Log details about mapping
        logger.debug(
            f"[QUERY_ISFRAUD_TX] Mapped transaction IDs: {list(is_fraud_map.keys())[:5]}..."
        )
        logger.debug(
            f"[QUERY_ISFRAUD_TX] Requested transaction IDs (sample): {transaction_ids[:5]}"
        )
        logger.debug(
            f"[QUERY_ISFRAUD_TX] Transaction ID types - requested: {type(transaction_ids[0]) if transaction_ids else 'N/A'}, mapped: {type(list(is_fraud_map.keys())[0]) if is_fraud_map else 'N/A'}"
        )

        # Log missing transactions with detailed diagnostics
        missing_tx_ids = set(str(tx_id) for tx_id in transaction_ids) - set(
            str(tx_id) for tx_id in is_fraud_map.keys()
        )
        if missing_tx_ids:
            logger.warning(
                f"⚠️ IS_FRAUD_TX query did not return values for {len(missing_tx_ids)} transactions: {list(missing_tx_ids)[:5]}..."
            )

            # DIAGNOSTIC: Try querying without date filter to see if date filter is the issue
            if is_snowflake:
                diagnostic_no_date = f"""
                SELECT
                    CAST({tx_id_col} AS VARCHAR) as transaction_id,
                    {is_fraud_col} as is_fraud_tx,
                    {datetime_col} as tx_datetime
                FROM {table_name}
                WHERE CAST({tx_id_col} AS VARCHAR) IN ('{transaction_ids_str}')
                LIMIT 10
                """
            else:
                diagnostic_no_date = f"""
                SELECT
                    {tx_id_col}::TEXT as transaction_id,
                    {is_fraud_col} as is_fraud_tx,
                    {datetime_col} as tx_datetime
                FROM {table_name}
                WHERE {tx_id_col}::TEXT IN ('{transaction_ids_str}')
                LIMIT 10
                """

            try:
                if is_async:
                    diag_results_no_date = await db_provider.execute_query_async(
                        diagnostic_no_date
                    )
                else:
                    diag_results_no_date = db_provider.execute_query(diagnostic_no_date)

                if diag_results_no_date:
                    logger.info(
                        f"[QUERY_ISFRAUD_TX] DIAGNOSTIC: Found {len(diag_results_no_date)} transactions WITHOUT date filter"
                    )
                    for diag_row in diag_results_no_date[:5]:
                        diag_tx_id = str(
                            diag_row.get("transaction_id")
                            if diag_row.get("transaction_id") is not None
                            else diag_row.get("TRANSACTION_ID", "")
                        )
                        diag_datetime = (
                            diag_row.get("tx_datetime")
                            if diag_row.get("tx_datetime") is not None
                            else diag_row.get("TX_DATETIME")
                        )
                        logger.info(
                            f"  - Transaction {diag_tx_id}: datetime={diag_datetime}, window_end={window_end_str}"
                        )
                        if diag_datetime:
                            try:
                                from datetime import datetime

                                if isinstance(diag_datetime, str):
                                    diag_dt = datetime.fromisoformat(
                                        diag_datetime.replace("Z", "+00:00")
                                    )
                                else:
                                    diag_dt = diag_datetime
                                if diag_dt > window_end_utc:
                                    logger.warning(
                                        f"    ⚠️ Transaction datetime {diag_dt} is AFTER window_end {window_end_utc} - date filter excluded it"
                                    )
                            except Exception as dt_e:
                                logger.debug(f"    Could not parse datetime: {dt_e}")
                else:
                    logger.warning(
                        f"[QUERY_ISFRAUD_TX] DIAGNOSTIC: No transactions found even WITHOUT date filter - transaction IDs may not exist in database"
                    )
            except Exception as diag_e:
                logger.debug(f"[QUERY_ISFRAUD_TX] Diagnostic query failed: {diag_e}")

            # Check if it's a type mismatch issue
            if is_fraud_map:
                sample_mapped_id = list(is_fraud_map.keys())[0]
                sample_requested_id = str(transaction_ids[0])
                logger.debug(
                    f"[QUERY_ISFRAUD_TX] Type comparison - requested: {type(transaction_ids[0])}={transaction_ids[0]}, mapped: {type(sample_mapped_id)}={sample_mapped_id}"
                )
                # Try converting to string for comparison
                if sample_requested_id == str(sample_mapped_id):
                    logger.warning(
                        f"[QUERY_ISFRAUD_TX] ⚠️ Type mismatch detected - IDs match as strings but not as original types"
                    )

        return is_fraud_map

    except Exception as e:
        logger.error(f"❌ Failed to query IS_FRAUD_TX values: {e}", exc_info=True)
        logger.error(f"❌ Query was: {query[:500]}")
        return {}


def get_investigation_by_id(investigation_id: str) -> Optional[Dict[str, Any]]:
    """
    Get investigation by ID from Postgres.

    Args:
        investigation_id: Investigation ID

    Returns:
        Investigation dict or None if not found
    """
    import json

    from app.models.investigation_state import InvestigationState
    from app.persistence.database import get_db_session

    try:
        with get_db_session() as session:
            db_inv = (
                session.query(InvestigationState)
                .filter(InvestigationState.investigation_id == investigation_id)
                .first()
            )

            if not db_inv:
                return None

            # Extract entity info from settings_json
            # Supports both single entity (entities[0]) and compound entities (all entities)
            entity_id = None
            entity_type = None
            entity_list = []  # For compound entities
            if db_inv.settings_json:
                try:
                    settings_data = json.loads(db_inv.settings_json)
                    entities = settings_data.get("entities", [])
                    if entities and len(entities) > 0:
                        # Extract all entities for compound mode support
                        for e in entities:
                            entity_dict = (
                                e
                                if isinstance(e, dict)
                                else (e.__dict__ if hasattr(e, "__dict__") else {})
                            )
                            if entity_dict.get("entity_type") and entity_dict.get(
                                "entity_value"
                            ):
                                entity_list.append(
                                    {
                                        "entity_type": entity_dict.get("entity_type"),
                                        "entity_value": entity_dict.get("entity_value")
                                        or entity_dict.get("entity_id"),
                                    }
                                )

                        # For backward compatibility, also set single entity from first
                        entity = (
                            entities[0]
                            if isinstance(entities[0], dict)
                            else (
                                entities[0].__dict__
                                if hasattr(entities[0], "__dict__")
                                else {}
                            )
                        )
                        entity_id = entity.get("entity_value") or entity.get(
                            "entity_id"
                        )
                        entity_type = entity.get("entity_type")
                except (json.JSONDecodeError, (AttributeError, KeyError, TypeError)):
                    pass

            # Extract overall_risk_score and window dates from progress_json
            overall_risk_score = None
            from_date = None
            to_date = None
            if db_inv.progress_json:
                try:
                    progress_data = json.loads(db_inv.progress_json)
                    overall_risk_score = progress_data.get(
                        "overall_risk_score"
                    ) or progress_data.get("risk_score")
                    # Try to get window dates from progress_json
                    from_date = progress_data.get("from_date") or progress_data.get(
                        "window_start"
                    )
                    to_date = progress_data.get("to_date") or progress_data.get(
                        "window_end"
                    )
                except json.JSONDecodeError:
                    pass

            # If window dates not in progress_json, try settings_json
            if (not from_date or not to_date) and db_inv.settings_json:
                try:
                    settings_data = json.loads(db_inv.settings_json)
                    # Check time_range in settings (primary location for window dates)
                    time_range = settings_data.get("time_range", {})
                    if isinstance(time_range, dict):
                        if not from_date:
                            from_date = time_range.get("start_time") or time_range.get(
                                "start"
                            )
                        if not to_date:
                            to_date = time_range.get("end_time") or time_range.get(
                                "end"
                            )

                    # Fallback to top-level settings if time_range didn't have dates
                    if not from_date:
                        from_date = settings_data.get("from_date") or settings_data.get(
                            "window_start"
                        )
                    if not to_date:
                        to_date = settings_data.get("to_date") or settings_data.get(
                            "window_end"
                        )
                except json.JSONDecodeError:
                    pass

            # Build investigation dict with progress_json included
            investigation_dict = {
                "id": db_inv.investigation_id,
                "investigation_id": db_inv.investigation_id,
                "entity_id": entity_id,
                "entity_type": entity_type,
                "entity_list": entity_list,  # For compound entity support (multiple entities)
                "overall_risk_score": overall_risk_score,
                "from_date": from_date,
                "to_date": to_date,
                "progress_json": db_inv.progress_json,  # CRITICAL: Include progress_json for transaction_scores lookup
                "status": db_inv.status,
                "created_at": (
                    db_inv.created_at.isoformat() if db_inv.created_at else None
                ),
                "updated_at": (
                    db_inv.updated_at.isoformat() if db_inv.updated_at else None
                ),
            }

            return investigation_dict

    except Exception as e:
        logger.error(
            f"Failed to get investigation {investigation_id}: {e}", exc_info=True
        )
        # Fallback to list_investigations
        investigations = list_investigations()
        for inv in investigations:
            inv_dict = (
                inv
                if isinstance(inv, dict)
                else inv.__dict__ if hasattr(inv, "__dict__") else {}
            )
            inv_id = inv_dict.get("id") or inv_dict.get("investigation_id")
            if inv_id == investigation_id:
                return inv_dict
        return None


async def map_investigation_to_transactions(
    investigation: Optional[Dict[str, Any]],
    window_start: datetime,
    window_end: datetime,
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
) -> Tuple[List[Dict[str, Any]], str, Optional[float]]:
    """
    Map investigation results to Snowflake transactions.

    Uses the investigation's risk_score as the predicted_risk for all transactions
    in the investigation's time window.

    Args:
        investigation: Investigation dict from Postgres (or None if no investigation)
        window_start: Window start time
        window_end: Window end time
        entity_type: Entity type (used if investigation is None)
        entity_id: Entity ID (used if investigation is None)

    Returns:
        Tuple of (transactions list, source string, predicted_risk float or None)
    """
    # Get entity info from investigation or parameters
    transaction_scores = None
    if investigation:
        entity_type = investigation.get("entity_type")
        entity_id = investigation.get("entity_id")
        investigation_risk_score = investigation.get("overall_risk_score")

        # Check for per-transaction scores in progress_json
        progress_json = investigation.get("progress_json")
        if progress_json:
            if isinstance(progress_json, str):
                try:
                    import json

                    progress_data = json.loads(progress_json)
                except json.JSONDecodeError:
                    progress_data = {}
            else:
                progress_data = progress_json if isinstance(progress_json, dict) else {}

            # PRIORITY: Database scores > progress_json scores
            # Database scores are enhanced/calibrated scores from enhanced_risk_scorer
            # progress_json scores are original investigation scores (may not be calibrated)
            transaction_scores = None

            # First try database (enhanced/calibrated scores)
            if investigation and investigation.get("id"):
                try:
                    from app.service.transaction_score_service import TransactionScoreService
                    db_scores = TransactionScoreService.get_transaction_scores(investigation.get("id"))
                    if db_scores:
                        transaction_scores = db_scores
                        logger.info(
                            f"[MAP_INVESTIGATION_TO_TRANSACTIONS] Using {len(transaction_scores)} ENHANCED per-transaction scores "
                            f"from database (calibrated by enhanced_risk_scorer) for investigation {investigation.get('id')}"
                        )
                except Exception as e:
                    logger.warning(
                        f"[MAP_INVESTIGATION_TO_TRANSACTIONS] Failed to retrieve scores from database: {e}"
                    )

            # Fallback to progress_json if no database scores
            if not transaction_scores:
                transaction_scores = progress_data.get("transaction_scores")
                if transaction_scores:
                    logger.info(
                        f"[MAP_INVESTIGATION_TO_TRANSACTIONS] Using {len(transaction_scores)} per-transaction scores "
                        f"from progress_json (fallback, not enhanced) for investigation {investigation.get('id', 'unknown')}"
                    )
            
            if transaction_scores:
                logger.info(
                    f"[MAP_INVESTIGATION_TO_TRANSACTIONS] Using per-transaction scores: {len(transaction_scores)} transactions "
                    f"for investigation {investigation.get('id', 'unknown')}"
                )
            else:
                logger.warning(
                    f"[MAP_INVESTIGATION_TO_TRANSACTIONS] No transaction_scores found in state or database "
                    f"for investigation {investigation.get('id', 'unknown')} - will use overall risk score"
                )

        # Log investigation details for debugging
        logger.info(
            f"[MAP_INVESTIGATION_TO_TRANSACTIONS] Investigation: {investigation.get('id', 'unknown')}, "
            f"entity={entity_type}:{entity_id}, overall_risk_score={investigation_risk_score}, "
            f"has_per_transaction_scores={transaction_scores is not None}"
        )

        # CRITICAL FIX: If overall_risk_score is None OR 0.0, try to extract from domain_findings.risk.risk_score
        # This handles cases where:
        # 1. Risk score is stored in domain findings but not at top level
        # 2. Top-level overall_risk_score is 0.0 (default/unset) but domain_findings.risk.risk_score has the real value
        if investigation_risk_score is None or investigation_risk_score == 0.0:
            domain_findings = investigation.get("domain_findings", {})
            if domain_findings and isinstance(domain_findings, dict):
                risk_findings = domain_findings.get("risk", {})
                if isinstance(risk_findings, dict):
                    risk_domain_score = risk_findings.get("risk_score")
                    # Only use domain_findings.risk.risk_score if it's not None and not 0.0
                    if risk_domain_score is not None and risk_domain_score != 0.0:
                        investigation_risk_score = risk_domain_score
                        logger.info(
                            f"[MAP_INVESTIGATION_TO_TRANSACTIONS] Extracted risk_score from domain_findings.risk.risk_score: {investigation_risk_score} "
                            f"(overall_risk_score was {investigation.get('overall_risk_score')})"
                        )
                    elif investigation_risk_score is None:
                        # If overall_risk_score was None and domain_findings.risk.risk_score is also None/0.0, log warning
                        logger.warning(
                            f"[MAP_INVESTIGATION_TO_TRANSACTIONS] Investigation {investigation.get('id', 'unknown')} "
                            f"has no overall_risk_score and no domain_findings.risk.risk_score available"
                        )
            elif investigation_risk_score is None:
                logger.warning(
                    f"[MAP_INVESTIGATION_TO_TRANSACTIONS] Investigation {investigation.get('id', 'unknown')} "
                    f"has no overall_risk_score and no domain_findings available"
                )
        else:
            logger.info(
                f"[MAP_INVESTIGATION_TO_TRANSACTIONS] Using overall_risk_score={investigation_risk_score} "
                f"for investigation {investigation.get('id', 'unknown')}"
            )

        source = investigation.get("id", "unknown")
    else:
        investigation_risk_score = None
        source = "fallback"
        logger.warning(
            f"[MAP_INVESTIGATION_TO_TRANSACTIONS] No investigation provided, using fallback source"
        )

    # For compound entity investigations, we need entity_list
    entity_list = investigation.get("entity_list", []) if investigation else []

    if not entity_type or not entity_id:
        # Check if we have compound entities instead
        if not entity_list:
            logger.warning(f"No entity_type/entity_id or entity_list available")
            return [], source, None
        else:
            # Use first entity from list for backward compatibility logging
            entity_type = entity_list[0].get("entity_type")
            entity_id = entity_list[0].get("entity_value")

    # Query Snowflake for transactions
    db_provider = get_database_provider()
    db_provider.connect()
    is_snowflake = os.getenv("DATABASE_PROVIDER", "snowflake").lower() == "snowflake"
    is_async = hasattr(db_provider, "execute_query_async")

    # Build entity where clause (supports compound entities with multiple entities)
    if len(entity_list) > 1:
        # Compound entity - use AND logic for multiple entities
        entity_clause, _ = build_compound_entity_where_clause(
            entity_list, is_snowflake, logic="AND"
        )
        logger.info(
            f"[MAP_INVESTIGATION_TO_TRANSACTIONS] Using COMPOUND entity clause with {len(entity_list)} entities"
        )
    else:
        # Single entity - use standard clause
        entity_clause, _ = build_entity_where_clause(entity_type, entity_id, is_snowflake)

    # CRITICAL: Filter to finalized authorization decisions (APPROVED, AUTHORIZED, SETTLED)
    # This can be configured via TRANSACTION_DECISION_FILTER env var:
    # - "APPROVED_ONLY" (strict, matches risk analyzer)
    # - "FINALIZED" (default, includes APPROVED/AUTHORIZED/SETTLED for better coverage)
    # - "ALL" (no filter, includes all decisions)
    decision_col = "NSURE_LAST_DECISION" if is_snowflake else "nSure_last_decision"
    decision_filter = _build_approved_filter(
        decision_col, "snowflake" if is_snowflake else "postgresql"
    )
    filter_mode = os.getenv("TRANSACTION_DECISION_FILTER", "FINALIZED").upper()

    # CRITICAL: Handle 0-transaction investigations gracefully
    # When entity combinations don't exist in the investigation window, there are legitimately
    # no transactions to score. This is EXPECTED for historical analysis with mismatched time windows.
    if not transaction_scores or len(transaction_scores) == 0:
        logger.warning(
            f"[MAP_INVESTIGATION_TO_TRANSACTIONS] ⚠️ No transaction scores available for investigation {investigation.get('id') if investigation else 'unknown'}. "
            f"This is expected when the entity combination doesn't exist in the investigation time window. "
            f"Returning empty result set (TP=0, FP=0, TN=0, FN=0)."
        )
        return [], source, investigation_risk_score
    
    logger.info(
        f"[MAP_INVESTIGATION_TO_TRANSACTIONS] ✅ Using {len(transaction_scores)} INVESTIGATED transaction IDs "
        f"to query Snowflake for ground truth labels"
    )
    
    # Build IN clause with the EXACT transaction IDs that were investigated
    transaction_ids = list(transaction_scores.keys())
    tx_id_col = "TX_ID_KEY" if is_snowflake else "tx_id_key"
    
    # For large lists, use batching to avoid SQL query limits
    max_in_clause_size = 1000
    transactions = []
    
    for batch_start in range(0, len(transaction_ids), max_in_clause_size):
        batch_ids = transaction_ids[batch_start:batch_start + max_in_clause_size]
        batch_ids_str = "', '".join(str(tid) for tid in batch_ids)
        
        if is_snowflake:
            batch_query = f"""
            SELECT
                TX_ID_KEY as transaction_id,
                STORE_ID as merchant_id,
                TX_DATETIME as event_ts,
                PAID_AMOUNT_VALUE_IN_CURRENCY as amount,
                PAID_AMOUNT_CURRENCY as currency,
                BIN,
                BIN_COUNTRY_CODE,
                IP_COUNTRY_CODE,
                IS_CARD_PREPAID,
                AVS_RESULT,
                EMAIL_NORMALIZED,
                DEVICE_ID,
                IP,
                USER_AGENT,
                CARD_TYPE,
                IS_DISPOSABLE_EMAIL,
                MAXMIND_RISK_SCORE,
                EMAIL_DATA_THIRD_PARTY_RISK_SCORE,
                NSURE_LAST_DECISION,
                IS_FRAUD_TX
            FROM {db_provider.get_full_table_name()}
            WHERE CAST(TX_ID_KEY AS VARCHAR) IN ('{batch_ids_str}')
            """
        else:
            batch_query = f"""
            SELECT
                tx_id_key as transaction_id,
                store_id as merchant_id,
                tx_datetime as event_ts,
                paid_amount_value_in_currency as amount,
                paid_amount_currency as currency,
                bin,
                bin_country_code,
                ip_country_code,
                is_card_prepaid,
                avs_result,
                email_normalized,
                device_id,
                ip,
                user_agent,
                card_type,
                is_disposable_email,
                maxmind_risk_score,
                email_data_third_party_risk_score,
                nsure_last_decision,
                is_fraud_tx
            FROM {db_provider.get_full_table_name()}
            WHERE tx_id_key::TEXT IN ('{batch_ids_str}')
            """
        
        batch_num = batch_start // max_in_clause_size + 1
        total_batches = (len(transaction_ids) + max_in_clause_size - 1) // max_in_clause_size
        logger.info(
            f"[MAP_INVESTIGATION_TO_TRANSACTIONS] Querying batch {batch_num}/{total_batches} "
            f"({len(batch_ids)} transaction IDs)"
        )
        
        if is_async:
            batch_txs = await db_provider.execute_query_async(batch_query)
        else:
            batch_txs = db_provider.execute_query(batch_query)
        
        if batch_txs:
            transactions.extend(batch_txs)
    
    logger.info(
        f"[MAP_INVESTIGATION_TO_TRANSACTIONS] ✅ Retrieved {len(transactions)}/{len(transaction_ids)} investigated transactions from Snowflake"
    )
    
    # CRITICAL: If we didn't get all transactions, that's an error condition
    if len(transactions) < len(transaction_ids):
        missing_count = len(transaction_ids) - len(transactions)
        logger.warning(
            f"⚠️ Could not find {missing_count}/{len(transaction_ids)} investigated transactions in Snowflake. "
            f"This may indicate transaction IDs that no longer exist or were deleted."
        )

    # Normalize transaction keys upfront (deterministic mapping)
    if transactions:
        from app.service.investigation.transaction_key_normalizer import (
            normalize_transaction_keys,
        )

        transactions = normalize_transaction_keys(transactions)
        logger.info(
            f"🔑 Normalized transaction keys for {len(transactions)} transactions"
        )

    # Store predictions to Postgres PREDICTIONS table for confusion matrix calculation
    if transactions and investigation_risk_score is not None:
        try:
            from app.service.investigation.prediction_storage import store_predictions

            # Store predictions (using investigation_risk_score as predicted_risk for all transactions)
            stored_count = store_predictions(
                transactions=transactions,
                investigation_id=investigation.get("id") if investigation else None,
                entity_type=entity_type,
                entity_id=entity_id,
                predicted_risk=investigation_risk_score,
                window_start=window_start,
                window_end=window_end,
                model_version=investigation.get("id") if investigation else "fallback",
                risk_threshold=float(os.getenv("RISK_THRESHOLD_DEFAULT", "0.5")),
            )
            logger.info(
                f"💾 Stored {stored_count} predictions to Postgres PREDICTIONS table"
            )
        except Exception as e:
            logger.warning(f"⚠️ Failed to store predictions to Postgres: {e}")

    logger.info(
        f"[MAP_INVESTIGATION_TO_TRANSACTIONS] Query returned {len(transactions) if transactions else 0} transactions"
    )

    if not transactions:
        logger.warning(
            f"[MAP_INVESTIGATION_TO_TRANSACTIONS] ⚠️ No transactions found for {entity_type}={entity_id} "
            f"in window {window_start} to {window_end} with filter mode={filter_mode}. "
            f"Consider: 1) Setting TRANSACTION_DECISION_FILTER=ALL to include all decisions, "
            f"2) Checking timezone alignment, 3) Verifying entity exists in this window"
        )
        return [], source, investigation_risk_score

    # ENHANCED RISK SCORING - Use behavioral features instead of MODEL_SCORE
    use_enhanced_scoring = (
        os.getenv("USE_ENHANCED_RISK_SCORING", "true").lower() == "true"
    )
    if use_enhanced_scoring and transactions:
        logger.info(
            f"🎯 Using Enhanced Risk Scoring (without MODEL_SCORE) for {len(transactions)} transactions"
        )

        try:
            enhanced_scorer = EnhancedRiskScorer()
            # Pass is_merchant_investigation flag to avoid penalizing natural merchant concentration
            is_merchant_inv = entity_type and entity_type.lower() in ["merchant", "merchant_name"]
            risk_assessment = enhanced_scorer.calculate_entity_risk(
                transactions, entity_id, entity_type, is_merchant_investigation=is_merchant_inv
            )

            # Update investigation risk score if enhanced score is higher
            enhanced_score = risk_assessment["overall_risk_score"]
            if (
                investigation_risk_score is None
                or enhanced_score > investigation_risk_score
            ):
                logger.info(
                    f"🔄 Risk score updated: {investigation_risk_score} → {enhanced_score:.3f}"
                )
                investigation_risk_score = enhanced_score

            # Update transaction scores
            if not transaction_scores:
                transaction_scores = {}
            transaction_scores.update(risk_assessment["transaction_scores"])
            
            # CRITICAL: Save enhanced scores to database for confusion table generation
            inv_id = investigation.get("id") if investigation else None
            if inv_id and risk_assessment["transaction_scores"]:
                try:
                    from app.service.transaction_score_service import TransactionScoreService
                    TransactionScoreService.save_transaction_scores(
                        inv_id, risk_assessment["transaction_scores"]
                    )
                    logger.info(
                        f"💾 Saved {len(risk_assessment['transaction_scores'])} enhanced transaction scores to database"
                    )
                except Exception as save_error:
                    logger.error(f"❌ Failed to save enhanced scores to database: {save_error}", exc_info=True)

            # Log anomalies detected
            if risk_assessment["anomalies"]:
                logger.warning(f"🚨 Anomalies detected for {entity_type}:{entity_id}:")
                for anomaly in risk_assessment["anomalies"]:
                    logger.warning(f"   - {anomaly['type']}: {anomaly['description']}")

        except Exception as e:
            logger.error(f"❌ Enhanced scoring failed: {e}", exc_info=True)
            # Continue with original scoring

    # DEBUG: Inspect transaction structure to understand why transaction_ids might be empty
    if transactions:
        sample_tx = transactions[0]
        all_keys = list(sample_tx.keys())
        logger.info(
            f"[MAP_INVESTIGATION_TO_TRANSACTIONS] Sample transaction keys: {all_keys}"
        )
        logger.info(
            f"[MAP_INVESTIGATION_TO_TRANSACTIONS] Sample transaction 'transaction_id' value: {sample_tx.get('transaction_id', 'KEY_NOT_FOUND')}"
        )
        # Check for uppercase or other variations
        tx_id_variations = {
            "transaction_id": sample_tx.get("transaction_id"),
            "TRANSACTION_ID": sample_tx.get("TRANSACTION_ID"),
            "TX_ID_KEY": sample_tx.get("TX_ID_KEY"),
            "tx_id_key": sample_tx.get("tx_id_key"),
        }
        logger.info(
            f"[MAP_INVESTIGATION_TO_TRANSACTIONS] Transaction ID variations: {tx_id_variations}"
        )
        logger.info(
            f"[MAP_INVESTIGATION_TO_TRANSACTIONS] Sample transaction full structure (first 3): {[list(tx.keys()) for tx in transactions[:3]]}"
        )

        # Try to find the actual transaction ID key
        actual_tx_id_key = None
        for key in all_keys:
            if "transaction" in key.lower() or "tx_id" in key.lower():
                actual_tx_id_key = key
                logger.info(
                    f"[MAP_INVESTIGATION_TO_TRANSACTIONS] Found potential transaction ID key: '{actual_tx_id_key}' with value: {sample_tx.get(actual_tx_id_key)}"
                )
                break

        if not actual_tx_id_key:
            logger.error(
                f"[MAP_INVESTIGATION_TO_TRANSACTIONS] ⚠️ No transaction ID key found in transaction keys: {all_keys}"
            )
    else:
        logger.warning(
            f"[MAP_INVESTIGATION_TO_TRANSACTIONS] No transactions returned from query - this may explain empty transaction_ids"
        )

    # Read RISK_THRESHOLD_DEFAULT from environment variables (default 0.3)
    risk_threshold = float(os.getenv("RISK_THRESHOLD_DEFAULT", "0.3"))
    logger.info(f"📊 Using risk threshold for classification: {risk_threshold}")

    # Get entity label from EntityRecord (assigned by Remediation Agent)
    entity_label = None
    if entity_type and entity_id:
        entity_label = get_entity_label(entity_type, entity_id)
        if entity_label:
            logger.info(
                f"Found entity label for {entity_type}:{entity_id}: {entity_label}"
            )
        else:
            logger.debug(
                f"No entity label found for {entity_type}:{entity_id} (will use transaction-level labels if available)"
            )

    # Map investigation risk_score to transactions, classify as Fraud/Not Fraud, and apply entity labels
    # CRITICAL: ONLY use investigation risk_score - NO FALLBACKS to MODEL_SCORE
    mapped_transactions = []
    transactions_with_risk = 0
    transactions_without_risk = 0
    fraud_classified = 0
    not_fraud_classified = 0

    # Helper function to extract and normalize transaction ID
    def normalize_transaction_id(tx: Dict[str, Any]) -> Optional[str]:
        """Extract transaction ID from transaction dict, handling various key name formats."""
        # Try lowercase first (expected from query alias)
        tx_id = tx.get("transaction_id")
        if tx_id:
            return str(tx_id)
        # Try uppercase (Snowflake default)
        tx_id = tx.get("TRANSACTION_ID")
        if tx_id:
            return str(tx_id)
        # Try original column name variations
        tx_id = tx.get("TX_ID_KEY") or tx.get("tx_id_key")
        if tx_id:
            return str(tx_id)
        return None

    # Log warning once if transaction_scores are missing (before loop)
    if transaction_scores is None:
        logger.warning(
            f"[MAP_INVESTIGATION_TO_TRANSACTIONS] No transaction_scores dict found in investigation "
            f"{investigation.get('id', 'unknown') if investigation else 'unknown'}, "
            f"excluding all {len(transactions)} transactions from confusion matrix (no fallback to entity-level score)"
        )
    elif not isinstance(transaction_scores, dict):
        logger.warning(
            f"[MAP_INVESTIGATION_TO_TRANSACTIONS] transaction_scores is not a dict (type: {type(transaction_scores)}) "
            f"for investigation {investigation.get('id', 'unknown') if investigation else 'unknown'}, "
            f"excluding all {len(transactions)} transactions from confusion matrix"
        )

    for tx in transactions:
        mapped_tx = tx.copy()

        # Normalize transaction_id key - ensure it always exists as 'transaction_id'
        tx_id = normalize_transaction_id(tx)
        if tx_id:
            mapped_tx["transaction_id"] = tx_id
        else:
            logger.warning(
                f"[MAP_INVESTIGATION_TO_TRANSACTIONS] Transaction missing transaction_id, keys: {list(tx.keys())}"
            )
            # Skip transaction if no ID
            continue

        # Use per-transaction score if available, otherwise exclude transaction (no fallback)
        tx_score_float = None
        if transaction_scores and isinstance(transaction_scores, dict):
            # Check if this transaction has a per-transaction score
            tx_score = transaction_scores.get(str(tx_id)) or transaction_scores.get(
                tx_id
            )
            if tx_score is not None:
                try:
                    tx_score_float = float(tx_score)
                    # Validate score is in [0.0, 1.0] range
                    if not (0.0 <= tx_score_float <= 1.0):
                        # Invalid score - exclude transaction
                        logger.warning(
                            f"[MAP_INVESTIGATION_TO_TRANSACTIONS] Transaction {tx_id} has invalid per-transaction score {tx_score_float}, "
                            f"excluding from confusion matrix"
                        )
                        continue
                except (ValueError, TypeError):
                    # Invalid score type - exclude transaction
                    logger.warning(
                        f"[MAP_INVESTIGATION_TO_TRANSACTIONS] Transaction {tx_id} has invalid per-transaction score type {type(tx_score)}, "
                        f"excluding from confusion matrix"
                    )
                    continue
            else:
                # Transaction not in transaction_scores - exclude (no fallback)
                logger.debug(
                    f"[MAP_INVESTIGATION_TO_TRANSACTIONS] Transaction {tx_id} not found in transaction_scores, "
                    f"excluding from confusion matrix (no fallback to entity-level score)"
                )
                continue
        else:
            # No transaction_scores dict or invalid type - exclude transaction (warning already logged above)
            continue

        # Transaction has valid per-transaction score - set predicted_risk and classify
        mapped_tx["predicted_risk"] = tx_score_float

        # Classify transaction as Fraud or Not Fraud based on per-transaction score vs threshold
        predicted_label = classify_transaction_fraud(tx_score_float, risk_threshold)
        mapped_tx["predicted_label"] = predicted_label

        if predicted_label == "Fraud":
            fraud_classified += 1
        else:
            not_fraud_classified += 1

        transactions_with_risk += 1
        if transactions_with_risk <= 3:  # Log first 3 for debugging
            logger.debug(
                f"[MAP_INVESTIGATION_TO_TRANSACTIONS] Applied per-transaction score={tx_score_float:.3f}, "
                f"predicted_label={predicted_label} to transaction {tx_id}"
            )

        # CRITICAL: Use entity-level label if available, otherwise fall back to transaction-level IS_FRAUD_TX
        # Entity labels take precedence as they are assigned by Remediation Agent based on investigation results
        # Note: IS_FRAUD_TX will be queried separately AFTER investigation for ground truth comparison
        if entity_label:
            # Map entity label to actual_outcome format
            mapped_tx["actual_outcome"] = map_label_to_actual_outcome(entity_label)
            logger.debug(f"Applied entity label {entity_label} to transaction {tx_id}")
        else:
            # Initially set to None - will be populated by querying IS_FRAUD_TX separately AFTER investigation
            mapped_tx["actual_outcome"] = None

        mapped_transactions.append(mapped_tx)

    # CRITICAL: Query IS_FRAUD_TX values separately AFTER investigation for ground truth comparison
    # This ensures we're using the current IS_FRAUD_TX values (single source of truth)
    # Ensure timezone normalization (UTC) for timestamp comparisons
    
    utc = pytz.UTC
    if window_start.tzinfo is None:
        window_start = utc.localize(window_start)
    else:
        window_start = window_start.astimezone(utc)
    if window_end.tzinfo is None:
        window_end = utc.localize(window_end)
    else:
        window_end = window_end.astimezone(utc)

    # Extract transaction IDs - now all transactions should have normalized 'transaction_id' key
    transaction_ids = [
        tx.get("transaction_id")
        for tx in mapped_transactions
        if tx.get("transaction_id")
    ]
    logger.info(
        f"[MAP_INVESTIGATION_TO_TRANSACTIONS] Preparing to query IS_FRAUD_TX for {len(transaction_ids)} transactions"
    )

    # DEBUG: Log details about transaction_ids extraction
    if mapped_transactions:
        logger.info(
            f"[MAP_INVESTIGATION_TO_TRANSACTIONS] Total mapped_transactions: {len(mapped_transactions)}"
        )
        logger.info(
            f"[MAP_INVESTIGATION_TO_TRANSACTIONS] Sample mapped_tx keys: {list(mapped_transactions[0].keys())}"
        )
        logger.info(
            f"[MAP_INVESTIGATION_TO_TRANSACTIONS] Sample mapped_tx 'transaction_id' value: {mapped_transactions[0].get('transaction_id', 'KEY_NOT_FOUND')}"
        )
        # Check how many transactions have transaction_id key
        tx_with_id = [tx for tx in mapped_transactions if tx.get("transaction_id")]
        tx_without_id = [
            tx for tx in mapped_transactions if not tx.get("transaction_id")
        ]
        logger.info(
            f"[MAP_INVESTIGATION_TO_TRANSACTIONS] Transactions with 'transaction_id' key: {len(tx_with_id)}, without: {len(tx_without_id)}"
        )
        if tx_without_id:
            logger.warning(
                f"[MAP_INVESTIGATION_TO_TRANSACTIONS] Sample transaction without 'transaction_id': {list(tx_without_id[0].keys())}"
            )
    else:
        logger.warning(
            f"[MAP_INVESTIGATION_TO_TRANSACTIONS] mapped_transactions is empty - this explains why transaction_ids is empty"
        )

    if transaction_ids:
        try:
            logger.info(
                f"[MAP_INVESTIGATION_TO_TRANSACTIONS] Calling query_isfraud_tx_for_transactions with {len(transaction_ids)} transaction IDs, window_end={window_end}, is_snowflake={is_snowflake}"
            )
            is_fraud_map = await query_isfraud_tx_for_transactions(
                transaction_ids=transaction_ids,
                window_end=window_end,
                is_snowflake=is_snowflake,
            )

            logger.info(
                f"[MAP_INVESTIGATION_TO_TRANSACTIONS] Received IS_FRAUD_TX map with {len(is_fraud_map)} entries"
            )

            # Update transactions with IS_FRAUD_TX values (only if entity label wasn't available)
            updated_count = 0
            for mapped_tx in mapped_transactions:
                tx_id = mapped_tx.get("transaction_id")
                if tx_id and mapped_tx.get("actual_outcome") is None:
                    # Normalize tx_id to string for comparison (is_fraud_map keys are strings)
                    tx_id_str = str(tx_id)
                    # Use IS_FRAUD_TX value if available
                    if tx_id_str in is_fraud_map:
                        mapped_tx["actual_outcome"] = is_fraud_map[tx_id_str]
                        updated_count += 1
                        logger.debug(
                            f"Applied IS_FRAUD_TX={is_fraud_map[tx_id_str]} to transaction {tx_id}"
                        )
                    else:
                        logger.debug(
                            f"[MAP_INVESTIGATION_TO_TRANSACTIONS] Transaction {tx_id} not found in is_fraud_map (keys: {list(is_fraud_map.keys())[:3]}...)"
                        )

            logger.info(
                f"[MAP_INVESTIGATION_TO_TRANSACTIONS] Updated {updated_count}/{len(mapped_transactions)} transactions with IS_FRAUD_TX values"
            )
        except Exception as e:
            logger.error(f"❌ Failed to query IS_FRAUD_TX values: {e}", exc_info=True)
            # Continue without IS_FRAUD_TX values - transactions will have actual_outcome=None
    else:
        logger.warning(
            f"[MAP_INVESTIGATION_TO_TRANSACTIONS] No transaction IDs found - skipping IS_FRAUD_TX query"
        )

    # Log summary with proper formatting
    logger.info(f"[MAP_INVESTIGATION_TO_TRANSACTIONS] ✅ Mapping complete:")
    logger.info(
        f"  - Query returned: {len(transactions)} transactions (filtered by date window and decision status)"
    )
    if transaction_scores and isinstance(transaction_scores, dict):
        total_scores = len(transaction_scores)
        mapped_count = len(mapped_transactions)
        excluded_by_filter = total_scores - mapped_count
        if excluded_by_filter > 0:
            logger.info(f"  - Transaction scores available: {total_scores} total")
            logger.info(
                f"  - Transactions with scores excluded by query filters: {excluded_by_filter}"
            )
            logger.info(
                f"    Reason: These transactions don't match confusion matrix criteria:"
            )
            logger.info(
                f"    - Must be within date window: {window_start} to {window_end}"
            )
            logger.info(
                f"    - Must have decision status: APPROVED/AUTHORIZED/SETTLED (REJECTED transactions excluded)"
            )
            logger.info(f"    - Must match entity filter")
            logger.info(
                f"    Note: transaction_scores includes ALL transactions from investigation (including REJECTED),"
            )
            logger.info(
                f"    but confusion matrix only evaluates APPROVED transactions for prediction quality."
            )
    logger.info(
        f"  - Mapped with per-transaction scores: {len(mapped_transactions)} transactions"
    )
    logger.info(f"  - Transactions with predicted_risk: {transactions_with_risk}")
    logger.info(f"  - Classified as 'Fraud': {fraud_classified}")
    logger.info(f"  - Classified as 'Not Fraud': {not_fraud_classified}")
    excluded_no_score = len(transactions) - len(mapped_transactions)
    if excluded_no_score > 0:
        logger.warning(
            f"  - Excluded (no per-transaction score): {excluded_no_score} transactions"
        )
        logger.warning(
            f"    ⚠️ These transactions match query filters but don't have scores in transaction_scores dict"
        )

    if len(mapped_transactions) == 0 and len(transactions) > 0:
        logger.warning(
            f"[MAP_INVESTIGATION_TO_TRANSACTIONS] ⚠️ CRITICAL: {len(transactions)} transactions found "
            f"but 0 mapped due to missing per-transaction scores. "
            f"Investigation {investigation.get('id', 'unknown') if investigation else 'unknown'} "
            f"may not have calculated transaction_scores. Confusion matrix will be empty."
        )

    # Return None for investigation_risk_score when using per-transaction scores
    # (each transaction has its own score)
    return (
        mapped_transactions,
        source,
        None if transaction_scores else investigation_risk_score,
    )


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
    investigation = get_investigation_by_id(investigation_id)

    if not investigation:
        logger.error(f"Investigation {investigation_id} not found")
        return [], "fallback", None

    return await map_investigation_to_transactions(
        investigation, window_start, window_end
    )


def get_investigations_for_time_window(
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    window_start: Optional[datetime] = None,
    window_end: Optional[datetime] = None,
) -> List[Dict[str, Any]]:
    """
    Get investigations matching criteria and overlapping the time window.

    Args:
        entity_type: Optional entity type filter
        entity_id: Optional entity ID filter
        window_start: Window start time
        window_end: Window end time

    Returns:
        List of matching investigations that overlap the window
    """
    all_investigations = list_investigations()

    matching = []
    for inv in all_investigations:
        inv_dict = (
            inv
            if isinstance(inv, dict)
            else inv.__dict__ if hasattr(inv, "__dict__") else {}
        )

        # CRITICAL: list_investigations() doesn't include progress_json, so fetch full investigation
        # to ensure transaction_scores are available
        inv_id = inv_dict.get("id") or inv_dict.get("investigation_id")
        if inv_id:
            full_inv = get_investigation_by_id(inv_id)
            if full_inv:
                # Merge full investigation data (includes progress_json) with existing dict
                inv_dict.update(full_inv)

        # Filter by entity
        if entity_type and inv_dict.get("entity_type") != entity_type:
            continue
        if entity_id and inv_dict.get("entity_id") != entity_id:
            continue

        # Check overlap with time window
        inv_from = inv_dict.get("from_date")
        inv_to = inv_dict.get("to_date")

        if not inv_from or not inv_to:
            continue

        # Parse dates if strings and ensure timezone-aware
        tz = pytz.timezone("America/New_York")

        if isinstance(inv_from, str):
            from datetime import datetime as dt

            inv_from = dt.fromisoformat(inv_from.replace("Z", "+00:00"))
        if isinstance(inv_to, str):
            from datetime import datetime as dt

            inv_to = dt.fromisoformat(inv_to.replace("Z", "+00:00"))

        # Ensure timezone-aware (convert naive to aware if needed)
        if inv_from and inv_from.tzinfo is None:
            inv_from = tz.localize(inv_from)
        elif inv_from:
            inv_from = inv_from.astimezone(tz)

        if inv_to and inv_to.tzinfo is None:
            inv_to = tz.localize(inv_to)
        elif inv_to:
            inv_to = inv_to.astimezone(tz)

        # Ensure window_start and window_end are timezone-aware
        if window_start and window_start.tzinfo is None:
            window_start = tz.localize(window_start)
        elif window_start:
            window_start = window_start.astimezone(tz)

        if window_end and window_end.tzinfo is None:
            window_end = tz.localize(window_end)
        elif window_end:
            window_end = window_end.astimezone(tz)

        # Check overlap: investigation overlaps window if:
        # inv_from < window_end AND inv_to > window_start
        if window_start and window_end:
            if inv_to <= window_start or inv_from >= window_end:
                continue

        matching.append(inv_dict)

    return matching


def select_best_investigation(
    investigations: List[Dict[str, Any]], window_start: datetime, window_end: datetime
) -> Optional[Dict[str, Any]]:
    """
    Select best investigation for a window using deterministic rules.

    Rules (in order):
    1. Choose most recent created_at that fully covers the window
    2. If none fully covers, choose one with largest overlap
    3. Tie-break by highest model_version (if available)

    Args:
        investigations: List of investigation dicts
        window_start: Window start time
        window_end: Window end time

    Returns:
        Best investigation dict or None if no investigations
    """
    if not investigations:
        return None

    # Parse dates for all investigations and ensure timezone-aware
    tz = pytz.timezone("America/New_York")

    parsed_investigations = []
    for inv in investigations:
        inv_from = inv.get("from_date")
        inv_to = inv.get("to_date")
        inv_created = inv.get("created")

        if not inv_from or not inv_to:
            continue

        if isinstance(inv_from, str):
            from datetime import datetime as dt

            inv_from = dt.fromisoformat(inv_from.replace("Z", "+00:00"))
        if isinstance(inv_to, str):
            from datetime import datetime as dt

            inv_to = dt.fromisoformat(inv_to.replace("Z", "+00:00"))
        if isinstance(inv_created, str):
            from datetime import datetime as dt

            try:
                inv_created = dt.fromisoformat(inv_created.replace("Z", "+00:00"))
            except:
                inv_created = None

        # Ensure timezone-aware
        if inv_from.tzinfo is None:
            inv_from = tz.localize(inv_from)
        else:
            inv_from = inv_from.astimezone(tz)

        if inv_to.tzinfo is None:
            inv_to = tz.localize(inv_to)
        else:
            inv_to = inv_to.astimezone(tz)

        if inv_created and inv_created.tzinfo is None:
            inv_created = tz.localize(inv_created)
        elif inv_created:
            inv_created = inv_created.astimezone(tz)

        parsed_investigations.append(
            {"inv": inv, "from": inv_from, "to": inv_to, "created": inv_created}
        )

    if not parsed_investigations:
        return None

    # Ensure window_start and window_end are timezone-aware
    if window_start.tzinfo is None:
        window_start = tz.localize(window_start)
    else:
        window_start = window_start.astimezone(tz)

    if window_end.tzinfo is None:
        window_end = tz.localize(window_end)
    else:
        window_end = window_end.astimezone(tz)

    # Rule 1: Find investigations that fully cover the window
    fully_covering = [
        p
        for p in parsed_investigations
        if p["from"] <= window_start and p["to"] >= window_end
    ]

    if fully_covering:
        # Choose most recent created_at
        best = max(fully_covering, key=lambda p: p["created"] or datetime.min)
        selected_inv = best["inv"]
        # Ensure overall_risk_score is preserved
        if selected_inv and "overall_risk_score" in selected_inv:
            logger.debug(
                f"[SELECT_BEST_INVESTIGATION] Selected investigation {selected_inv.get('id', 'unknown')} with overall_risk_score={selected_inv.get('overall_risk_score')}"
            )
        return selected_inv

    # Rule 2: Find investigation with largest overlap
    overlaps = []
    for p in parsed_investigations:
        overlap_start = max(p["from"], window_start)
        overlap_end = min(p["to"], window_end)

        if overlap_end > overlap_start:
            overlap_duration = (overlap_end - overlap_start).total_seconds()
            overlaps.append(
                {"inv": p["inv"], "overlap": overlap_duration, "created": p["created"]}
            )

    if overlaps:
        # Sort by overlap (desc), then by created (desc)
        overlaps.sort(
            key=lambda x: (x["overlap"], x["created"] or datetime.min), reverse=True
        )
        selected_inv = overlaps[0]["inv"]
        # Ensure overall_risk_score is preserved
        if selected_inv and "overall_risk_score" in selected_inv:
            logger.debug(
                f"[SELECT_BEST_INVESTIGATION] Selected investigation {selected_inv.get('id', 'unknown')} with overall_risk_score={selected_inv.get('overall_risk_score')}"
            )
        return selected_inv

    # No overlap found
    return None
