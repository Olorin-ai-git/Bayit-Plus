"""
Window Data Access Layer

This module provides data access for transaction window data from the configured database provider.
Uses existing database provider abstraction for database queries.
"""

from typing import List, Dict, Any, Optional
from datetime import datetime
import pandas as pd
import os
import asyncio

from app.service.logging import get_bridge_logger
from app.service.agent.tools.database_tool import get_database_provider

logger = get_bridge_logger(__name__)


async def fetch_windows_snowflake(
    window_from: datetime,
    window_to: datetime,
    cohort_by: Optional[List[str]] = None,
    metrics: Optional[List[str]] = None,
    cohort_filters: Optional[Dict[str, str]] = None,
    provider=None  # Optional: reuse existing provider instead of creating new one
) -> pd.DataFrame:
    """
    Fetch transaction window data from the configured database provider.

    Args:
        window_from: Start of time window
        window_to: End of time window
        cohort_by: Optional list of cohort dimension names to group by
        metrics: Optional list of metric names to fetch
        cohort_filters: Optional dict of cohort dimension filters (e.g., {'merchant_id': 'm_01'})
        provider: Optional database provider instance to reuse

    Returns:
        DataFrame with columns: window_start, window_end, cohort dimensions, and requested metrics

    Raises:
        ConnectionError: If database connection fails
        ValueError: If query execution fails
    """
    # Analytics queries ALWAYS use PostgreSQL because transaction_windows is an Olorin-managed table in PostgreSQL
    # DATABASE_PROVIDER is only for the raw transactions table, not for analytics
    # Reuse provided provider or create PostgreSQL provider
    should_disconnect = False
    provider_created_here = False
    
    if provider is None:
        # Always use PostgreSQL for analytics (transaction_windows view)
        database_provider = 'postgresql'
        logger.info(f"Using {database_provider} for transaction windows (analytics always uses PostgreSQL)")
        provider = get_database_provider(database_provider)
        should_disconnect = True
        provider_created_here = True
    else:
        # Provider was provided - reuse it (should be PostgreSQL for analytics)
        provider_type = type(provider).__name__
        logger.debug(f"Reusing provided database provider: {provider_type}")
        # Warn if a non-PostgreSQL provider is passed for analytics
        if 'postgresql' not in provider_type.lower():
            logger.warning(
                f"Non-PostgreSQL provider ({provider_type}) passed to analytics query. "
                f"Analytics should use PostgreSQL for transaction_windows view."
            )
        # Don't disconnect if provider was passed in (it's being reused)
        should_disconnect = False
    
    # Connect provider if not already connected (idempotent)
    # PostgreSQL providers check if pool exists before creating, so multiple calls are safe
    try:
        provider.connect()
    except ConnectionError as e:
        provider_type = type(provider).__name__
        logger.error(f"Failed to connect to {provider_type}: {e}", exc_info=True)
        raise ConnectionError(f"{provider_type} connection failed: {e}") from e
    except Exception as e:
        provider_type = type(provider).__name__
        logger.error(f"Unexpected error connecting to {provider_type}: {e}", exc_info=True)
        raise ConnectionError(f"{provider_type} connection failed: {e}") from e

    # Determine provider type and configure query accordingly
    provider_type = type(provider).__name__.lower()
    is_postgresql = 'postgresql' in provider_type
    is_snowflake = 'snowflake' in provider_type
    
    if is_postgresql:
        # For PostgreSQL, use the transaction_windows view
        table_name = 'transaction_windows'
        datetime_col = 'tx_datetime'
        
        # Column name mapping for PostgreSQL transaction_windows view
        column_mapping = {
            'merchant_id': 'store_id',
            'channel': 'device_type',
            'geo': 'ip_country_code',
        }
    elif is_snowflake:
        # For Snowflake, use the marts_txn_window table
        table_name = provider.get_full_table_name().replace('.TXS', '.MARTS_TXN_WINDOW')
        # If table name doesn't contain schema, use default
        if '.' not in table_name:
            import os
            database = os.getenv('SNOWFLAKE_DATABASE', 'DBT')
            schema = os.getenv('SNOWFLAKE_SCHEMA', 'DBT_PROD')
            table_name = f"{database}.{schema}.MARTS_TXN_WINDOW"
        
        datetime_col = 'TX_DATETIME'
        
        # Column name mapping for Snowflake marts_txn_window table
        column_mapping = {
            'merchant_id': 'MERCHANT_ID',
            'channel': 'CHANNEL',
            'geo': 'GEO',
        }
    else:
        raise ValueError(f"Unsupported database provider: {provider_type}")
    
    # Build WHERE clause for cohort filters
    cohort_conditions = []
    cohort_params: Dict[str, Any] = {}
    
    if cohort_filters:
        for key, value in cohort_filters.items():
            if value is not None:
                # Map cohort filter keys to database column names
                db_col = column_mapping.get(key.lower(), key.upper() if is_snowflake else key.lower())
                if is_snowflake:
                    # Snowflake uses direct value formatting (no named parameters)
                    cohort_conditions.append(f"{db_col} = '{value}'")
                else:
                    # PostgreSQL uses named parameters
                    cohort_conditions.append(f"{db_col} = :{key}")
                    cohort_params[key] = value
    
    # Build SELECT clause
    if is_snowflake:
        select_columns = ['WINDOW_START', 'WINDOW_END']
    else:
        select_columns = ['window_start', 'window_end']
    
    # Add cohort dimensions if specified (map to database column names)
    if cohort_by:
        mapped_cohort_by = [
            column_mapping.get(col.lower(), col.upper() if is_snowflake else col.lower()) 
            for col in cohort_by
        ]
        select_columns.extend(mapped_cohort_by)
    
    # Add metrics if specified
    if metrics:
        # Map metric names to database column names (uppercase for Snowflake)
        mapped_metrics = [
            metric.upper() if is_snowflake else metric.lower() 
            for metric in metrics
        ]
        select_columns.extend(mapped_metrics)
    else:
        raise ValueError("At least one metric must be specified")
    
    select_clause = ', '.join(select_columns)
    
    # Build query with provider-specific syntax
    if is_snowflake:
        # Snowflake query - format datetime values directly
        from datetime import timezone
        if window_from.tzinfo is None:
            window_from_utc = window_from.replace(tzinfo=timezone.utc)
        else:
            window_from_utc = window_from.astimezone(timezone.utc)
        
        if window_to.tzinfo is None:
            window_to_utc = window_to.replace(tzinfo=timezone.utc)
        else:
            window_to_utc = window_to.astimezone(timezone.utc)
        
        window_from_str = window_from_utc.isoformat()
        window_to_str = window_to_utc.isoformat()
        
        where_clauses = [
            f"WINDOW_START >= '{window_from_str}'",
            f"WINDOW_END <= '{window_to_str}'"
        ]
        
        if cohort_conditions:
            where_clauses.extend(cohort_conditions)
        
        query = f"""
            SELECT {select_clause}
            FROM {table_name}
            WHERE {' AND '.join(where_clauses)}
            ORDER BY WINDOW_START ASC
        """
        params = None  # Snowflake doesn't use named parameters
    else:
        # PostgreSQL query - use named parameters
        where_clauses = [
            "window_start >= :window_from",
            "window_end <= :window_to"
        ]
        
        if cohort_conditions:
            where_clauses.extend(cohort_conditions)
        
        query = f"""
            SELECT {select_clause}
            FROM {table_name}
            WHERE {' AND '.join(where_clauses)}
            ORDER BY window_start ASC
        """
        
        # Prepare parameters - PostgreSQL needs datetime objects
        # PostgreSQL asyncpg with TIMESTAMP WITHOUT TIME ZONE columns needs timezone-naive datetimes
        from datetime import timezone
        if window_from.tzinfo is not None:
            window_from_naive = window_from.astimezone(timezone.utc).replace(tzinfo=None)
        else:
            window_from_naive = window_from
        
        if window_to.tzinfo is not None:
            window_to_naive = window_to.astimezone(timezone.utc).replace(tzinfo=None)
        else:
            window_to_naive = window_to
        
        params = {
            'window_from': window_from_naive,
            'window_to': window_to_naive,
            **cohort_params
        }

    try:
        logger.debug(f"Executing query: {query[:200]}... with params: {params}")
        
        # Execute query - handle both async (PostgreSQL) and sync (Snowflake) providers
        if is_postgresql:
            # PostgreSQLProvider has async methods
            results = await provider.execute_query(query, params)
        else:
            # SnowflakeProvider has sync methods - run in executor
            loop = asyncio.get_event_loop()
            results = await loop.run_in_executor(
                None,
                lambda: provider.execute_query(query, params)
            )
        
        if not results:
            logger.debug(
                f"No data found for cohort_filters {cohort_filters} in window "
                f"{window_from} to {window_to}"
            )
            return pd.DataFrame(columns=select_columns)

        df = pd.DataFrame(results)
        
        # Normalize column names to lowercase for consistency
        df.columns = df.columns.str.lower()
        
        # Convert window_start and window_end to datetime
        if 'window_start' in df.columns:
            df['window_start'] = pd.to_datetime(df['window_start'])
        if 'window_end' in df.columns:
            df['window_end'] = pd.to_datetime(df['window_end'])

        logger.info(
            f"Fetched {len(df)} windows for cohort_filters {cohort_filters} "
            f"from {window_from} to {window_to}"
        )
        
        return df

    except Exception as e:
        logger.error(f"Failed to execute database query: {e}")
        raise ValueError(f"Query execution failed: {e}") from e
    finally:
        # Only disconnect if we created the provider (not if it was passed in)
        if should_disconnect:
            try:
                # Handle async disconnect for PostgreSQL, sync for Snowflake
                if is_postgresql:
                    await provider.disconnect()
                else:
                    loop = asyncio.get_event_loop()
                    await loop.run_in_executor(None, provider.disconnect)
                provider_type_name = 'PostgreSQL' if is_postgresql else 'Snowflake'
                logger.info(f"Disconnected from {provider_type_name} after batch cohort processing")
            except Exception as e:
                provider_type_name = 'PostgreSQL' if is_postgresql else 'Snowflake'
                logger.warning(f"Error disconnecting from {provider_type_name}: {e}")

