"""
Snowflake Configuration - Hard-Set Read Path

Hard-sets the exact database, schema, table, role, and warehouse used for production runs.
Includes startup self-test to verify read path and fail fast if data is unavailable.

Constitutional Compliance:
- All configuration from environment variables with hard defaults
- Startup validation ensures data availability
- No hardcoded business logic
"""

import os
from datetime import datetime, timedelta
from typing import Any, Dict, Optional

import pytz

from app.service.agent.tools.database_tool import get_database_provider
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class SnowflakeReadConfig:
    """
    Hard-set Snowflake read configuration.

    Locks the exact database, schema, table, role, and warehouse used in production.
    """

    def __init__(self):
        """Initialize with hard-set values from environment."""
        # Hard-set database configuration
        self.database = os.getenv("SNOWFLAKE_DATABASE", "DBT")
        self.schema = os.getenv("SNOWFLAKE_SCHEMA", "DBT_PROD")
        self.table = os.getenv("SNOWFLAKE_TRANSACTIONS_TABLE", "TXS")

        # Hard-set read role and warehouse
        self.read_role = os.getenv("SNOWFLAKE_READ_ROLE", "PUBLIC")
        self.read_warehouse = os.getenv(
            "SNOWFLAKE_READ_WAREHOUSE", "manual_review_agent_wh"
        )

        # Full table name
        self.full_table_name = f"{self.database}.{self.schema}.{self.table}"

        logger.info(f"🔒 Snowflake Read Config Locked:")
        logger.info(f"   Database: {self.database}")
        logger.info(f"   Schema: {self.schema}")
        logger.info(f"   Table: {self.table}")
        logger.info(f"   Full Table: {self.full_table_name}")
        logger.info(f"   Role: {self.read_role}")
        logger.info(f"   Warehouse: {self.read_warehouse}")

    def get_full_table_name(self) -> str:
        """Get the hard-set full table name."""
        return self.full_table_name

    def get_read_role(self) -> str:
        """Get the hard-set read role."""
        return self.read_role

    def get_read_warehouse(self) -> str:
        """Get the hard-set read warehouse."""
        return self.read_warehouse


# Global singleton instance
_snowflake_read_config: Optional[SnowflakeReadConfig] = None


def get_snowflake_read_config() -> SnowflakeReadConfig:
    """Get the global Snowflake read configuration instance."""
    global _snowflake_read_config
    if _snowflake_read_config is None:
        _snowflake_read_config = SnowflakeReadConfig()
    return _snowflake_read_config


