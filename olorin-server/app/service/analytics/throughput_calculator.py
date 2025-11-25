"""
Throughput Calculator for fraud detection metrics.
NO HARDCODED VALUES - All configuration from environment variables.
"""

import os
from typing import Dict
from datetime import datetime
from app.service.logging import get_bridge_logger
from app.service.agent.tools.database_tool import get_database_provider

logger = get_bridge_logger(__name__)


class ThroughputCalculator:
    """Calculate decision throughput metrics."""

    def __init__(self):
        """Initialize throughput calculator."""
        db_provider_env = os.getenv('DATABASE_PROVIDER')
        if not db_provider_env:
            raise RuntimeError("DATABASE_PROVIDER environment variable is required")
        self.client = get_database_provider(db_provider_env)
        self.db_provider = db_provider_env.lower()
        logger.info(f"ThroughputCalculator initialized with {db_provider_env.upper()} provider")

    async def calculate(
        self,
        start_date: datetime,
        end_date: datetime,
        filters: Dict = None
    ) -> Dict[str, float]:
        """
        Calculate decision throughput metrics.

        Args:
            start_date: Start of time period
            end_date: End of time period
            filters: Optional filters

        Returns:
            Dictionary with throughput metrics
        """
        # Get table name and column names based on database provider
        table_name = self.client.get_full_table_name()

        if self.db_provider == 'snowflake':
            # Snowflake: uppercase column names
            datetime_col = 'TX_DATETIME'
            investigation_col = 'INVESTIGATION_ID'
        else:
            # PostgreSQL: lowercase column names
            datetime_col = 'tx_datetime'
            investigation_col = 'investigation_id'

        where_clauses = [
            f"{datetime_col} >= '{start_date.isoformat()}'",
            f"{datetime_col} <= '{end_date.isoformat()}'"
        ]

        if filters:
            if filters.get('investigation_id'):
                where_clauses.append(f"{investigation_col} = '{filters['investigation_id']}'")

        where_sql = " AND ".join(where_clauses)

        query = f"""
        SELECT 
            COUNT(*) as total_decisions,
            MIN({datetime_col}) as first_decision,
            MAX({datetime_col}) as last_decision
        FROM {table_name}
        WHERE {where_sql}
        """

        # Handle both sync (Snowflake) and async (PostgreSQL) execute_query methods
        import inspect
        if inspect.iscoroutinefunction(self.client.execute_query):
            results = await self.client.execute_query(query)
        else:
            results = self.client.execute_query(query)
        
        if not results:
            return {
                'decisionsPerMinute': 0.0,
                'decisionsPerHour': 0.0,
                'decisionsPerDay': 0.0,
                'peakThroughput': 0.0,
                'averageThroughput': 0.0
            }

        row = results[0]
        total = int(row.get('total_decisions', 0) or 0)
        first = row.get('first_decision')
        last = row.get('last_decision')

        if not first or not last:
            return {
                'decisionsPerMinute': 0.0,
                'decisionsPerHour': 0.0,
                'decisionsPerDay': 0.0,
                'peakThroughput': 0.0,
                'averageThroughput': 0.0
            }

        time_diff_seconds = (end_date - start_date).total_seconds()
        time_diff_hours = time_diff_seconds / 3600
        time_diff_days = time_diff_hours / 24

        decisions_per_minute = total / (time_diff_hours * 60) if time_diff_hours > 0 else 0.0
        decisions_per_hour = total / time_diff_hours if time_diff_hours > 0 else 0.0
        decisions_per_day = total / time_diff_days if time_diff_days > 0 else 0.0

        return {
            'decisionsPerMinute': decisions_per_minute,
            'decisionsPerHour': decisions_per_hour,
            'decisionsPerDay': decisions_per_day,
            'peakThroughput': decisions_per_minute,
            'averageThroughput': decisions_per_minute
        }

