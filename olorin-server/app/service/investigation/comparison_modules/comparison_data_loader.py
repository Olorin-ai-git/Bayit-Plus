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

    async def get_fraudulent_emails_grouped_by_merchant(
        self, 
        lookback_hours: int = 24,
        min_fraud_tx: int = 1,
        limit: int = 100,
        reference_time: Optional[datetime] = None
    ) -> List[Dict[str, Any]]:
        """
        Get emails involved in fraud, grouped by merchant.
        
        Args:
            lookback_hours: Hours to look back (default 24h)
            min_fraud_tx: Minimum fraudulent transactions required
            limit: Maximum number of results
            reference_time: Optional reference time to look back from (default: now)
            
        Returns:
            List of dicts with {email, merchant, fraud_count}
        """
        try:
            db_provider = get_database_provider()
            db_provider.connect()
            is_snowflake = (
                os.getenv("DATABASE_PROVIDER", "snowflake").lower() == "snowflake"
            )
            is_async = hasattr(db_provider, "execute_query_async")
            
            # Calculate window
            if reference_time:
                # Ensure timezone awareness if needed, though comparison usually assumes naive UTC or matches input
                now = reference_time
            else:
                now = datetime.now(pytz.timezone("America/New_York"))
            
            start_time = now - timedelta(hours=lookback_hours)
            end_time = now
            
            if is_snowflake:
                query = f"""
                SELECT 
                    EMAIL,
                    MERCHANT_NAME,
                    COUNT(CASE WHEN IS_FRAUD_TX = 1 THEN 1 END) as FRAUD_TX_COUNT,
                    COUNT(*) as TOTAL_TX_COUNT
                FROM {db_provider.get_full_table_name()}
                WHERE TX_DATETIME >= '{start_time.isoformat()}'
                  AND TX_DATETIME <= '{end_time.isoformat()}'
                  AND EMAIL IS NOT NULL
                  AND MERCHANT_NAME IS NOT NULL
                GROUP BY EMAIL, MERCHANT_NAME
                HAVING COUNT(CASE WHEN IS_FRAUD_TX = 1 THEN 1 END) >= {min_fraud_tx}
                ORDER BY FRAUD_TX_COUNT DESC
                LIMIT {limit}
                """
            else:
                query = f"""
                SELECT 
                    email,
                    merchant_name,
                    COUNT(CASE WHEN is_fraud_tx = 1 THEN 1 END) as fraud_tx_count,
                    COUNT(*) as total_tx_count
                FROM {db_provider.get_full_table_name()}
                WHERE tx_datetime >= '{start_time.isoformat()}'
                  AND tx_datetime <= '{end_time.isoformat()}'
                  AND email IS NOT NULL
                  AND merchant_name IS NOT NULL
                GROUP BY email, merchant_name
                HAVING COUNT(CASE WHEN is_fraud_tx = 1 THEN 1 END) >= {min_fraud_tx}
                ORDER BY fraud_tx_count DESC
                LIMIT {limit}
                """
                
            self.logger.info(f"🔍 Executing fraud email query: {query}")
            
            if is_async:
                results = await db_provider.execute_query_async(query)
            else:
                results = db_provider.execute_query(query)
                
            # Normalize keys
            normalized_results = []
            for r in results:
                # Helper to get value case-insensitively
                def get_val(keys):
                    for k in keys:
                        val = r.get(k) or r.get(k.lower()) or r.get(k.upper())
                        if val is not None:
                            return val
                    return None

                email = get_val(["email", "EMAIL"])
                merchant = get_val(["merchant_name", "MERCHANT_NAME"])
                count = get_val(["fraud_tx_count", "FRAUD_TX_COUNT", "fraud_count"])
                total = get_val(["total_tx_count", "TOTAL_TX_COUNT", "total_count"]) or 0
                
                if email and merchant:
                    normalized_results.append({
                        "email": email,
                        "merchant": merchant,
                        "fraud_count": count,
                        "total_count": total
                    })
            
            self.logger.info(f"✅ Found {len(normalized_results)} fraudulent email-merchant pairs")
            # Log first result to debug metadata flow
            if normalized_results:
                self.logger.info(f"   First result sample: {normalized_results[0]}")
            
            return normalized_results
            
        except Exception as e:
            self.logger.error(f"❌ Failed to fetch fraudulent emails: {e}")
            return []

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