async def verify_snowflake_read_path() -> Dict[str, Any]:
    """
    Verify the Snowflake read path once at startup.

    Tests:
    1. Connection to Snowflake
    2. Access to the hard-set table
    3. Row count over intended 6-month-old 60-day window
    4. Fails fast if count == 0

    Returns:
        Dict with verification results

    Raises:
        RuntimeError: If read path verification fails
    """
    config = get_snowflake_read_config()

    logger.info("🔍 Verifying Snowflake read path...")

    # Calculate 6-month-old 60-day window
    now = datetime.now(pytz.timezone("America/New_York"))
    max_lookback_months = int(os.getenv("ANALYTICS_MAX_LOOKBACK_MONTHS", "6"))
    max_lookback_days = max_lookback_months * 30
    window_duration_days = int(os.getenv("INVESTIGATION_DEFAULT_WINDOW_DAYS", "60"))

    window_end = now - timedelta(days=max_lookback_days)
    window_start = window_end - timedelta(days=window_duration_days)

    logger.info(
        f"📅 Testing window: {window_start.date()} to {window_end.date()} ({window_duration_days} days)"
    )

    try:
        # Get database provider
        db_provider = get_database_provider()
        db_provider.connect()

        # Verify table exists and is accessible
        table_name = config.get_full_table_name()
        test_query = f"SELECT COUNT(*) as row_count FROM {table_name} LIMIT 1"

        is_async = hasattr(db_provider, "execute_query_async")
        if is_async:
            result = await db_provider.execute_query_async(test_query)
        else:
            result = db_provider.execute_query(test_query)

        if not result or len(result) == 0:
            raise RuntimeError(
                f"Failed to access table {table_name} - query returned no results"
            )

        total_rows = result[0].get("row_count", result[0].get("ROW_COUNT", 0))
        logger.info(f"✅ Table {table_name} accessible - total rows: {total_rows:,}")

        # Test window query with APPROVED filter
        window_query = f"""
            SELECT COUNT(*) as row_count
            FROM {table_name}
            WHERE TX_DATETIME >= '{window_start.isoformat()}'
              AND TX_DATETIME < '{window_end.isoformat()}'
              AND UPPER(NSURE_LAST_DECISION) = 'APPROVED'
        """

        if is_async:
            window_result = await db_provider.execute_query_async(window_query)
        else:
            window_result = db_provider.execute_query(window_query)

        approved_count = 0
        if window_result and len(window_result) > 0:
            approved_count = window_result[0].get(
                "row_count", window_result[0].get("ROW_COUNT", 0)
            )

        logger.info(f"📊 Window query (APPROVED): {approved_count:,} transactions")

        # If APPROVED returns 0, try fallback decision values
        fallback_used = None
        if approved_count == 0:
            logger.warning(
                "⚠️ No APPROVED transactions found - trying fallback decision values..."
            )

            # Try fallback decision values
            fallback_query = f"""
                SELECT 
                    COUNT(*) as row_count,
                    COUNT(CASE WHEN UPPER(NSURE_LAST_DECISION) = 'AUTHORIZED' THEN 1 END) as authorized_count,
                    COUNT(CASE WHEN UPPER(NSURE_LAST_DECISION) = 'SETTLED' THEN 1 END) as settled_count,
                    COUNT(CASE WHEN UPPER(NSURE_LAST_DECISION) IS NULL THEN 1 END) as null_count,
                    COUNT(DISTINCT UPPER(NSURE_LAST_DECISION)) as distinct_decisions
                FROM {table_name}
                WHERE TX_DATETIME >= '{window_start.isoformat()}'
                  AND TX_DATETIME < '{window_end.isoformat()}'
            """

            if is_async:
                fallback_result = await db_provider.execute_query_async(fallback_query)
            else:
                fallback_result = db_provider.execute_query(fallback_query)

            if fallback_result and len(fallback_result) > 0:
                row = fallback_result[0]
                total_in_window = row.get("row_count", row.get("ROW_COUNT", 0))
                authorized_count = row.get(
                    "authorized_count", row.get("AUTHORIZED_COUNT", 0)
                )
                settled_count = row.get("settled_count", row.get("SETTLED_COUNT", 0))
                null_count = row.get("null_count", row.get("NULL_COUNT", 0))
                distinct_decisions = row.get(
                    "distinct_decisions", row.get("DISTINCT_DECISIONS", 0)
                )

                logger.info(f"📊 Window statistics:")
                logger.info(f"   Total transactions: {total_in_window:,}")
                logger.info(f"   AUTHORIZED: {authorized_count:,}")
                logger.info(f"   SETTLED: {settled_count:,}")
                logger.info(f"   NULL decisions: {null_count:,}")
                logger.info(f"   Distinct decision values: {distinct_decisions}")

                # Determine fallback to use
                if authorized_count > 0:
                    fallback_used = "AUTHORIZED"
                    approved_count = authorized_count
                elif settled_count > 0:
                    fallback_used = "SETTLED"
                    approved_count = settled_count
                elif total_in_window > 0:
                    fallback_used = "ALL"
                    approved_count = total_in_window
                    logger.warning(
                        "⚠️ Using ALL transactions (no APPROVED/AUTHORIZED/SETTLED found)"
                    )
                else:
                    # FAIL FAST: No transactions in window
                    error_msg = (
                        f"❌ CRITICAL: No transactions found in test window "
                        f"({window_start.date()} to {window_end.date()}). "
                        f"Read path verification FAILED. "
                        f"Check: 1) Table {table_name} exists, 2) Data exists in this time range, "
                        f"3) Timezone alignment, 4) Database connection"
                    )
                    logger.error(error_msg)
                    raise RuntimeError(error_msg)

        # Final validation: Fail fast if count == 0
        if approved_count == 0:
            error_msg = (
                f"❌ CRITICAL: Read path verification FAILED - "
                f"0 transactions found in test window ({window_start.date()} to {window_end.date()}). "
                f"Table: {table_name}, Role: {config.get_read_role()}, Warehouse: {config.get_read_warehouse()}"
            )
            logger.error(error_msg)
            raise RuntimeError(error_msg)

        logger.info(
            f"✅ Snowflake read path verified: {approved_count:,} transactions in test window"
        )
        if fallback_used:
            logger.info(f"   ⚠️ Using fallback decision filter: {fallback_used}")

        return {
            "status": "success",
            "table": table_name,
            "role": config.get_read_role(),
            "warehouse": config.get_read_warehouse(),
            "window_start": window_start.isoformat(),
            "window_end": window_end.isoformat(),
            "window_days": window_duration_days,
            "transaction_count": approved_count,
            "fallback_used": fallback_used,
            "total_table_rows": total_rows,
        }

    except Exception as e:
        logger.error(f"❌ Snowflake read path verification failed: {e}", exc_info=True)
        raise RuntimeError(f"Snowflake read path verification failed: {e}") from e
