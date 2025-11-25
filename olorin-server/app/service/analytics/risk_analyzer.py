"""
Risk Analyzer for database-based fraud detection analytics.
Analyzes transaction data to identify high-risk entities.
Supports both Snowflake and PostgreSQL via database provider abstraction.
"""

import os
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from app.service.logging import get_bridge_logger
from app.service.agent.tools.database_tool import get_database_provider
from app.service.agent.tools.snowflake_tool.schema_constants import (
    PAID_AMOUNT_VALUE_IN_CURRENCY, IP, IP_COUNTRY_CODE, MODEL_SCORE,
    IS_FRAUD_TX, EMAIL, DEVICE_ID, TX_DATETIME, is_valid_column,
    get_required_env_var
)

logger = get_bridge_logger(__name__)


class RiskAnalyzer:
    """
    Analyzes transaction risk using Snowflake data.
    
    CRITICAL: When grouping by IP addresses, this analyzer automatically excludes
    ALL private/internal IP addresses (RFC 1918, loopback, link-local) and only
    returns EXTERNAL/PUBLIC IP addresses to ensure investigations focus on 
    meaningful external threats rather than internal network activity.
    
    IP Filtering Rules:
    - Excludes: 10.x.x.x, 172.16-31.x.x, 192.168.x.x, 127.x.x.x, 169.254.x.x
    - Excludes: IPv6 link-local (fe80::/10) and unique local (fc00::/7, fd00::/8)
    - Excludes: Invalid IPs (0.0.0.0, ::, localhost, empty, etc.)
    - Only includes: Public IPv4 ranges and IPv6 global unicast (2000::/3)
    """
    
    def __init__(self):
        """Initialize the risk analyzer with database provider abstraction."""
        # Use database provider abstraction - respects DATABASE_PROVIDER from .env
        db_provider = os.getenv('DATABASE_PROVIDER', 'snowflake')
        self.client = get_database_provider(db_provider)
        logger.info(f"RiskAnalyzer initialized with {db_provider.upper()} provider")
        self._load_configuration()
        self._cache = {}
        self._cache_timestamp = None
        self._cache_ttl = 300  # 5 minutes cache
    
    def _load_configuration(self):
        """Load analytics configuration from environment."""
        # Default configuration from .env (single source of truth)
        # Read analyzer time window in hours (ANALYZER_TIME_WINDOW_HOURS)
        self.default_time_window_hours = int(os.getenv('ANALYZER_TIME_WINDOW_HOURS', '24'))
        self.default_time_window = f"{self.default_time_window_hours}h"  # For display
        
        self.default_group_by = os.getenv('ANALYTICS_DEFAULT_GROUP_BY', 'email')
        self.default_top_percentage = float(os.getenv('ANALYTICS_DEFAULT_TOP_PERCENTAGE', '10'))
        self.cache_ttl = int(os.getenv('ANALYTICS_CACHE_TTL', '300'))
        # Maximum lookback in months (default: 6 months) - ANALYZER_END_OFFSET_MONTHS
        self.max_lookback_months = int(os.getenv('ANALYZER_END_OFFSET_MONTHS', '6'))
        
        logger.info(f"Risk Analyzer configured: time_window={self.default_time_window}, "
                   f"group_by={self.default_group_by}, top={self.default_top_percentage}%, "
                   f"max_lookback_months={self.max_lookback_months}")
    
    def _validate_column_name(self, column_name: str) -> str:
        """
        Validate column name against the database schema.

        Args:
            column_name: Column name to validate

        Returns:
            Validated column name in uppercase

        Raises:
            ValueError: If column name is not found in schema
        """
        if not column_name:
            raise ValueError("Column name cannot be empty")

        column_upper = column_name.upper()
        if not is_valid_column(column_upper):
            raise ValueError(f"Invalid column '{column_name}' - not found in database schema. Valid columns must match the 333-column schema definition.")

        return column_upper

    def _parse_time_window(self, time_window: str) -> int:
        """
        Parse time window string to hours.
        
        Args:
            time_window: Time window string (e.g., '24h', '14d', '30d')
            
        Returns:
            Number of hours
        """
        time_window = time_window.lower()
        
        if time_window.endswith('h'):
            return int(time_window[:-1])
        elif time_window.endswith('d'):
            return int(time_window[:-1]) * 24
        elif time_window.endswith('w'):
            return int(time_window[:-1]) * 24 * 7
        else:
            # Default to hours if no suffix
            return int(time_window)
    
    def _build_approved_filter(self, decision_col: str, db_provider: str) -> str:
        """
        Build case-insensitive APPROVED filter.
        
        Args:
            decision_col: Decision column name
            db_provider: Database provider ('snowflake' or 'postgresql')
            
        Returns:
            SQL filter expression for approved transactions
        """
        if db_provider == 'snowflake':
            # Use UPPER() for case-insensitive matching (handles 'Approved', 'APPROVED', etc.)
            return f"UPPER({decision_col}) = 'APPROVED'"
        else:
            # PostgreSQL also supports UPPER()
            return f"UPPER({decision_col}) = 'APPROVED'"
    
    def _is_cache_valid(self) -> bool:
        """Check if cache is still valid."""
        if not self._cache_timestamp:
            return False
        
        age = (datetime.now() - self._cache_timestamp).total_seconds()
        return age < self._cache_ttl
    
    async def get_top_risk_entities(
        self,
        time_window: Optional[str] = None,
        group_by: Optional[str] = None,
        top_percentage: Optional[float] = None,
        force_refresh: bool = False
    ) -> Dict[str, Any]:
        """
        Get top risk entities based on risk-weighted transaction value.
        
        Args:
            time_window: Time window to analyze (e.g., '24h', '14d')
            group_by: Field to group by (e.g., 'email', 'device_id')
            top_percentage: Top percentage to return (e.g., 10 for top 10%)
            force_refresh: Force refresh bypassing cache
            
        Returns:
            Dictionary with analysis results
        """
        # Use defaults if not provided
        # If time_window is None, use pre-parsed hours from configuration
        if time_window is None:
            time_window = self.default_time_window
            hours = self.default_time_window_hours  # Use pre-parsed hours from config
        else:
            # Parse provided time window string
            hours = self._parse_time_window(time_window)
        
        group_by = group_by or self.default_group_by
        top_percentage = top_percentage or self.default_top_percentage
        
        # Check cache unless force refresh
        cache_key = f"{time_window}_{group_by}_{top_percentage}"
        if not force_refresh and self._is_cache_valid() and cache_key in self._cache:
            logger.info(f"Returning cached risk analysis for {cache_key}")
            return self._cache[cache_key]
        
        try:
            logger.info(f"🔄 Starting FRAUD ENTITY ANALYSIS: time_window={time_window}, group_by={group_by}")
            logger.info(f"⏱️ Time window: {time_window} ({hours} hours)")
            logger.info(f"🎯 New pattern: Retrieve ALL entities with APPROVED=TRUE AND IS_FRAUD_TX=1")
            
            # Calculate and log exact window dates
            from datetime import datetime, timedelta
            max_lookback_days = self.max_lookback_months * 30
            window_duration_days = hours // 24
            window_duration_hours = hours % 24
            
            # End date: capped at max_lookback_days ago
            end_date = datetime.utcnow() - timedelta(days=max_lookback_days)
            # Start date: end_date - window_duration
            start_date = end_date - timedelta(days=window_duration_days, hours=window_duration_hours)
            
            logger.info(f"📅 Query window dates: {start_date.strftime('%Y-%m-%d %H:%M:%S')} to {end_date.strftime('%Y-%m-%d %H:%M:%S')} (UTC)")
            
            # Connect to database (PostgreSQL or Snowflake)
            db_provider = os.getenv('DATABASE_PROVIDER', 'snowflake').lower()
            logger.info(f"🔌 Connecting to {db_provider.upper()} database...")
            
            # Log filter details
            decision_col = 'NSURE_LAST_DECISION' if db_provider == 'snowflake' else 'nSure_last_decision'
            fraud_col = 'IS_FRAUD_TX' if db_provider == 'snowflake' else 'is_fraud_tx'
            approved_filter = self._build_approved_filter(decision_col, db_provider)
            logger.info(f"🔍 Query filters: {approved_filter} AND {fraud_col}=1 (APPROVED FRAUD ONLY)")

            # Both providers use sync connect() with lazy initialization
            # SnowflakeProvider.connect() doesn't take arguments - it uses environment variables
            # PostgreSQL reads from config, no args needed
            self.client.connect()

            logger.info(f"✅ {db_provider.upper()} connection initialized (lazy connection)")

            # Build and execute query
            logger.info(f"🏗️ Building risk query for {group_by} filtering...")
            query = self._build_risk_query(hours, group_by, top_percentage)
            logger.info(f"🔍 Executing {db_provider.upper()} query for {group_by} filtering:")
            logger.info(f"📝 Full SQL Query:")
            logger.info(f"{query}")
            
            # Add diagnostic query to check if there's any data in the date range
            logger.info(f"🔍 Running diagnostic query to check data availability...")
            max_lookback_days = self.max_lookback_months * 30
            window_duration_days = hours // 24
            window_duration_hours = hours % 24
            datetime_col = 'TX_DATETIME' if db_provider == 'snowflake' else 'tx_datetime'
            decision_col = 'NSURE_LAST_DECISION' if db_provider == 'snowflake' else 'nSure_last_decision'
            approved_filter_expr = self._build_approved_filter(decision_col, db_provider)
            # Validate group_by column name for use in diagnostic queries
            validated_group_by = self._validate_column_name(group_by)
            
            # Build same date filter as main query
            if db_provider == 'snowflake':
                end_timestamp_expr = f"DATEADD(day, -{max_lookback_days}, CURRENT_TIMESTAMP())"
                start_timestamp_expr = f"DATEADD(day, -{window_duration_days}, DATEADD(hour, -{window_duration_hours}, {end_timestamp_expr}))"
                date_filter_diag = f"{datetime_col} >= {start_timestamp_expr} AND {datetime_col} < {end_timestamp_expr}"
            else:
                date_filter_diag = f"{datetime_col} >= CURRENT_TIMESTAMP() - INTERVAL '{max_lookback_days + window_duration_days} days' - INTERVAL '{window_duration_hours} hours' AND {datetime_col} < CURRENT_TIMESTAMP() - INTERVAL '{max_lookback_days} days'"
            
            logger.info(f"🔍 Diagnostic date filter SQL:")
            logger.info(f"   {date_filter_diag}")
            
            diagnostic_query = f"""
            SELECT 
                COUNT(*) as total_transactions,
                COUNT(CASE WHEN {approved_filter_expr} THEN 1 END) as approved_count,
                MIN({datetime_col}) as earliest_transaction,
                MAX({datetime_col}) as latest_transaction,
                COUNT(DISTINCT {validated_group_by}) as unique_entities
            FROM {self.client.get_full_table_name()}
            WHERE {date_filter_diag}
            """
            logger.info(f"🔍 Full diagnostic query:")
            logger.info(f"{diagnostic_query}")
            try:
                diagnostic_results = await self.client.execute_query_async(diagnostic_query)
                if diagnostic_results:
                    diag = diagnostic_results[0]
                    logger.info(f"📊 Diagnostic results for filtered date range:")
                    logger.info(f"   Total transactions in date range: {diag.get('total_transactions', 0)}")
                    logger.info(f"   Approved transactions: {diag.get('approved_count', 0)}")
                    logger.info(f"   Date range: {diag.get('earliest_transaction')} to {diag.get('latest_transaction')}")
                    logger.info(f"   Unique {group_by}: {diag.get('unique_entities', 0)}")
                    
                    # If no data in filtered range, check what data exists in the database
                    if diag.get('total_transactions', 0) == 0:
                        logger.warning(f"⚠️ No transactions found in filtered date range. Checking database for available data...")
                        
                        # First, verify table exists and check row count
                        table_name = self.client.get_full_table_name()
                        logger.info(f"🔍 Checking table: {table_name}")
                        
                        # Check if table exists and get approximate row count (using sampling to avoid timeout)
                        # Use BERNOULLI sampling for Snowflake (more efficient than SYSTEM)
                        if db_provider == 'snowflake':
                            # Snowflake uses BERNOULLI sampling, not TABLESAMPLE (percent)
                            table_check_query = f"""
                            SELECT COUNT(*) * 100 as approximate_row_count
                            FROM {table_name} TABLESAMPLE BERNOULLI (1)
                            """
                        else:
                            # PostgreSQL uses TABLESAMPLE SYSTEM
                            table_check_query = f"""
                            SELECT COUNT(*) * 100 as approximate_row_count
                            FROM {table_name} TABLESAMPLE SYSTEM (1)
                            """
                        try:
                            table_check_results = await self.client.execute_query_async(table_check_query)
                            if table_check_results:
                                approximate_count = table_check_results[0].get('approximate_row_count', 0)
                                logger.info(f"📊 Table {table_name} exists (approximate row count: ~{approximate_count:,} rows)")
                        except Exception as table_check_e:
                            # If sampling fails, just verify table exists
                            logger.debug(f"Sampling not available, verifying table exists: {table_check_e}")
                            try:
                                simple_check = f"SELECT 1 FROM {table_name} LIMIT 1"
                                await self.client.execute_query_async(simple_check)
                                logger.info(f"📊 Table {table_name} exists")
                            except Exception as simple_e:
                                logger.error(f"❌ Error checking table {table_name}: {simple_e}")
                                logger.error(f"   This might indicate the table doesn't exist or there's a permissions issue")
                        
                        # Optimize database-wide query by limiting to last 6 months to avoid full table scan
                        # This prevents timeouts on large tables (186M+ rows)
                        max_lookback_days = self.max_lookback_months * 30
                        db_range_query = f"""
                        SELECT 
                            COUNT(*) as total_all_transactions,
                            COUNT(CASE WHEN {approved_filter_expr} THEN 1 END) as total_approved,
                            MIN({datetime_col}) as db_earliest_transaction,
                            MAX({datetime_col}) as db_latest_transaction,
                            COUNT(DISTINCT {validated_group_by}) as total_unique_entities
                        FROM {table_name}
                        WHERE {datetime_col} >= DATEADD(day, -{max_lookback_days}, CURRENT_TIMESTAMP())
                        """
                        logger.info(f"🔍 Database-wide query (limited to last {max_lookback_days} days to avoid timeout):")
                        logger.info(f"{db_range_query}")
                        try:
                            db_range_results = await self.client.execute_query_async(db_range_query)
                        except Exception as db_range_error:
                            logger.warning(f"⚠️ Database-wide statistics query failed (non-critical): {db_range_error}")
                            logger.warning("   Continuing without database-wide statistics...")
                            db_range_results = None
                        if db_range_results:
                            db_info = db_range_results[0]
                            logger.info(f"📊 Database-wide statistics:")
                            logger.info(f"   Total transactions in database: {db_info.get('total_all_transactions', 0)}")
                            logger.info(f"   Total approved transactions: {db_info.get('total_approved', 0)}")
                            logger.info(f"   Database date range: {db_info.get('db_earliest_transaction')} to {db_info.get('db_latest_transaction')}")
                            logger.info(f"   Total unique {group_by}: {db_info.get('total_unique_entities', 0)}")
                            
                            # If database has data but filtered query returned 0, check which filter is excluding data
                            if db_info.get('total_all_transactions', 0) > 0:
                                logger.info(f"🔍 Analyzing which filter is excluding data...")
                                
                                # Check 1: Data WITHOUT 6-month constraint (but WITH APPROVED filter)
                                # Limit to last 12 months to avoid timeout on large tables
                                no_date_filter_query = f"""
                                SELECT 
                                    COUNT(*) as transactions_no_date_filter,
                                    MIN({datetime_col}) as earliest_no_date,
                                    MAX({datetime_col}) as latest_no_date
                                FROM {table_name}
                                WHERE {approved_filter_expr}
                                    AND {validated_group_by} IS NOT NULL
                                    AND MODEL_SCORE IS NOT NULL
                                    AND {datetime_col} >= DATEADD(day, -365, CURRENT_TIMESTAMP())
                                """
                                try:
                                    no_date_results = await self.client.execute_query_async(no_date_filter_query)
                                    if no_date_results:
                                        no_date_info = no_date_results[0]
                                        logger.info(f"📊 Data WITHOUT 6-month constraint (WITH APPROVED filter, last 12 months):")
                                        logger.info(f"   Transactions: {no_date_info.get('transactions_no_date_filter', 0)}")
                                        logger.info(f"   Date range: {no_date_info.get('earliest_no_date')} to {no_date_info.get('latest_no_date')}")
                                except Exception as e:
                                    logger.warning(f"⚠️ Error checking data without date filter: {e}")
                                
                                # Check 2: Data WITHOUT APPROVED filter (but WITH 6-month constraint)
                                no_approved_filter_query = f"""
                                SELECT 
                                    COUNT(*) as transactions_no_approved_filter,
                                    COUNT(CASE WHEN {approved_filter_expr} THEN 1 END) as approved_count,
                                    COUNT(CASE WHEN NOT ({approved_filter_expr}) THEN 1 END) as non_approved_count,
                                    MIN({datetime_col}) as earliest_no_approved,
                                    MAX({datetime_col}) as latest_no_approved
                                FROM {table_name}
                                WHERE {date_filter_diag}
                                    AND {validated_group_by} IS NOT NULL
                                    AND MODEL_SCORE IS NOT NULL
                                """
                                try:
                                    no_approved_results = await self.client.execute_query_async(no_approved_filter_query)
                                    if no_approved_results:
                                        no_approved_info = no_approved_results[0]
                                        logger.info(f"📊 Data WITH 6-month constraint (WITHOUT APPROVED filter):")
                                        logger.info(f"   Total transactions: {no_approved_info.get('transactions_no_approved_filter', 0)}")
                                        logger.info(f"   Approved: {no_approved_info.get('approved_count', 0)}")
                                        logger.info(f"   Non-approved: {no_approved_info.get('non_approved_count', 0)}")
                                        logger.info(f"   Date range: {no_approved_info.get('earliest_no_approved')} to {no_approved_info.get('latest_no_approved')}")
                                except Exception as e:
                                    logger.warning(f"⚠️ Error checking data without APPROVED filter: {e}")
                                
                                # Check 3: Data WITHOUT both filters
                                no_filters_query = f"""
                                SELECT 
                                    COUNT(*) as transactions_no_filters,
                                    MIN({datetime_col}) as earliest_no_filters,
                                    MAX({datetime_col}) as latest_no_filters
                                FROM {table_name}
                                WHERE {validated_group_by} IS NOT NULL
                                    AND MODEL_SCORE IS NOT NULL
                                """
                                try:
                                    no_filters_results = await self.client.execute_query_async(no_filters_query)
                                    if no_filters_results:
                                        no_filters_info = no_filters_results[0]
                                        logger.info(f"📊 Data WITHOUT both filters:")
                                        logger.info(f"   Transactions: {no_filters_info.get('transactions_no_filters', 0)}")
                                        logger.info(f"   Date range: {no_filters_info.get('earliest_no_filters')} to {no_filters_info.get('latest_no_filters')}")
                                except Exception as e:
                                    logger.warning(f"⚠️ Error checking data without filters: {e}")
                            
                            # Log the calculated date range
                            logger.info(f"📅 Calculated query date range:")
                            logger.info(f"   Start: {start_date.strftime('%Y-%m-%d %H:%M:%S')} UTC")
                            logger.info(f"   End: {end_date.strftime('%Y-%m-%d %H:%M:%S')} UTC")
                            
                            # Check if there's any overlap
                            db_latest = db_info.get('db_latest_transaction')
                            db_earliest = db_info.get('db_earliest_transaction')
                            if db_latest and db_earliest:
                                logger.info(f"   Database date range: {db_earliest} to {db_latest}")
                                logger.info(f"   Query date range: {start_date.strftime('%Y-%m-%d %H:%M:%S')} to {end_date.strftime('%Y-%m-%d %H:%M:%S')} UTC")
                                if isinstance(db_latest, str) and isinstance(db_earliest, str):
                                    from datetime import datetime as dt
                                    try:
                                        db_latest_dt = dt.fromisoformat(db_latest.replace('Z', '+00:00'))
                                        db_earliest_dt = dt.fromisoformat(db_earliest.replace('Z', '+00:00'))
                                        
                                        # Check if query range overlaps with database range
                                        # Query range: [start_date, end_date)
                                        # Database range: [db_earliest, db_latest]
                                        # Overlap exists if: start_date < db_latest AND end_date > db_earliest
                                        
                                        if end_date <= db_earliest_dt:
                                            logger.warning(f"⚠️ Query end date ({end_date.date()}) is BEFORE database earliest transaction ({db_earliest_dt.date()})")
                                            logger.warning(f"   The 6-month lookback window ({end_date.date()}) is too far in the past!")
                                            logger.warning(f"   Database only has data from {db_earliest_dt.date()} onwards")
                                            logger.warning(f"   Consider reducing ANALYTICS_MAX_LOOKBACK_MONTHS or checking if older data exists")
                                        elif start_date >= db_latest_dt:
                                            logger.warning(f"⚠️ Query start date ({start_date.date()}) is AFTER database latest transaction ({db_latest_dt.date()})")
                                            logger.warning(f"   This shouldn't happen - query is looking in the future!")
                                        elif end_date > db_latest_dt:
                                            logger.info(f"ℹ️  Query end date ({end_date.date()}) is AFTER database latest transaction ({db_latest_dt.date()})")
                                            logger.info(f"   Query range partially overlaps with database range")
                                            logger.info(f"   Query will only return data up to {db_latest_dt.date()}")
                                        else:
                                            logger.info(f"✅ Query date range overlaps with database date range")
                                            logger.info(f"   Overlap: {max(start_date, db_earliest_dt).date()} to {min(end_date, db_latest_dt).date()}")
                                    except Exception as parse_e:
                                        logger.debug(f"Could not parse dates for comparison: {parse_e}")
            except Exception as diag_e:
                logger.warning(f"⚠️ Diagnostic query failed: {diag_e}")
                import traceback
                logger.debug(f"Diagnostic error traceback: {traceback.format_exc()}")
            
            logger.info(f"⚡ Sending query to {db_provider.upper()}...")
            # execute_query_async properly awaits without blocking
            try:
                results = await self.client.execute_query_async(query)
                logger.info(f"📊 Query returned {len(results) if results else 0} rows")
            except RuntimeError as e:
                error_msg = str(e)
                # Check for schema authorization errors
                if "does not exist or not authorized" in error_msg or "02000" in error_msg:
                    schema = os.getenv('SNOWFLAKE_SCHEMA', 'DBT_PROD')
                    database = os.getenv('SNOWFLAKE_DATABASE', 'DBT')
                    full_schema = f"{database}.{schema}"
                    logger.error(f"❌ Schema authorization error: Schema '{full_schema}' does not exist or user does not have access")
                    logger.error(f"   Please verify:")
                    logger.error(f"   1. Schema '{full_schema}' exists in Snowflake")
                    logger.error(f"   2. User has USAGE privilege on schema '{full_schema}'")
                    logger.error(f"   3. User has SELECT privilege on table in schema '{full_schema}'")
                    logger.error(f"   4. Environment variables SNOWFLAKE_DATABASE and SNOWFLAKE_SCHEMA are set correctly")
                    logger.error(f"   Current values: SNOWFLAKE_DATABASE={database}, SNOWFLAKE_SCHEMA={schema}")
                    return {
                        "status": "error",
                        "error": f"Schema authorization error: Schema '{full_schema}' does not exist or not authorized",
                        "error_type": "schema_authorization_error",
                        "error_details": {
                            "schema": full_schema,
                            "database": database,
                            "schema_name": schema,
                            "suggestion": "Verify schema exists and user has USAGE and SELECT privileges"
                        },
                        "entities": [],
                        "summary": f"Risk analysis failed: Schema '{full_schema}' authorization error",
                        "timestamp": datetime.now().isoformat()
                    }
                # Re-raise other RuntimeErrors
                raise
            
            # Process results
            analysis = self._process_results(results, time_window, group_by, top_percentage)
            
            # Cascading fallback: Try progressively longer time windows if no entities found
            # Fallback sequence: 7d -> 14d -> 30d -> 60d -> 90d
            entities_count = len(analysis.get('entities', []))
            current_hours = hours  # Use already-parsed hours value
            final_query_rows = len(results)  # Track final query row count for logging
            
            # Define fallback time windows in order
            fallback_windows = [
                ('14d', self._parse_time_window('14d')),
                ('30d', self._parse_time_window('30d')),
                ('60d', self._parse_time_window('60d')),
                ('90d', self._parse_time_window('90d'))
            ]
            
            fallback_attempted = False
            original_time_window = time_window
            
            # Try each fallback window if no entities found and current window is smaller
            for fallback_window, fallback_hours in fallback_windows:
                if entities_count == 0 and current_hours < fallback_hours:
                    # Calculate and log exact fallback window dates
                    from datetime import datetime, timedelta
                    max_lookback_days = self.max_lookback_months * 30
                    fallback_window_duration_days = fallback_hours // 24
                    fallback_window_duration_hours = fallback_hours % 24
                    
                    # End date: capped at max_lookback_days ago
                    fallback_end_date = datetime.utcnow() - timedelta(days=max_lookback_days)
                    # Start date: end_date - window_duration
                    fallback_start_date = fallback_end_date - timedelta(days=fallback_window_duration_days, hours=fallback_window_duration_hours)
                    
                    logger.info(f"🔄 No entities found in {time_window} ({current_hours}h), trying {fallback_window} fallback window...")
                    logger.info(f"📅 Fallback window dates: {fallback_start_date.strftime('%Y-%m-%d %H:%M:%S')} to {fallback_end_date.strftime('%Y-%m-%d %H:%M:%S')} (UTC)")
                    fallback_attempted = True
                    
                    # Try fallback window
                    extended_query = self._build_risk_query(fallback_hours, group_by, top_percentage)
                    logger.info(f"📝 Full Fallback SQL Query:")
                    logger.info(f"{extended_query}")
                    extended_results = await self.client.execute_query_async(extended_query)
                    final_query_rows = len(extended_results) if extended_results else 0
                    
                    if extended_results and len(extended_results) > 0:
                        logger.info(f"✅ Found {len(extended_results)} entities in {fallback_window} window")
                        analysis = self._process_results(extended_results, fallback_window, group_by, top_percentage)
                        analysis['fallback_used'] = True
                        analysis['original_time_window'] = original_time_window
                        analysis['fallback_time_window'] = fallback_window
                        entities_count = len(analysis.get('entities', []))
                        time_window = fallback_window  # Update for next iteration check
                        current_hours = fallback_hours
                        break  # Success, stop trying fallbacks
                    else:
                        logger.info(f"⚠️ No entities found in {fallback_window} window, trying next fallback...")
                        time_window = fallback_window  # Update for next iteration check
                        current_hours = fallback_hours
            
            if fallback_attempted and entities_count == 0:
                logger.critical(f"🚨 CRITICAL: No entities found even after trying all fallback windows (up to 90d) for {group_by}")
                logger.critical(f"🚨 CRITICAL: No data to investigate - terminating investigation")
                analysis['status'] = 'critical_no_data'
                analysis['fallback_used'] = False
                analysis['original_time_window'] = original_time_window
                analysis['message'] = f'CRITICAL: No entities found in any time window (7d, 14d, 30d, 60d, 90d) for {group_by}. Nothing to investigate.'
                return analysis
            
            # Update cache
            self._cache[cache_key] = analysis
            self._cache_timestamp = datetime.now()
            
            # Log actual entities found (not raw query results which may be filtered)
            entities_count = len(analysis.get('entities', []))
            logger.info(f"✅ Risk analysis completed: {entities_count} entities identified (from {final_query_rows} query rows)")
            
            # Log top 3 entities with transaction count and risk score
            entities = analysis.get('entities', [])
            if entities:
                logger.info("📊 Top 3 riskiest entities:")
                for i, entity in enumerate(entities[:3], 1):
                    entity_id = entity.get('entity', 'N/A')
                    tx_count = entity.get('transaction_count', 0)
                    risk_score = entity.get('risk_score', entity.get('avg_risk_score', 0))
                    logger.info(f"   {i}. Entity: {entity_id} | Transactions: {tx_count} | Risk Score: {risk_score:.3f}")
            
            # If query returned rows but no entities after processing, log diagnostic info
            if len(results) > 0 and entities_count == 0:
                logger.warning(f"⚠️ Query returned {len(results)} rows but 0 entities after processing. "
                             f"This may indicate filtering/ranking issues. Group by: {group_by}, "
                             f"Top percentage: {top_percentage}%")
            
            return analysis
            
        except Exception as e:
            logger.error(f"❌ Risk analysis failed: {e}")
            logger.error(f"🔍 Exception type: {type(e).__name__}")
            import traceback
            logger.error(f"📜 Full traceback: {traceback.format_exc()}")
            return {
                'error': str(e),
                'status': 'failed',
                'timestamp': datetime.now().isoformat(),
                'exception_type': type(e).__name__
            }
        finally:
            try:
                # Use async disconnect if available (SnowflakeProvider), otherwise use sync disconnect
                if hasattr(self.client, 'disconnect_async'):
                    await self.client.disconnect_async()
                elif hasattr(self.client, 'disconnect'):
                    # If disconnect is async, await it; if sync, just call it
                    disconnect_method = getattr(self.client, 'disconnect')
                    if callable(disconnect_method):
                        import inspect
                        if inspect.iscoroutinefunction(disconnect_method):
                            await disconnect_method()
                        else:
                            disconnect_method()
            except Exception as e:
                logger.debug(f"Error during disconnect (non-critical): {e}")
                pass
    
    def _build_risk_query(self, hours: int, group_by: str, top_percentage: float) -> str:
        """
        Build SQL query for risk analysis.
        
        Args:
            hours: Number of hours to look back
            group_by: Field to group by
            top_percentage: Top percentage to return
            
        Returns:
            SQL query string
        """
        # Convert percentage to decimal
        top_decimal = top_percentage / 100.0

        # Validate column name against schema - SCHEMA-LOCKED MODE COMPLIANCE
        validated_column = self._validate_column_name(group_by)

        # Add IP filtering condition if grouping by the IP column
        ip_filter = ""
        if validated_column == IP:
            # Get IP filtering patterns from environment configuration
            excluded_patterns = os.getenv('EXCLUDED_IP_PATTERNS', '10.%,192.168.%,172.16.%,172.17.%,172.18.%,172.19.%,172.2_.%,172.30.%,172.31.%,127.%,169.254.%').split(',')
            excluded_values = os.getenv('EXCLUDED_IP_VALUES', ',,0.0.0.0,::,localhost,unknown').split(',')
            risk_percentile = float(os.getenv('IP_RISK_PERCENTILE', '0.1'))

            # Build IP exclusion filters from configuration
            like_filters = ' '.join([f"AND {IP} NOT LIKE '{pattern.strip()}'" for pattern in excluded_patterns if pattern.strip()])
            quoted_values = [f"'{val.strip()}'" for val in excluded_values if val.strip()]
            value_filters = f"AND {IP} NOT IN ({', '.join(quoted_values)})"

            ip_filter = f"""
                -- Filter out private/internal IP ranges based on configuration
                {like_filters}
                {value_filters}
                -- Only include external/public IP addresses with real activity
                AND MODEL_SCORE > (SELECT PERCENTILE_CONT({risk_percentile}) WITHIN GROUP (ORDER BY MODEL_SCORE) FROM {self.client.get_full_table_name()} WHERE MODEL_SCORE > 0)
            """

        column_name = validated_column
        
        # Get column names and date syntax based on database provider
        db_provider = os.getenv('DATABASE_PROVIDER', 'snowflake').lower()
        datetime_col = 'TX_DATETIME' if db_provider == 'snowflake' else 'tx_datetime'
        fraud_col = 'IS_FRAUD_TX' if db_provider == 'snowflake' else 'is_fraud_tx'
        decision_col = 'NSURE_LAST_DECISION' if db_provider == 'snowflake' else 'nSure_last_decision'
        approved_filter_expr = self._build_approved_filter(decision_col, db_provider)
        
        # Calculate max lookback date (6 months before current date)
        max_lookback_days = self.max_lookback_months * 30  # Approximate months to days
        
        # Database-specific date filtering syntax
        # Cap the END date at max_lookback_months before current date
        # Window: end_date = min(current_date, current_date - max_lookback_days) = current_date - max_lookback_days
        #         start_date = end_date - window_duration
        # Example: If today is Nov 15 and window is 30 days, end = May 15, start = April 15
        window_duration_days = hours // 24
        window_duration_hours = hours % 24
        
        if db_provider == 'snowflake':
            # End date: capped at max_lookback_days ago (cannot be later than 6 months ago)
            # Start date: end_date - window_duration
            # Simplify: Calculate end timestamp first, then subtract window duration
            end_timestamp_expr = f"DATEADD(day, -{max_lookback_days}, CURRENT_TIMESTAMP())"
            start_timestamp_expr = f"DATEADD(day, -{window_duration_days}, DATEADD(hour, -{window_duration_hours}, {end_timestamp_expr}))"
            date_filter = f"{datetime_col} >= {start_timestamp_expr} AND {datetime_col} < {end_timestamp_expr}"
        else:
            # End date: capped at max_lookback_days ago
            # Start date: end_date - window_duration
            date_filter = f"{datetime_col} >= CURRENT_TIMESTAMP() - INTERVAL '{max_lookback_days + window_duration_days} days' - INTERVAL '{window_duration_hours} hours' AND {datetime_col} < CURRENT_TIMESTAMP() - INTERVAL '{max_lookback_days} days'"

        query = f"""
        SELECT
            {column_name} as entity,
            COUNT(*) as transaction_count,
            SUM({PAID_AMOUNT_VALUE_IN_CURRENCY}) as total_amount,
            AVG({MODEL_SCORE}) as avg_risk_score,
            SUM({MODEL_SCORE} * {PAID_AMOUNT_VALUE_IN_CURRENCY}) * COUNT(*) as risk_weighted_value,
            MAX(MODEL_SCORE) as max_risk_score,
            MIN(MODEL_SCORE) as min_risk_score,
            SUM(CASE WHEN {fraud_col} = 1 THEN 1 ELSE 0 END) as fraud_count,
            SUM(CASE WHEN UPPER({decision_col}) = 'REJECTED' THEN 1 ELSE 0 END) as rejected_count,
            MAX({datetime_col}) as last_transaction,
            MIN({datetime_col}) as first_transaction
        FROM {self.client.get_full_table_name()}
        WHERE {date_filter}
            AND {column_name} IS NOT NULL
            AND {approved_filter_expr}
            AND {fraud_col} = 1{ip_filter}
        GROUP BY {column_name}
        ORDER BY fraud_count DESC, transaction_count DESC
        """
        
        return query
    
    def _process_results(
        self, 
        results: List[Dict[str, Any]], 
        time_window: str,
        group_by: str,
        top_percentage: float
    ) -> Dict[str, Any]:
        """
        Process query results into structured analysis.
        
        Args:
            results: Raw query results
            time_window: Time window used
            group_by: Grouping field used
            top_percentage: Top percentage used
            
        Returns:
            Processed analysis dictionary
        """
        if not results:
            return {
                'status': 'success',
                'message': 'No entities found in specified time window',
                'entities': [],
                'summary': {
                    'total_entities': 0,
                    'time_window': time_window,
                    'group_by': group_by,
                    'top_percentage': top_percentage
                },
                'timestamp': datetime.now().isoformat()
            }
        
        # Calculate summary statistics (handle uppercase from Snowflake)
        total_risk_value = sum((r.get('RISK_WEIGHTED_VALUE') or r.get('risk_weighted_value') or 0) for r in results)
        total_transactions = sum((r.get('TRANSACTION_COUNT') or r.get('transaction_count') or 0) for r in results)
        total_amount = sum((r.get('TOTAL_AMOUNT') or r.get('total_amount') or 0) for r in results)
        total_fraud = sum((r.get('FRAUD_COUNT') or r.get('fraud_count') or 0) for r in results)
        
        # Format entities for response (Snowflake returns uppercase column names)
        entities = []
        for r in results:
            entities.append({
                'entity': r.get('ENTITY') or r.get('entity'),
                'risk_rank': r.get('RISK_RANK') or r.get('risk_rank'),
                'risk_score': round((r.get('AVG_RISK_SCORE') or r.get('avg_risk_score') or 0), 3),
                'risk_weighted_value': round((r.get('RISK_WEIGHTED_VALUE') or r.get('risk_weighted_value') or 0), 2),
                'transaction_count': r.get('TRANSACTION_COUNT') or r.get('transaction_count'),
                'total_amount': round((r.get('TOTAL_AMOUNT') or r.get('total_amount') or 0), 2),
                'fraud_count': (r.get('FRAUD_COUNT') or r.get('fraud_count') or 0),
                'rejected_count': (r.get('REJECTED_COUNT') or r.get('rejected_count') or 0),
                'max_risk_score': round((r.get('MAX_RISK_SCORE') or r.get('max_risk_score') or 0), 3),
                'percentile': round((r.get('PERCENTILE') or r.get('percentile') or 0) * 100, 1),
                'last_transaction': r.get('LAST_TRANSACTION') or r.get('last_transaction'),
                'first_transaction': r.get('FIRST_TRANSACTION') or r.get('first_transaction')
            })
        
        return {
            'status': 'success',
            'entities': entities,
            'summary': {
                'total_entities': len(entities),
                'total_risk_value': round(total_risk_value, 2),
                'total_transactions': total_transactions,
                'total_amount': round(total_amount, 2),
                'total_fraud': total_fraud,
                'fraud_rate': round(total_fraud / total_transactions * 100, 2) if total_transactions > 0 else 0,
                'time_window': time_window,
                'group_by': group_by,
                'top_percentage': top_percentage
            },
            'timestamp': datetime.now().isoformat()
        }
    
    async def analyze_entity(
        self,
        entity_value: str,
        entity_type: str = 'email',
        time_window: str = '30d'
    ) -> Dict[str, Any]:
        """
        Analyze a specific entity's risk profile.
        
        Args:
            entity_value: The entity value to analyze
            entity_type: Type of entity (email, device_id, etc.)
            time_window: Time window for analysis
            
        Returns:
            Detailed entity analysis
        """
        try:
            # Validate entity_type against schema - CRITICAL SECURITY FIX
            validated_entity_type = self._validate_column_name(entity_type)

            hours = self._parse_time_window(time_window)

            # Connect to database (PostgreSQL or Snowflake)
            db_provider = os.getenv('DATABASE_PROVIDER', 'snowflake')

            # Both providers use sync connect() with lazy initialization
            # SnowflakeProvider.connect() doesn't take arguments - it uses environment variables
            # PostgreSQL reads from config, no args needed
            self.client.connect()

            # Safely escape entity_value to prevent SQL injection
            escaped_entity_value = entity_value.replace("'", "''")  # SQL standard escape for single quotes

            # Get column names and date syntax based on database provider
            datetime_col = 'TX_DATETIME' if db_provider == 'snowflake' else 'tx_datetime'
            fraud_col = 'IS_FRAUD_TX' if db_provider == 'snowflake' else 'is_fraud_tx'
            decision_col = 'NSURE_LAST_DECISION' if db_provider == 'snowflake' else 'nSure_last_decision'
            approved_filter_expr = self._build_approved_filter(decision_col, db_provider)
            
            # Calculate max lookback date (6 months before current date)
            max_lookback_days = self.max_lookback_months * 30  # Approximate months to days
            
            # Database-specific date filtering syntax
            # Cap the END date at max_lookback_months before current date
            # Window: end_date = current_date - max_lookback_days (capped at 6 months ago)
            #         start_date = end_date - window_duration
            window_duration_days = hours // 24
            window_duration_hours = hours % 24
            
            if db_provider == 'snowflake':
                # End date: capped at max_lookback_days ago
                # Start date: end_date - window_duration
                date_filter = f"{datetime_col} >= DATEADD(day, -{max_lookback_days + window_duration_days}, DATEADD(hour, -{window_duration_hours}, CURRENT_TIMESTAMP())) AND {datetime_col} < DATEADD(day, -{max_lookback_days}, CURRENT_TIMESTAMP())"
            else:
                # End date: capped at max_lookback_days ago
                # Start date: end_date - window_duration
                date_filter = f"{datetime_col} >= CURRENT_TIMESTAMP() - INTERVAL '{max_lookback_days + window_duration_days} days' - INTERVAL '{window_duration_hours} hours' AND {datetime_col} < CURRENT_TIMESTAMP() - INTERVAL '{max_lookback_days} days'"
            
            # Build query with schema-validated column name and properly escaped values
            # Filter out NULL MODEL_SCORE to ensure accurate risk calculations
            # Only include APPROVED transactions
            query = f"""
            SELECT
                COUNT(*) as transaction_count,
                SUM({PAID_AMOUNT_VALUE_IN_CURRENCY}) as total_amount,
                AVG({MODEL_SCORE}) as avg_risk_score,
                MAX({MODEL_SCORE}) as max_risk_score,
                MIN({MODEL_SCORE}) as min_risk_score,
                SUM(CASE WHEN {fraud_col} = 1 THEN 1 ELSE 0 END) as fraud_count,
                SUM(CASE WHEN UPPER({decision_col}) = 'REJECTED' THEN 1 ELSE 0 END) as rejected_count,
                COUNT(DISTINCT MERCHANT_NAME) as unique_merchants,
                COUNT(DISTINCT LAST_FOUR) as unique_cards,
                COUNT(DISTINCT {IP}) as unique_ips,
                COUNT(DISTINCT {DEVICE_ID}) as unique_devices,
                MAX({datetime_col}) as last_transaction,
                MIN({datetime_col}) as first_transaction
            FROM {self.client.get_full_table_name()}
            WHERE {validated_entity_type} = '{escaped_entity_value}'
                AND {date_filter}
                AND {MODEL_SCORE} IS NOT NULL
                AND {approved_filter_expr}
            """

            # Use async query execution to avoid blocking event loop
            results = await self.client.execute_query_async(query)
            
            if not results or results[0].get('transaction_count', 0) == 0:
                return {
                    'status': 'success',
                    'message': f'No transactions found for {entity_type}: {entity_value}',
                    'entity': entity_value,
                    'entity_type': entity_type,
                    'timestamp': datetime.now().isoformat()
                }
            
            r = results[0]
            return {
                'status': 'success',
                'entity': entity_value,
                'entity_type': entity_type,
                'profile': {
                    'transaction_count': r.get('transaction_count'),
                    'total_amount': round(r.get('total_amount', 0), 2),
                    'avg_risk_score': round(r.get('avg_risk_score', 0), 3),
                    'max_risk_score': round(r.get('max_risk_score', 0), 3),
                    'min_risk_score': round(r.get('min_risk_score', 0), 3),
                    'fraud_count': r.get('fraud_count', 0),
                    'rejected_count': r.get('rejected_count', 0),
                    'unique_merchants': r.get('unique_merchants'),
                    'unique_cards': r.get('unique_cards'),
                    'unique_ips': r.get('unique_ips'),
                    'unique_devices': r.get('unique_devices'),
                    'first_transaction': r.get('first_transaction'),
                    'last_transaction': r.get('last_transaction')
                },
                'risk_assessment': self._assess_risk(r),
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Entity analysis failed: {e}")
            return {
                'status': 'failed',
                'error': str(e),
                'entity': entity_value,
                'entity_type': entity_type,
                'timestamp': datetime.now().isoformat()
            }
        finally:
            try:
                # Use async disconnect if available (SnowflakeProvider), otherwise use sync disconnect
                if hasattr(self.client, 'disconnect_async'):
                    await self.client.disconnect_async()
                elif hasattr(self.client, 'disconnect'):
                    # If disconnect is async, await it; if sync, just call it
                    disconnect_method = getattr(self.client, 'disconnect')
                    if callable(disconnect_method):
                        import inspect
                        if inspect.iscoroutinefunction(disconnect_method):
                            await disconnect_method()
                        else:
                            disconnect_method()
            except Exception as e:
                logger.debug(f"Error during disconnect (non-critical): {e}")
                pass

    def _get_dynamic_threshold(self, level: str, current_score: float) -> float:
        """
        Calculate dynamic risk thresholds based on current data distribution.

        Week 4 Phase 2: Replaced hardcoded thresholds with percentile-based calculation.

        Args:
            level: Threshold level ('high', 'medium', or 'low')
            current_score: Current score for context

        Returns:
            Dynamic threshold value (0.0-1.0)
        """
        try:
            from app.service.analytics.threshold_calculator import get_dynamic_risk_threshold

            # Get entity type and merchant category from context if available
            entity_type = getattr(self, '_current_entity_type', None)
            merchant_category = getattr(self, '_current_merchant_category', None)

            # Calculate dynamic threshold from Snowflake data
            threshold = get_dynamic_risk_threshold(
                level=level,
                entity_type=entity_type,
                merchant_category=merchant_category,
                lookback_days=7  # 7-day rolling window
            )

            return threshold

        except Exception as e:
            logger.warning(f"⚠️ Failed to get dynamic threshold for {level}: {e}")
            # Fallback to conservative static thresholds
            if level == 'high':
                return 0.75
            elif level == 'medium':
                return 0.50
            else:
                return 0.25

    def _get_device_threshold(self) -> int:
        """
        Calculate dynamic threshold for suspicious device count.

        Week 4 Phase 2: Replaced hardcoded threshold with 95th percentile from Snowflake.
        """
        try:
            from app.service.analytics.threshold_calculator import get_dynamic_device_threshold

            entity_type = getattr(self, '_current_entity_type', None)

            threshold = get_dynamic_device_threshold(
                entity_type=entity_type,
                lookback_days=7
            )

            return threshold

        except Exception as e:
            logger.warning(f"⚠️ Failed to get dynamic device threshold: {e}")
            return 4  # Conservative fallback

    def _get_card_threshold(self) -> int:
        """
        Calculate dynamic threshold for suspicious card count.

        Week 4 Phase 2: Replaced hardcoded threshold with 95th percentile from Snowflake.
        """
        try:
            from app.service.analytics.threshold_calculator import get_dynamic_card_threshold

            entity_type = getattr(self, '_current_entity_type', None)

            threshold = get_dynamic_card_threshold(
                entity_type=entity_type,
                lookback_days=7
            )

            return threshold

        except Exception as e:
            logger.warning(f"⚠️ Failed to get dynamic card threshold: {e}")
            return 3  # Conservative fallback

    def _get_velocity_threshold(self) -> int:
        """
        Calculate dynamic threshold for suspicious transaction velocity.

        Week 4 Phase 2: Replaced hardcoded threshold with 99th percentile from Snowflake.
        """
        try:
            from app.service.analytics.threshold_calculator import get_dynamic_velocity_threshold

            entity_type = getattr(self, '_current_entity_type', None)

            threshold = get_dynamic_velocity_threshold(
                entity_type=entity_type,
                lookback_days=7
            )

            return threshold

        except Exception as e:
            logger.warning(f"⚠️ Failed to get dynamic velocity threshold: {e}")
            return 25  # Conservative fallback

    def _assess_risk(self, profile: Dict[str, Any]) -> Dict[str, Any]:
        """
        Assess risk level based on entity profile.
        
        Args:
            profile: Entity profile data
            
        Returns:
            Risk assessment dictionary
        """
        avg_risk = profile.get('avg_risk_score', 0)
        fraud_count = profile.get('fraud_count', 0)
        transaction_count = profile.get('transaction_count', 1)
        
        # Determine risk level using dynamic thresholds based on data distribution
        # Calculate dynamic thresholds from current data patterns
        high_threshold = self._get_dynamic_threshold('high', avg_risk)
        medium_threshold = self._get_dynamic_threshold('medium', avg_risk)

        if avg_risk > high_threshold or fraud_count > 0:
            risk_level = 'HIGH'
        elif avg_risk > medium_threshold:
            risk_level = 'MEDIUM'
        else:
            risk_level = 'LOW'
        
        # Calculate fraud rate
        fraud_rate = (fraud_count / transaction_count * 100) if transaction_count > 0 else 0
        
        return {
            'risk_level': risk_level,
            'risk_score': round(avg_risk, 3),
            'fraud_rate': round(fraud_rate, 2),
            'indicators': {
                'high_risk_score': avg_risk > self._get_dynamic_threshold('high', avg_risk),
                'confirmed_fraud': fraud_count > 0,
                'multiple_devices': profile.get('unique_devices', 0) > self._get_device_threshold(),
                'multiple_cards': profile.get('unique_cards', 0) > self._get_card_threshold(),
                'suspicious_velocity': transaction_count > self._get_velocity_threshold()
            }
        }


# Global instance
_risk_analyzer = None


def get_risk_analyzer() -> RiskAnalyzer:
    """Get the global risk analyzer instance."""
    global _risk_analyzer
    if _risk_analyzer is None:
        _risk_analyzer = RiskAnalyzer()
    return _risk_analyzer