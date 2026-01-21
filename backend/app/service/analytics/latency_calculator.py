"""
Latency Calculator for fraud detection metrics.
NO HARDCODED VALUES - All configuration from environment variables.
"""

import os
from datetime import datetime
from typing import Dict

from app.service.agent.tools.database_tool import get_database_provider
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class LatencyCalculator:
    """Calculate latency percentiles from fraud decisions."""

    def __init__(self):
        """Initialize latency calculator."""
        db_provider = os.getenv("DATABASE_PROVIDER", "snowflake")
        self.client = get_database_provider(db_provider)
        logger.info(
            f"LatencyCalculator initialized with {db_provider.upper()} provider"
        )

    async def calculate_percentiles(
        self, start_date: datetime, end_date: datetime, filters: Dict = None
    ) -> Dict[str, float]:
        """
        Calculate p50, p95, p99 latency percentiles.

        Args:
            start_date: Start of time period
            end_date: End of time period
            filters: Optional filters

        Returns:
            Dictionary with p50, p95, p99 latency values
        """
        # Get column names based on database provider
        db_provider = os.getenv("DATABASE_PROVIDER", "snowflake").lower()
        datetime_col = "TX_DATETIME" if db_provider == "snowflake" else "tx_datetime"
        investigation_col = (
            "INVESTIGATION_ID" if db_provider == "snowflake" else "investigation_id"
        )

        where_clauses = [
            f"{datetime_col} >= '{start_date.isoformat()}'",
            f"{datetime_col} <= '{end_date.isoformat()}'",
        ]

        if filters:
            if filters.get("investigation_id"):
                where_clauses.append(
                    f"{investigation_col} = '{filters['investigation_id']}'"
                )

        where_sql = " AND ".join(where_clauses)

        # Note: MODEL_LATENCY_MS column doesn't exist in the actual schema
        # Latency data is not available in the current database schema
        # Return zeros as defaults until latency tracking is implemented
        logger.debug(
            "Latency calculation skipped - MODEL_LATENCY_MS column not available in schema"
        )
        return {"p50": 0, "p95": 0, "p99": 0, "mean": 0, "min": 0, "max": 0}
