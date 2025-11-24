"""
Segment Hunter Tool for Entity Mining

Decomposes anomalies by dimensions to find top contributors to metric deviations.
Implements the ranking formula: importance = |Δ metric| * share_of_delta * stability_weight * rarity_weight
"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from langchain_core.tools import BaseTool
from datetime import datetime, timedelta
import json

import os
from app.service.logging import get_bridge_logger
from app.models.anomaly import AnomalyEvent
from app.persistence.database import get_db
from app.service.agent.tools.database_tool.database_tool import DatabaseQueryTool

logger = get_bridge_logger(__name__)


class _SegmentHunterArgs(BaseModel):
    """Arguments for segment_hunter tool."""
    
    anomaly_id: str = Field(..., description="Anomaly event UUID")
    dimension: str = Field(
        ...,
        description=(
            "Dimension to decompose by. Examples: reason_code, issuer, bin, "
            "payment_method, device_fp, ip_prefix, asn, email_domain, country, "
            "gateway, processor, product_id, terminal_id"
        )
    )
    top_k: int = Field(
        10,
        ge=1,
        le=50,
        description="Number of top segments to return (default: 10, max: 50)"
    )
    min_support: int = Field(
        50,
        ge=1,
        description="Minimum transaction count in both windows for segment to be considered (default: 50)"
    )


class SegmentHunterTool(BaseTool):
    """
    Tool for decomposing anomalies by dimensions to find top contributors.
    
    Computes "during vs baseline" for target metric and ranks segments by:
    importance = |Δ metric| * share_of_delta * stability_weight * rarity_weight
    """
    
    name: str = "segment_hunter"
    description: str = (
        "Decompose an anomaly by a dimension to find top contributors to the metric deviation. "
        "Compares the anomaly window against a baseline (same duration immediately before and same weekday last week). "
        "Returns ranked segments with delta metrics, shares, and importance scores. "
        "Use this to identify which dimension values (e.g., reason_code, issuer, ASN) drove the anomaly."
    )
    args_schema: type[BaseModel] = _SegmentHunterArgs
    
    def _calculate_baseline_window(
        self,
        window_start: datetime,
        window_end: datetime
    ) -> tuple[datetime, datetime]:
        """Calculate baseline window (same duration, 7 days before)."""
        duration = window_end - window_start
        base_end = window_start - timedelta(days=1)  # Day before anomaly window
        base_start = base_end - duration
        return base_start, base_end
    
    def _build_decomposition_query(
        self,
        dimension: str,
        cohort_filters: Dict[str, Any],
        window_start: datetime,
        window_end: datetime,
        base_start: datetime,
        base_end: datetime,
        metric: str,
        min_support: int
    ) -> str:
        """Build database query for dimension decomposition (Snowflake or PostgreSQL compatible)."""
        
        # Detect database provider first
        database_provider = os.getenv('DATABASE_PROVIDER', '').lower()
        use_snowflake = os.getenv('USE_SNOWFLAKE', 'false').lower() == 'true'
        is_snowflake = database_provider == 'snowflake' or (use_snowflake and database_provider != 'postgresql')
        
        # Map dimension names to actual column names (database-specific)
        # Updated for DBT.DBT_PROD.TXS schema (369 columns)
        if is_snowflake:
            dimension_mapping = {
                'reason_code': 'FAILURE_REASON',  # TXS column: FAILURE_REASON (line 381)
                'issuer': 'CARD_ISSUER',  # TXS column: CARD_ISSUER (line 1305)
                'bin': 'BIN',  # TXS column: BIN (line 276)
                'payment_method': 'PAYMENT_METHOD',  # TXS column: PAYMENT_METHOD (line 290)
                'device_fp': 'DEVICE_ID',  # TXS column: DEVICE_ID (line 395)
                'ip_prefix': 'IP',  # TXS column: IP (line 402) - Will extract prefix in query
                'asn': 'ASN',  # TXS column: ASN (line 780)
                'email_domain': 'EMAIL',  # TXS column: EMAIL (line 122) - Will extract domain in query
                'country': 'IP_COUNTRY_CODE',  # TXS column: IP_COUNTRY_CODE (line 710)
                # 'gateway': 'GATEWAY',  # REMOVED: No GATEWAY column in TXS schema
                'processor': 'PROCESSOR',  # TXS column: PROCESSOR (line 304)
                'product_id': 'PRODUCT',  # TXS column: PRODUCT (line 633) - closest match
                # 'terminal_id': 'TERMINAL_ID',  # REMOVED: No TERMINAL_ID column in TXS schema
            }
        else:
            # PostgreSQL column name mappings (based on actual schema)
            dimension_mapping = {
                'reason_code': 'failure_reason',  # PostgreSQL: failure_reason (line 54 in postgres_actual_columns.txt)
                'issuer': 'card_issuer',  # PostgreSQL: card_issuer (line 153 in postgres_actual_columns.txt) (line 153)
                'bin': 'bin',  # PostgreSQL: bin (line 40)
                'payment_method': 'payment_method',  # Same name (line 42)
                'device_fp': 'device_id',  # PostgreSQL: device_id (line 56)
                'ip_prefix': 'ip',  # Will extract prefix in query (line 57)
                'asn': 'asn',  # PostgreSQL: asn (line 95)
                'email_domain': 'email',  # Will extract domain in query (line 18)
                'country': 'ip_country_code',  # PostgreSQL: ip_country_code (line 85)
                # 'gateway': 'payment_gateway',  # REMOVED: payment_gateway column doesn't exist in actual PostgreSQL database
                'processor': 'processor',  # PostgreSQL: processor (line 43)
                'product_id': 'product_sku',  # PostgreSQL: product_sku (may need verification)
                'terminal_id': 'terminal_id',  # May not exist in PostgreSQL
            }
        
        dimension_col = dimension_mapping.get(dimension.lower(), dimension.upper() if is_snowflake else dimension.lower())
        
        # Build cohort filter conditions (updated for TXS schema)
        cohort_conditions = []
        for key, value in cohort_filters.items():
            if key.upper() == 'MERCHANT_ID':
                # TXS uses STORE_ID, not MERCHANT_ID
                col_name = 'STORE_ID' if is_snowflake else 'store_id'
                cohort_conditions.append(f"{col_name} = '{value}'")
            elif key.upper() == 'CHANNEL':
                # TXS uses DEVICE_TYPE, not CHANNEL
                col_name = 'DEVICE_TYPE' if is_snowflake else 'device_type'
                cohort_conditions.append(f"{col_name} = '{value}'")
            elif key.upper() == 'GEO':
                col_name = 'IP_COUNTRY_CODE' if is_snowflake else 'ip_country_code'
                cohort_conditions.append(f"{col_name} = '{value}'")
            else:
                col_name = key.upper() if is_snowflake else key.lower()
                cohort_conditions.append(f"{col_name} = '{value}'")
        
        cohort_filter = " AND ".join(cohort_conditions) if cohort_conditions else "1=1"
        
        # Get table and column names based on database provider
        # Use database provider's get_full_table_name() method
        from app.service.agent.tools.database_tool.database_factory import get_database_provider
        db_provider_instance = get_database_provider()
        table_name = db_provider_instance.get_full_table_name()
        
        if is_snowflake:
            datetime_col = 'TX_DATETIME'
            # Column names are uppercase for Snowflake
            dimension_col_actual = dimension_col
        else:
            datetime_col = 'tx_datetime'
            # Column names are lowercase for PostgreSQL
            dimension_col_actual = dimension_col.lower()
        
        # Handle special dimensions that need extraction
        if dimension.lower() == 'ip_prefix':
            if is_snowflake:
                dimension_expr = "REGEXP_SUBSTR(IP, '^(\\\\d+\\\\.\\\\d+\\\\.\\\\d+)') || '.0/24'"
            else:
                # PostgreSQL: Use SUBSTRING with regex
                dimension_expr = "SUBSTRING(ip FROM '^(\\d+\\.\\d+\\.\\d+)') || '.0/24'"
            dimension_select = f"{dimension_expr} as dimension_value"
        elif dimension.lower() == 'email_domain':
            email_col = 'EMAIL' if is_snowflake else 'email'
            dimension_expr = f"SPLIT_PART({email_col}, '@', 2)"
            dimension_select = f"{dimension_expr} as dimension_value"
        else:
            dimension_select = f"{dimension_col_actual} as dimension_value"
        
        # Build cohort filter with correct column names
        # Note: cohort_filter already has correct column names from above (STORE_ID, DEVICE_TYPE for Snowflake)
        cohort_filter_actual = cohort_filter
        if not is_snowflake:
            # Convert column names to lowercase for PostgreSQL (already done above, but ensure consistency)
            cohort_filter_actual = cohort_filter.replace('STORE_ID', 'store_id')
            cohort_filter_actual = cohort_filter_actual.replace('DEVICE_TYPE', 'device_type')
            cohort_filter_actual = cohort_filter_actual.replace('IP_COUNTRY_CODE', 'ip_country_code')
            # Convert other uppercase column names to lowercase (but preserve string literals)
            import re
            # Match column names (uppercase identifiers) but not string values
            def lower_column(match):
                col = match.group(1)
                # Don't lowercase if it's in quotes (string literal)
                return col.lower()
            cohort_filter_actual = re.sub(r'\b([A-Z_]+)\b', lower_column, cohort_filter_actual)
        
        # Build metric calculation based on metric name (with database-specific column names)
        # Updated for TXS schema: Use FAILURE_REASON or NSURE_LAST_DECISION for decline detection
        if metric.lower() in ['decline_rate', 'decline_rate_pct']:
            # TXS schema: Use NSURE_LAST_DECISION or FAILURE_REASON to detect declines
            if is_snowflake:
                decision_col = 'NSURE_LAST_DECISION'  # TXS column: NSURE_LAST_DECISION (line 920)
                metric_expr = f"AVG(CASE WHEN ({decision_col} = 'REJECTED' OR {decision_col} = 'DECLINED' OR FAILURE_REASON IS NOT NULL) THEN 1.0 ELSE 0.0 END)"
            else:
                decision_col = 'nSure_last_decision'
                metric_expr = f"AVG(CASE WHEN ({decision_col} = 'REJECTED' OR {decision_col} = 'DECLINED' OR failure_reason IS NOT NULL) THEN 1.0 ELSE 0.0 END)"
            metric_label = "decline_rate"
        elif metric.lower() in ['tx_count', 'transaction_count']:
            metric_expr = "COUNT(*)"
            metric_label = "tx_count"
        elif metric.lower() in ['amount_mean', 'avg_amount']:
            amount_col = 'paid_amount_value_in_currency' if not is_snowflake else 'PAID_AMOUNT_VALUE_IN_CURRENCY'
            metric_expr = f"AVG({amount_col})"
            metric_label = "amount_mean"
        elif metric.lower() == 'cnp_share':
            payment_col = 'payment_method' if not is_snowflake else 'PAYMENT_METHOD'
            # TXS uses DEVICE_TYPE, not CHANNEL
            channel_col = 'device_type' if not is_snowflake else 'DEVICE_TYPE'
            metric_expr = f"AVG(CASE WHEN {payment_col} LIKE '%card%' AND {channel_col} = 'cnp' THEN 1.0 ELSE 0.0 END)"
            metric_label = "cnp_share"
        else:
            # Default: assume it's a column name
            metric_col = metric.lower() if not is_snowflake else metric.upper()
            metric_expr = f"AVG({metric_col})"
            metric_label = metric.lower()
        
        # Build common WITH clauses
        with_clauses = f"""
        WITH
        tx_base AS (
            SELECT 
                {dimension_select},
                {metric_expr} as metric_base,
                COUNT(*) as tx_base
            FROM {table_name}
            WHERE {datetime_col} >= '{base_start.isoformat()}'
              AND {datetime_col} < '{base_end.isoformat()}'
              AND {cohort_filter_actual}
            GROUP BY dimension_value
            HAVING COUNT(*) >= {min_support}
        ),
        tx_during AS (
            SELECT 
                {dimension_select},
                {metric_expr} as metric_during,
                COUNT(*) as tx_during
            FROM {table_name}
            WHERE {datetime_col} >= '{window_start.isoformat()}'
              AND {datetime_col} < '{window_end.isoformat()}'
              AND {cohort_filter_actual}
            GROUP BY dimension_value
            HAVING COUNT(*) >= {min_support}
        ),
        combined AS (
            SELECT
                COALESCE(d.dimension_value, b.dimension_value) as dimension_value,
                COALESCE(d.metric_during, 0) as metric_during,
                COALESCE(b.metric_base, 0) as metric_base,
                COALESCE(d.tx_during, 0) as tx_during,
                COALESCE(b.tx_base, 0) as tx_base,
                (COALESCE(d.metric_during, 0) - COALESCE(b.metric_base, 0)) as delta_metric,
                (COALESCE(d.tx_during, 0) - COALESCE(b.tx_base, 0)) as delta_tx
            FROM tx_during d
            FULL OUTER JOIN tx_base b USING (dimension_value)
        ),
        totals AS (
            SELECT
                SUM(ABS(delta_metric)) as total_abs_delta,
                SUM(ABS(delta_tx)) as total_abs_delta_tx
            FROM combined
        )"""
        
        # Detect database provider to use appropriate syntax
        database_provider = os.getenv('DATABASE_PROVIDER', '').lower()
        use_snowflake = os.getenv('USE_SNOWFLAKE', 'false').lower() == 'true'
        
        # Use QUALIFY for Snowflake, subquery for PostgreSQL
        if database_provider == 'snowflake' or (use_snowflake and database_provider != 'postgresql'):
            # Snowflake syntax with QUALIFY
            query = with_clauses + f"""
        SELECT
            c.dimension_value,
            c.metric_during,
            c.metric_base,
            c.delta_metric,
            c.tx_during,
            c.tx_base,
            c.delta_tx,
            CASE 
                WHEN t.total_abs_delta > 0 
                THEN ABS(c.delta_metric) / t.total_abs_delta 
                ELSE 0 
            END as share_of_delta,
            CASE 
                WHEN c.tx_base + c.tx_during < {min_support * 2} THEN 0.5
                WHEN c.tx_base + c.tx_during < {min_support * 4} THEN 0.75
                ELSE 1.0
            END as stability_weight,
            LEAST(
                1.0 + (CASE WHEN c.tx_base < {min_support * 2} AND c.tx_during > {min_support * 2} THEN 0.2 ELSE 0 END),
                1.2
            ) as rarity_weight
        FROM combined c
        CROSS JOIN totals t
        WHERE c.dimension_value IS NOT NULL
        QUALIFY ROW_NUMBER() OVER (
            ORDER BY 
                ABS(c.delta_metric) * 
                CASE WHEN t.total_abs_delta > 0 THEN ABS(c.delta_metric) / t.total_abs_delta ELSE 0 END *
                CASE WHEN c.tx_base + c.tx_during < {min_support * 2} THEN 0.5
                     WHEN c.tx_base + c.tx_during < {min_support * 4} THEN 0.75 ELSE 1.0 END *
                LEAST(1.0 + (CASE WHEN c.tx_base < {min_support * 2} AND c.tx_during > {min_support * 2} THEN 0.2 ELSE 0 END), 1.2)
            DESC NULLS LAST
        ) <= 10
        ORDER BY 
            ABS(delta_metric) * share_of_delta * stability_weight * rarity_weight DESC
        """
        else:
            # PostgreSQL syntax with subquery (no QUALIFY support)
            query = with_clauses + f"""
        SELECT * FROM (
            SELECT
                c.dimension_value,
                c.metric_during,
                c.metric_base,
                c.delta_metric,
                c.tx_during,
                c.tx_base,
                c.delta_tx,
                CASE 
                    WHEN t.total_abs_delta > 0 
                    THEN ABS(c.delta_metric) / t.total_abs_delta 
                    ELSE 0 
                END as share_of_delta,
                CASE 
                    WHEN c.tx_base + c.tx_during < {min_support * 2} THEN 0.5
                    WHEN c.tx_base + c.tx_during < {min_support * 4} THEN 0.75
                    ELSE 1.0
                END as stability_weight,
                LEAST(
                    1.0 + (CASE WHEN c.tx_base < {min_support * 2} AND c.tx_during > {min_support * 2} THEN 0.2 ELSE 0 END),
                    1.2
                ) as rarity_weight,
                ROW_NUMBER() OVER (
                    ORDER BY 
                        ABS(c.delta_metric) * 
                        CASE WHEN t.total_abs_delta > 0 THEN ABS(c.delta_metric) / t.total_abs_delta ELSE 0 END *
                        CASE WHEN c.tx_base + c.tx_during < {min_support * 2} THEN 0.5
                             WHEN c.tx_base + c.tx_during < {min_support * 4} THEN 0.75 ELSE 1.0 END *
                        LEAST(1.0 + (CASE WHEN c.tx_base < {min_support * 2} AND c.tx_during > {min_support * 2} THEN 0.2 ELSE 0 END), 1.2)
                    DESC NULLS LAST
                ) as rn
            FROM combined c
            CROSS JOIN totals t
            WHERE c.dimension_value IS NOT NULL
        ) ranked
        WHERE rn <= 10
        ORDER BY 
            ABS(delta_metric) * share_of_delta * stability_weight * rarity_weight DESC
        """
        
        return query
    
    def _check_data_availability(
        self,
        anomaly: AnomalyEvent,
        base_start: datetime,
        base_end: datetime,
        connection_string: Optional[str]
    ) -> Dict[str, Any]:
        """
        Check if data exists in database for the anomaly and baseline windows.
        
        Returns:
            Dict with 'anomaly_count', 'baseline_count', 'total_count'
        """
        import os
        from app.service.agent.tools.database_tool.database_tool import DatabaseQueryTool
        
        # Detect database provider FIRST - this determines which tool/provider to use
        database_provider = os.getenv("DATABASE_PROVIDER", "").lower()
        use_snowflake = os.getenv("USE_SNOWFLAKE", "false").lower() == "true"
        is_snowflake = database_provider == "snowflake" or (use_snowflake and database_provider != "postgresql")
        
        # Build cohort filter (updated for TXS schema)
        cohort_conditions = []
        for key, value in anomaly.cohort.items():
            if key.upper() == "GEO":
                col_name = 'IP_COUNTRY_CODE' if is_snowflake else 'ip_country_code'
                cohort_conditions.append(f"{col_name} = '{value.upper() if is_snowflake else value.lower()}'")
            elif key.upper() == "MERCHANT_ID":
                # TXS uses STORE_ID, not MERCHANT_ID
                col_name = 'STORE_ID' if is_snowflake else 'store_id'
                cohort_conditions.append(f"{col_name} = '{value}'")
            elif key.upper() == "CHANNEL":
                # TXS uses DEVICE_TYPE, not CHANNEL
                col_name = 'DEVICE_TYPE' if is_snowflake else 'device_type'
                cohort_conditions.append(f"{col_name} = '{value}'")
            else:
                # Convert to appropriate case based on database provider
                col_name = key.upper() if is_snowflake else key.lower()
                cohort_conditions.append(f"{col_name} = '{value}'")
        
        cohort_filter = " AND ".join(cohort_conditions) if cohort_conditions else "1=1"
        
        # Use database provider's get_full_table_name() method
        from app.service.agent.tools.database_tool.database_factory import get_database_provider
        db_provider_instance = get_database_provider()
        table_name = db_provider_instance.get_full_table_name()
        datetime_col = "TX_DATETIME" if is_snowflake else "tx_datetime"
        
        # Check anomaly window
        anomaly_query = f"""
            SELECT COUNT(*) as count
            FROM {table_name}
            WHERE {datetime_col} >= '{anomaly.window_start.isoformat()}'
              AND {datetime_col} < '{anomaly.window_end.isoformat()}'
              AND {cohort_filter}
        """
        
        # Check baseline window
        baseline_query = f"""
            SELECT COUNT(*) as count
            FROM {table_name}
            WHERE {datetime_col} >= '{base_start.isoformat()}'
              AND {datetime_col} < '{base_end.isoformat()}'
              AND {cohort_filter}
        """
        
        try:
            # Use correct database provider based on DATABASE_PROVIDER
            if is_snowflake:
                # Use SnowflakeProvider for Snowflake
                from app.service.agent.tools.database_tool.database_factory import get_database_provider
                db_provider = get_database_provider()
                db_provider.connect()
                
                anomaly_result = db_provider.execute_query(anomaly_query)
                baseline_result = db_provider.execute_query(baseline_query)
                
                # Convert to DatabaseQueryTool format for consistency
                anomaly_result = {
                    'success': True,
                    'data': anomaly_result if isinstance(anomaly_result, list) else [anomaly_result] if anomaly_result else [],
                    'row_count': len(anomaly_result) if isinstance(anomaly_result, list) else 1 if anomaly_result else 0
                }
                baseline_result = {
                    'success': True,
                    'data': baseline_result if isinstance(baseline_result, list) else [baseline_result] if baseline_result else [],
                    'row_count': len(baseline_result) if isinstance(baseline_result, list) else 1 if baseline_result else 0
                }
            else:
                # Use DatabaseQueryTool for PostgreSQL
                if not connection_string:
                    postgres_host = os.getenv('POSTGRES_HOST') or os.getenv('DB_HOST')
                    postgres_port = os.getenv('POSTGRES_PORT') or os.getenv('DB_PORT', '5432')
                    postgres_database = os.getenv('POSTGRES_DATABASE') or os.getenv('POSTGRES_DB') or os.getenv('DB_NAME')
                    postgres_user = os.getenv('POSTGRES_USER') or os.getenv('DB_USER')
                    postgres_password = os.getenv('POSTGRES_PASSWORD') or os.getenv('DB_PASSWORD')
                    
                    if postgres_host and postgres_database and postgres_user and postgres_password:
                        # Add gssencmode=disable to avoid GSSAPI errors on local connections
                        connection_string = f"postgresql://{postgres_user}:{postgres_password}@{postgres_host}:{postgres_port}/{postgres_database}?gssencmode=disable"
                
                if not connection_string:
                    connection_string = (
                        os.getenv('DATABASE_URL') or
                        os.getenv('POSTGRES_URL')
                    )
                
                if not connection_string:
                    return {'anomaly_count': 0, 'baseline_count': 0, 'total_count': 0}
                
                db_tool = DatabaseQueryTool(connection_string=connection_string)
                anomaly_result = db_tool._run(query=anomaly_query)
                baseline_result = db_tool._run(query=baseline_query)
            
            anomaly_count = 0
            baseline_count = 0
            
            if isinstance(anomaly_result, dict) and 'data' in anomaly_result and anomaly_result['data']:
                anomaly_count = anomaly_result['data'][0].get('count', 0)
            
            if isinstance(baseline_result, dict) and 'data' in baseline_result and baseline_result['data']:
                baseline_count = baseline_result['data'][0].get('count', 0)
            
            return {
                'anomaly_count': anomaly_count,
                'baseline_count': baseline_count,
                'total_count': anomaly_count + baseline_count
            }
        except Exception as e:
            logger.warning(f"   Failed to check data availability: {e}")
            return {'anomaly_count': 0, 'baseline_count': 0, 'total_count': 0}
    
    def _run(
        self,
        anomaly_id: str,
        dimension: str,
        top_k: int = 10,
        min_support: int = 50
    ) -> Dict[str, Any]:
        """Execute the segment_hunter tool."""
        db = next(get_db())
        try:
            import uuid
            anomaly = db.query(AnomalyEvent).filter(
                AnomalyEvent.id == uuid.UUID(anomaly_id)
            ).first()
            
            if not anomaly:
                return {
                    'error': f'Anomaly {anomaly_id} not found',
                    'segments': []
                }
            
            # Calculate baseline window
            base_start, base_end = self._calculate_baseline_window(
                anomaly.window_start,
                anomaly.window_end
            )
            
            # Calculate adaptive min_support based on window size
            # For short windows (< 1 hour), use lower threshold
            window_duration = (anomaly.window_end - anomaly.window_start).total_seconds() / 3600  # hours
            adaptive_min_support = min_support
            if window_duration < 1.0:  # Less than 1 hour
                # Scale down min_support proportionally (e.g., 15 min = 0.25 hours -> 12-13 transactions)
                adaptive_min_support = max(5, int(min_support * window_duration))
                logger.info(f"   Adaptive min_support: {min_support} -> {adaptive_min_support} (window={window_duration:.2f}h)")
            elif window_duration < 24.0:  # Less than 1 day
                # Scale down slightly for short windows
                adaptive_min_support = max(10, int(min_support * (window_duration / 24.0)))
                logger.info(f"   Adaptive min_support: {min_support} -> {adaptive_min_support} (window={window_duration:.2f}h)")
            
            # Detect database provider FIRST - this determines which tool/provider to use
            database_provider = os.getenv("DATABASE_PROVIDER", "").lower()
            use_snowflake = os.getenv("USE_SNOWFLAKE", "false").lower() == "true"
            is_snowflake = database_provider == "snowflake" or (use_snowflake and database_provider != "postgresql")
            
            # First, run a diagnostic query to check if data exists
            # Pass None for connection_string - _check_data_availability will detect provider itself
            diagnostic_result = self._check_data_availability(
                anomaly=anomaly,
                base_start=base_start,
                base_end=base_end,
                connection_string=None  # Will be determined inside based on DATABASE_PROVIDER
            )
            
            if diagnostic_result.get('total_count', 0) == 0:
                logger.warning(
                    f"   ⚠️ No data found in database for time windows. "
                    f"Anomaly window: {anomaly.window_start} to {anomaly.window_end}, "
                    f"Baseline window: {base_start} to {base_end}, "
                    f"Cohort: {anomaly.cohort}"
                )
                return {
                    'anomaly_id': anomaly_id,
                    'dimension': dimension,
                    'metric': anomaly.metric,
                    'window_start': anomaly.window_start.isoformat(),
                    'window_end': anomaly.window_end.isoformat(),
                    'baseline_start': base_start.isoformat(),
                    'baseline_end': base_end.isoformat(),
                    'segments': [],
                    'warning': 'No data found in database for specified time windows'
                }
            
            logger.info(
                f"   Data availability check: anomaly_window={diagnostic_result.get('anomaly_count', 0)} rows, "
                f"baseline_window={diagnostic_result.get('baseline_count', 0)} rows"
            )
            
            # Build decomposition query with adaptive min_support
            query = self._build_decomposition_query(
                dimension=dimension,
                cohort_filters=anomaly.cohort,
                window_start=anomaly.window_start,
                window_end=anomaly.window_end,
                base_start=base_start,
                base_end=base_end,
                metric=anomaly.metric,
                min_support=adaptive_min_support
            )
            
            # Execute query using database tool
            logger.info(f"SegmentHunter executing query for dimension {dimension}, anomaly {anomaly_id}")
            logger.info(f"   Anomaly window: {anomaly.window_start} to {anomaly.window_end}")
            logger.info(f"   Baseline window: {base_start} to {base_end}")
            logger.info(f"   Cohort filters: {anomaly.cohort}")
            logger.info(f"   Metric: {anomaly.metric}, min_support: {adaptive_min_support} (original: {min_support})")
            
            # Detect database provider FIRST - this determines which tool/provider to use
            database_provider = os.getenv("DATABASE_PROVIDER", "").lower()
            use_snowflake = os.getenv("USE_SNOWFLAKE", "false").lower() == "true"
            is_snowflake = database_provider == "snowflake" or (use_snowflake and database_provider != "postgresql")
            
            # Log the query for debugging (truncated if too long)
            query_preview = query[:500] + "..." if len(query) > 500 else query
            logger.info(f"   Query preview: {query_preview}")
            logger.info(f"   Using database provider: {database_provider} (is_snowflake={is_snowflake})")
            
            # Use correct database provider based on DATABASE_PROVIDER
            if is_snowflake:
                # Use SnowflakeProvider for Snowflake
                from app.service.agent.tools.database_tool.database_factory import get_database_provider
                db_provider = get_database_provider()
                db_provider.connect()
                
                result_data = db_provider.execute_query(query)
                
                # Convert to DatabaseQueryTool format for consistency
                result = {
                    'success': True,
                    'data': result_data if isinstance(result_data, list) else [result_data] if result_data else [],
                    'row_count': len(result_data) if isinstance(result_data, list) else 1 if result_data else 0,
                    'query': query
                }
            else:
                # Use DatabaseQueryTool for PostgreSQL
                connection_string = None
                
                # Try PostgreSQL individual environment variables first
                if database_provider == 'postgresql' or not database_provider:
                    postgres_host = os.getenv('POSTGRES_HOST') or os.getenv('DB_HOST')
                    postgres_port = os.getenv('POSTGRES_PORT') or os.getenv('DB_PORT', '5432')
                    postgres_database = os.getenv('POSTGRES_DATABASE') or os.getenv('POSTGRES_DB') or os.getenv('DB_NAME')
                    postgres_user = os.getenv('POSTGRES_USER') or os.getenv('DB_USER')
                    postgres_password = os.getenv('POSTGRES_PASSWORD') or os.getenv('DB_PASSWORD')
                    
                    if postgres_host and postgres_database and postgres_user and postgres_password:
                        # Add gssencmode=disable to avoid GSSAPI errors on local connections
                        connection_string = f"postgresql://{postgres_user}:{postgres_password}@{postgres_host}:{postgres_port}/{postgres_database}?gssencmode=disable"
                        logger.debug(f"SegmentHunter: Built PostgreSQL connection string from individual env vars")
                
                # Fallback to direct connection string environment variables
                if not connection_string:
                    connection_string = (
                        os.getenv('DATABASE_URL') or
                        os.getenv('POSTGRES_URL')
                    )
                
                if not connection_string:
                    error_msg = (
                        "No database connection string found. Set one of: "
                        "DATABASE_URL, POSTGRES_URL, "
                        "or PostgreSQL individual vars (POSTGRES_HOST, POSTGRES_DATABASE, POSTGRES_USER, POSTGRES_PASSWORD)"
                    )
                    logger.error(f"SegmentHunter: {error_msg}")
                    return {
                        'error': error_msg,
                        'segments': []
                    }
                
                db_tool = DatabaseQueryTool(connection_string=connection_string)
                result = db_tool._run(query=query)
            
            # Check for errors
            if isinstance(result, dict):
                if not result.get('success', False):
                    error_msg = result.get('error', 'Unknown database error')
                    logger.error(f"SegmentHunter database query error for dimension {dimension}: {error_msg}")
                    logger.error(f"   Full query: {query}")
                    return {
                        'error': error_msg,
                        'segments': []
                    }
                if 'error' in result:
                    logger.error(f"SegmentHunter database query error for dimension {dimension}: {result['error']}")
                    logger.error(f"   Full query: {query}")
                    return {
                        'error': result['error'],
                        'segments': []
                    }
            
            # Parse results - DatabaseQueryTool returns dict with 'data' key containing rows
            segments = []
            if isinstance(result, dict) and 'data' in result:
                rows = result['data']
                logger.info(f"SegmentHunter query returned {len(rows)} rows for dimension {dimension}")
                
                # Log sample rows if available
                if rows:
                    logger.info(f"   Sample row: {rows[0]}")
                else:
                    logger.warning(
                        f"   ⚠️ No rows returned for dimension {dimension}. "
                        f"This may indicate: no data in database for time window, "
                        f"min_support ({min_support}) too high, or query issue."
                    )
            elif isinstance(result, dict) and 'results' in result:
                # Fallback for other formats
                rows = result['results']
                logger.info(f"SegmentHunter query returned {len(rows)} rows (results format) for dimension {dimension}")
            elif isinstance(result, list):
                rows = result
                logger.info(f"SegmentHunter query returned {len(rows)} rows (list format) for dimension {dimension}")
            else:
                rows = []
                logger.warning(f"SegmentHunter query returned unexpected format: {type(result)} for dimension {dimension}. Keys: {list(result.keys()) if isinstance(result, dict) else 'N/A'}")
            
            for row in rows[:top_k]:
                importance = (
                    abs(row.get('delta_metric', 0)) *
                    row.get('share_of_delta', 0) *
                    row.get('stability_weight', 1.0) *
                    row.get('rarity_weight', 1.0)
                )
                
                segments.append({
                    'dimension_value': row.get('dimension_value'),
                    'metric_during': row.get('metric_during'),
                    'metric_base': row.get('metric_base'),
                    'delta_metric': row.get('delta_metric'),
                    'tx_during': row.get('tx_during'),
                    'tx_base': row.get('tx_base'),
                    'delta_tx': row.get('delta_tx'),
                    'share_of_delta': row.get('share_of_delta'),
                    'importance': importance
                })
            
            logger.info(
                f"SegmentHunter found {len(segments)} top segments for dimension {dimension} "
                f"in anomaly {anomaly_id}"
            )
            
            return {
                'anomaly_id': anomaly_id,
                'dimension': dimension,
                'metric': anomaly.metric,
                'window_start': anomaly.window_start.isoformat(),
                'window_end': anomaly.window_end.isoformat(),
                'baseline_start': base_start.isoformat(),
                'baseline_end': base_end.isoformat(),
                'segments': segments
            }
            
        except Exception as e:
            logger.error(f"SegmentHunter tool error: {e}", exc_info=True)
            return {'error': str(e), 'segments': []}
        finally:
            db.close()

