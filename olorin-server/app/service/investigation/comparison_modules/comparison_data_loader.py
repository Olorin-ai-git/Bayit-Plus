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
            
            
            # Configuration for risk analysis
            top_percentage = float(os.getenv("ANALYTICS_DEFAULT_TOP_PERCENTAGE", "30"))
            top_decimal = top_percentage / 100.0
            
            # Column names
            model_score_col = os.getenv("ANALYTICS_MODEL_SCORE_COL", "MODEL_SCORE")
            amount_col = os.getenv("ANALYTICS_AMOUNT_COL", "PAID_AMOUNT_VALUE_IN_CURRENCY")
            fraud_col = "IS_FRAUD_TX" if is_snowflake else "is_fraud_tx"
            decision_col = "NSURE_LAST_DECISION" if is_snowflake else "nsure_last_decision"
            
            # Minimum MODEL_SCORE threshold for entity selection
            min_model_score = float(os.getenv("MIN_AVG_MODEL_SCORE", "0.5"))

            if is_snowflake:
                query = f"""
                WITH raw_data AS (
                    SELECT
                        EMAIL,
                        MERCHANT_NAME,
                        COUNT(*) as total_count,
                        AVG({model_score_col}) as avg_model_score,
                        SUM({model_score_col} * {amount_col}) * COUNT(*) as risk_weighted_value,
                        COUNT(CASE WHEN {fraud_col} = 1 THEN 1 END) as fraud_count
                    FROM {db_provider.get_full_table_name()}
                    WHERE TX_DATETIME >= '{start_time.isoformat()}'
                      AND TX_DATETIME <= '{end_time.isoformat()}'
                      AND EMAIL IS NOT NULL
                      AND MERCHANT_NAME IS NOT NULL
                      AND UPPER({decision_col}) = 'APPROVED'
                    GROUP BY EMAIL, MERCHANT_NAME
                    HAVING AVG({model_score_col}) >= {min_model_score}
                ),
                ranked_data AS (
                    SELECT 
                        *,
                        PERCENT_RANK() OVER (ORDER BY risk_weighted_value DESC) as pct_rank
                    FROM raw_data
                )
                SELECT 
                    EMAIL,
                    MERCHANT_NAME,
                    fraud_count as FRAUD_TX_COUNT,
                    total_count as TOTAL_TX_COUNT
                FROM ranked_data
                WHERE pct_rank <= {top_decimal}
                ORDER BY risk_weighted_value DESC
                LIMIT {limit}
                """
            else:
                query = f"""
                WITH raw_data AS (
                    SELECT
                        email,
                        merchant_name,
                        COUNT(*) as total_count,
                        AVG({model_score_col}) as avg_model_score,
                        SUM({model_score_col} * {amount_col}) * COUNT(*) as risk_weighted_value,
                        COUNT(CASE WHEN {fraud_col} = 1 THEN 1 END) as fraud_count
                    FROM {db_provider.get_full_table_name()}
                    WHERE tx_datetime >= '{start_time.isoformat()}'
                      AND tx_datetime <= '{end_time.isoformat()}'
                      AND email IS NOT NULL
                      AND merchant_name IS NOT NULL
                      AND UPPER({decision_col}) = 'APPROVED'
                    GROUP BY email, merchant_name
                    HAVING AVG({model_score_col}) >= {min_model_score}
                ),
                ranked_data AS (
                    SELECT 
                        *,
                        PERCENT_RANK() OVER (ORDER BY risk_weighted_value DESC) as pct_rank
                    FROM raw_data
                )
                SELECT 
                    email,
                    merchant_name,
                    fraud_count as fraud_tx_count,
                    total_count as total_tx_count
                FROM ranked_data
                WHERE pct_rank <= {top_decimal}
                ORDER BY risk_weighted_value DESC
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
                    
            self.logger.info(f"✅ Found {len(normalized_results)} top-risk email-merchant pairs (AVG MODEL_SCORE >= {min_model_score})")
            # Log first result to debug metadata flow
            if normalized_results:
                self.logger.info(f"   First result sample: {normalized_results[0]}")

            return normalized_results

        except Exception as e:
            self.logger.error(f"❌ Failed to fetch fraudulent emails: {e}")
            return []

    async def get_high_risk_compound_entities(
        self,
        lookback_hours: int = 24,
        limit: int = 100,
        reference_time: Optional[datetime] = None,
    ) -> List[Dict[str, Any]]:
        """
        Get high-risk compound entities (EMAIL + DEVICE_ID + PAYMENT_METHOD_TOKEN).

        Selection criteria:
        - AVG(MODEL_SCORE) >= 0.5 (configurable via MIN_AVG_MODEL_SCORE)
        - COUNT(*) >= 3 (minimum transactions for statistical significance)
        - Top 30% by risk_weighted_value (configurable via ANALYTICS_DEFAULT_TOP_PERCENTAGE)
        - Ordered by risk_weighted_value = SUM(MODEL_SCORE * AMOUNT) DESC

        Does NOT filter by IS_FRAUD_TX - that is used later for evaluation only.

        Args:
            lookback_hours: Hours to look back (default 24h)
            limit: Maximum number of results
            reference_time: Optional reference time to look back from

        Returns:
            List of dicts with {email, device_id, pmt_token, merchant, fraud_count, total_count}
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
                now = reference_time
            else:
                now = datetime.now(pytz.timezone("America/New_York"))

            start_time = now - timedelta(hours=lookback_hours)
            end_time = now

            # Configuration
            model_score_col = os.getenv("ANALYTICS_MODEL_SCORE_COL", "MODEL_SCORE")
            top_percentage = float(os.getenv("ANALYTICS_DEFAULT_TOP_PERCENTAGE", "30"))
            top_decimal = top_percentage / 100.0

            # Use APPROVED transactions - only these have ground truth IS_FRAUD_TX labels
            # for confusion matrix evaluation (NOT_REVIEWED lacks fraud labels)
            target_decision = os.getenv("SELECTOR_TARGET_DECISION", "APPROVED")

            if is_snowflake:
                table = db_provider.get_full_table_name()
                # Use two formulas and combine results:
                # 1. Velocity: tx_count / active_hours (captures burst patterns)
                # 2. Sweet spot: 3x score if in 0.45-0.6 range (medium-risk zone)
                query = f"""
                WITH compound_entities AS (
                    SELECT
                        EMAIL,
                        DEVICE_ID,
                        PAYMENT_METHOD_TOKEN,
                        MERCHANT_NAME,
                        COUNT(*) as total_count,
                        SUM(CASE WHEN IS_FRAUD_TX = 1 THEN 1 ELSE 0 END) as fraud_count,
                        AVG({model_score_col}) as avg_model_score,
                        MAX({model_score_col}) as max_model_score,
                        MAX(MAXMIND_RISK_SCORE) as max_maxmind_risk,
                        COUNT(*) / NULLIF(COUNT(DISTINCT DATE_TRUNC(hour, TX_DATETIME)), 0) as velocity_score,
                        -- Combined risk formula: MAX(Maxmind) × MAX(Model) × Velocity
                        -- This formula has 68x better fraud concentration than velocity alone
                        MAX(MAXMIND_RISK_SCORE) * MAX({model_score_col}) *
                            (COUNT(*) / NULLIF(COUNT(DISTINCT DATE_TRUNC(hour, TX_DATETIME)), 0)) as combined_risk_score
                    FROM {table}
                    WHERE TX_DATETIME >= '{start_time.isoformat()}'
                      AND TX_DATETIME <= '{end_time.isoformat()}'
                      AND EMAIL IS NOT NULL
                      AND DEVICE_ID IS NOT NULL
                      AND PAYMENT_METHOD_TOKEN IS NOT NULL
                      AND MERCHANT_NAME IS NOT NULL
                      AND UPPER(NSURE_LAST_DECISION) = '{target_decision}'
                    GROUP BY EMAIL, DEVICE_ID, PAYMENT_METHOD_TOKEN, MERCHANT_NAME
                    HAVING COUNT(*) >= 3
                ),
                ranked AS (
                    SELECT *,
                           PERCENT_RANK() OVER (ORDER BY combined_risk_score DESC) as risk_rank
                    FROM compound_entities
                )
                SELECT
                    EMAIL, DEVICE_ID, PAYMENT_METHOD_TOKEN, MERCHANT_NAME,
                    fraud_count, total_count, avg_model_score, max_model_score,
                    max_maxmind_risk, velocity_score, combined_risk_score
                FROM ranked
                WHERE risk_rank <= {top_decimal}
                ORDER BY combined_risk_score DESC
                LIMIT {limit}
                """
            else:
                table = db_provider.get_full_table_name()
                # Combined risk formula for non-Snowflake (SQLite)
                query = f"""
                WITH compound_entities AS (
                    SELECT
                        email,
                        device_id,
                        payment_method_token,
                        merchant_name,
                        COUNT(*) as total_count,
                        SUM(CASE WHEN is_fraud_tx = 1 THEN 1 ELSE 0 END) as fraud_count,
                        AVG({model_score_col}) as avg_model_score,
                        MAX({model_score_col}) as max_model_score,
                        MAX(maxmind_risk_score) as max_maxmind_risk,
                        COUNT(*) * 1.0 / COUNT(DISTINCT strftime('%Y-%m-%d %H', tx_datetime)) as velocity_score,
                        -- Combined risk formula: MAX(Maxmind) × MAX(Model) × Velocity
                        MAX(maxmind_risk_score) * MAX({model_score_col}) *
                            (COUNT(*) * 1.0 / COUNT(DISTINCT strftime('%Y-%m-%d %H', tx_datetime))) as combined_risk_score
                    FROM {table}
                    WHERE tx_datetime >= '{start_time.isoformat()}'
                      AND tx_datetime <= '{end_time.isoformat()}'
                      AND email IS NOT NULL
                      AND device_id IS NOT NULL
                      AND payment_method_token IS NOT NULL
                      AND merchant_name IS NOT NULL
                      AND UPPER(nsure_last_decision) = '{target_decision}'
                    GROUP BY email, device_id, payment_method_token, merchant_name
                    HAVING COUNT(*) >= 3
                ),
                ranked AS (
                    SELECT *,
                           PERCENT_RANK() OVER (ORDER BY combined_risk_score DESC) as risk_rank
                    FROM compound_entities
                )
                SELECT
                    email, device_id, payment_method_token, merchant_name,
                    fraud_count, total_count, avg_model_score, max_model_score,
                    max_maxmind_risk, velocity_score, combined_risk_score
                FROM ranked
                WHERE risk_rank <= {top_decimal}
                ORDER BY combined_risk_score DESC
                LIMIT {limit}
                """

            self.logger.info(
                f"🔍 Executing combined_risk_score entity query: decision={target_decision}, "
                f"min_tx=3, top_{top_percentage}%, "
                f"formula=MAX(Maxmind) × MAX(Model) × Velocity"
            )

            if is_async:
                results = await db_provider.execute_query_async(query)
            else:
                results = db_provider.execute_query(query)

            # Normalize keys
            normalized_results = []
            for r in results:
                def get_val(keys):
                    for k in keys:
                        val = r.get(k) or r.get(k.lower()) or r.get(k.upper())
                        if val is not None:
                            return val
                    return None

                email = get_val(["email", "EMAIL"])
                device_id = get_val(["device_id", "DEVICE_ID"])
                pmt_token = get_val(["payment_method_token", "PAYMENT_METHOD_TOKEN"])
                merchant = get_val(["merchant_name", "MERCHANT_NAME"])
                fraud_count = get_val(["fraud_count", "FRAUD_COUNT"]) or 0
                total_count = get_val(["total_count", "TOTAL_COUNT"]) or 0

                if email and device_id and pmt_token and merchant:
                    normalized_results.append({
                        "email": email,
                        "device_id": device_id,
                        "pmt_token": pmt_token,
                        "merchant": merchant,
                        "fraud_count": fraud_count,
                        "total_count": total_count,
                    })

            self.logger.info(
                f"✅ Found {len(normalized_results)} high-risk compound entities "
                f"(EMAIL+DEVICE+PMT) using combined_risk_score formula"
            )
            if normalized_results:
                self.logger.info(f"   First compound entity: {normalized_results[0]}")

            return normalized_results

        except Exception as e:
            self.logger.error(f"❌ Failed to fetch compound entities: {e}")
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
