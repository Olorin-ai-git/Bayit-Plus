"""
Cohort Fetcher

This module provides functionality for fetching unique cohorts from the configured database provider.
"""

import asyncio
import os
from datetime import datetime
from typing import Dict, List

from app.models.anomaly import Detector
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


def get_cohorts(
    detector: Detector, window_from: datetime, window_to: datetime
) -> List[Dict[str, str]]:
    """
    Get unique cohorts for detector's cohort_by dimensions.

    Args:
        detector: Detector configuration
        window_from: Start of time window
        window_to: End of time window

    Returns:
        List of cohort dictionaries

    Raises:
        ConnectionError: If database connection fails
        ValueError: If query execution fails
    """
    if not detector.cohort_by:
        return []

    from app.service.agent.tools.database_tool import get_database_provider

    # Get database provider from environment variables
    # Respect USE_SNOWFLAKE and DATABASE_PROVIDER settings
    use_snowflake = os.getenv("USE_SNOWFLAKE", "false").lower() == "true"
    database_provider = os.getenv("DATABASE_PROVIDER", "snowflake").lower()

    # Determine which provider to use
    if use_snowflake and database_provider == "snowflake":
        provider_name = "snowflake"
    else:
        provider_name = (
            database_provider
            if database_provider in ["postgresql", "snowflake"]
            else "snowflake"
        )

    logger.info(
        f"Using database provider: {provider_name} (USE_SNOWFLAKE={use_snowflake}, DATABASE_PROVIDER={database_provider})"
    )

    provider = get_database_provider(provider_name)
    try:
        provider.connect()
    except Exception as e:
        logger.error(
            f"Failed to connect to {provider_name} for cohort query: {e}", exc_info=True
        )
        # Convert to ConnectionError so it can be properly handled by callers
        error_str = str(e).lower()
        if provider_name == "snowflake" and (
            "oauth" in error_str
            or "invalid" in error_str
            or "authentication" in error_str
        ):
            raise ConnectionError(
                f"Snowflake authentication failed. Please check your OAuth token: {e}"
            ) from e
        raise ConnectionError(
            f"Database connection failed ({provider_name}): {e}"
        ) from e

    try:
        # Get the actual transaction table name from the database provider
        from app.service.agent.tools.database_tool.database_factory import (
            get_database_provider,
        )

        db_provider_instance = get_database_provider(provider_name)

        if provider_name == "snowflake":
            # For Snowflake, query the actual transaction table and aggregate into windows
            table_name = db_provider_instance.get_full_table_name()
            datetime_col = "TX_DATETIME"

            # Column name mapping for Snowflake TXS table
            column_mapping = {
                "merchant_id": "STORE_ID",  # TXS uses STORE_ID
                "channel": "DEVICE_TYPE",  # TXS uses DEVICE_TYPE
                "geo": "IP_COUNTRY_CODE",  # TXS uses IP_COUNTRY_CODE
            }

            # Map cohort_by columns to actual database columns
            cohort_cols = []
            for col in detector.cohort_by:
                mapped_col = column_mapping.get(col.lower(), col.upper())
                cohort_cols.append(mapped_col)

            cohort_cols_str = ", ".join(cohort_cols)

            # Prepare datetime values for Snowflake (format directly into query)
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

            # Query distinct cohorts from transactions in the time window
            # Snowflake doesn't support named parameters, so format values directly
            query = f"""
                SELECT DISTINCT {cohort_cols_str}
                FROM {table_name}
                WHERE {datetime_col} >= '{window_from_str}'
                  AND {datetime_col} <= '{window_to_str}'
                ORDER BY {cohort_cols_str}
            """
            params = None  # No parameters for Snowflake
        else:
            # For PostgreSQL, use the transaction_windows view
            table_name = "transaction_windows"
            datetime_col = "tx_datetime"

            # Column name mapping for PostgreSQL
            column_mapping = {
                "merchant_id": "store_id",
                "channel": "device_type",
                "geo": "ip_country_code",
            }

            # Map cohort_by columns to actual database columns
            cohort_cols = []
            for col in detector.cohort_by:
                mapped_col = column_mapping.get(col.lower(), col.lower())
                cohort_cols.append(mapped_col)

            cohort_cols_str = ", ".join(cohort_cols)
            query = f"""
                SELECT DISTINCT {cohort_cols_str}
                FROM {table_name}
                WHERE window_start >= :window_from
                  AND window_end <= :window_to
                ORDER BY {cohort_cols_str}
            """

        # Prepare parameters - PostgreSQL needs datetime objects
        if provider_name == "postgresql":
            # PostgreSQL asyncpg with TIMESTAMP WITHOUT TIME ZONE columns needs timezone-naive datetimes
            # Convert to UTC and remove timezone info for compatibility
            from datetime import timezone

            if window_from.tzinfo is not None:
                # Convert to UTC and make naive
                window_from_naive = window_from.astimezone(timezone.utc).replace(
                    tzinfo=None
                )
            else:
                # Already naive - use as is
                window_from_naive = window_from

            if window_to.tzinfo is not None:
                # Convert to UTC and make naive
                window_to_naive = window_to.astimezone(timezone.utc).replace(
                    tzinfo=None
                )
            else:
                # Already naive - use as is
                window_to_naive = window_to

            params = {"window_from": window_from_naive, "window_to": window_to_naive}
        # else: params already set to None for Snowflake above

        # Handle async providers (PostgreSQL) vs sync providers (Snowflake)
        if provider_name == "postgresql":
            # PostgreSQLProvider has async methods - need to run in event loop
            # Use a new event loop in a separate thread to avoid conflicts
            import concurrent.futures
            import threading

            def run_async_query():
                # Create a new event loop in this thread
                new_loop = asyncio.new_event_loop()
                asyncio.set_event_loop(new_loop)
                try:
                    return new_loop.run_until_complete(
                        provider.execute_query(query, params)
                    )
                finally:
                    new_loop.close()

            with concurrent.futures.ThreadPoolExecutor() as executor:
                future = executor.submit(run_async_query)
                results = future.result()
        else:
            # SnowflakeProvider has sync methods - params is None, values formatted in query
            results = provider.execute_query(query)

        cohorts = []
        # Map results back to detector cohort_by column names
        # Create reverse mapping: database column -> detector column name
        reverse_mapping = {}
        for detector_col, db_col in column_mapping.items():
            reverse_mapping[db_col.lower()] = detector_col

        for row in results:
            cohort = {}
            for db_col, value in row.items():
                # Map database column back to detector column name
                # Try both exact match and case-insensitive match
                detector_col = (
                    reverse_mapping.get(db_col.lower())
                    or reverse_mapping.get(db_col)
                    or db_col
                )
                # Only include if it's in the detector's cohort_by list
                if detector_col.lower() in [c.lower() for c in detector.cohort_by]:
                    cohort[detector_col] = str(value) if value is not None else ""
            if cohort:
                cohorts.append(cohort)

        logger.info(f"Found {len(cohorts)} unique cohorts for detector {detector.id}")
        return cohorts

    except ConnectionError:
        # Re-raise ConnectionError so it can be handled by callers
        raise
    except Exception as e:
        logger.error(
            f"Failed to query cohorts from {provider_name}: {e}", exc_info=True
        )
        # Check if it's a database/connection error
        error_str = str(e).lower()
        if provider_name == "snowflake" and (
            "snowflake" in error_str or "oauth" in error_str or "invalid" in error_str
        ):
            raise ConnectionError(f"Snowflake error: {e}") from e
        if "database" in error_str or "connection" in error_str:
            raise ConnectionError(f"Database error ({provider_name}): {e}") from e
        raise ValueError(f"Failed to fetch cohorts: {e}") from e
    finally:
        try:
            # Handle async disconnect for PostgreSQL
            if provider_name == "postgresql":
                # Use a new event loop in a separate thread to avoid conflicts
                import concurrent.futures

                def run_async_disconnect():
                    # Create a new event loop in this thread
                    new_loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(new_loop)
                    try:
                        return new_loop.run_until_complete(provider.disconnect())
                    finally:
                        new_loop.close()

                with concurrent.futures.ThreadPoolExecutor() as executor:
                    future = executor.submit(run_async_disconnect)
                    future.result(timeout=5)  # 5 second timeout
            else:
                # SnowflakeProvider has sync disconnect
                provider.disconnect()
        except Exception as e:
            logger.warning(f"Error disconnecting from {provider_name}: {e}")
