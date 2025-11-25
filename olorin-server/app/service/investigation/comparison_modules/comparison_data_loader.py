"""
Comparison Data Loading Module

Extracted data loading methods from auto_comparison.py
"""

import os
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

import pytz

from app.service.agent.tools.database_tool import get_database_provider
from app.service.investigation.entity_filtering import build_entity_where_clause
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class ComparisonDataLoader:
    """Handles loading data for comparison operations"""

    def __init__(self):
        self.logger = logger

    async def find_entity_transaction_date_range(
        self, entity_type: str, entity_value: str, lookback_days: int = 90
    ) -> Optional[Tuple[datetime, datetime]]:
        """
        Find the date range when an entity had transactions.

        Args:
            entity_type: Entity type (email, device_id, ip, etc.)
            entity_value: Entity value
            lookback_days: Maximum days to look back (default: 90)

        Returns:
            Tuple of (earliest_date, latest_date) or None if no transactions found
        """
        try:
            db_provider = get_database_provider()
            db_provider.connect()
            is_snowflake = (
                os.getenv("DATABASE_PROVIDER", "snowflake").lower() == "snowflake"
            )
            is_async = hasattr(db_provider, "execute_query_async")

            # Build entity where clause
            entity_clause, _ = build_entity_where_clause(
                entity_type, entity_value, is_snowflake
            )

            # Calculate lookback window
            now = datetime.now(pytz.timezone("America/New_York"))
            lookback_start = now - timedelta(days=lookback_days)

            # Build query to find transaction date range
            if is_snowflake:
                datetime_col = "TX_DATETIME"
                table_name = db_provider.get_full_table_name()
                query = f"""
                SELECT 
                    MIN({datetime_col}) as earliest_date,
                    MAX({datetime_col}) as latest_date,
                    COUNT(*) as tx_count
                FROM {table_name}
                WHERE {datetime_col} >= '{lookback_start.isoformat()}'
                  AND {entity_clause}
                """
            else:
                datetime_col = "tx_datetime"
                table_name = db_provider.get_full_table_name()
                query = f"""
                SELECT 
                    MIN({datetime_col}) as earliest_date,
                    MAX({datetime_col}) as latest_date,
                    COUNT(*) as tx_count
                FROM {table_name}
                WHERE {datetime_col} >= '{lookback_start.isoformat()}'
                  AND {entity_clause}
                """

            # Execute query
            if is_async:
                results = await db_provider.execute_query_async(query)
            else:
                results = db_provider.execute_query(query)

            if results and len(results) > 0:
                row = results[0]
                earliest = row.get("earliest_date")
                latest = row.get("latest_date")
                tx_count = row.get("tx_count", 0)

                if earliest and latest and tx_count > 0:
                    self.logger.info(
                        f"Found {tx_count} transactions for {entity_type}={entity_value} "
                        f"between {earliest} and {latest}"
                    )
                    return (earliest, latest)

            self.logger.warning(
                f"No transactions found for {entity_type}={entity_value}"
            )
            return None

        except Exception as e:
            self.logger.error(f"Error finding transaction date range: {e}")
            return None

    def detect_entity_type(self, entity_value: str) -> str:
        """Detect entity type from entity value format"""
        # IPv6 addresses contain multiple colons
        if ":" in entity_value and entity_value.count(":") >= 2:
            return "ip"
        # IPv4 addresses have 3 dots
        elif "." in entity_value and entity_value.count(".") == 3:
            return "ip"
        elif "@" in entity_value:
            return "email"
        elif len(entity_value) == 36 and "-" in entity_value:  # UUID format
            return "device_id"
        else:
            return "user_id"
