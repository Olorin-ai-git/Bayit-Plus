#!/usr/bin/env python3
"""
Find Entities with Data in Multiple Time Windows

Helps identify entities that have transaction data in multiple time periods
for meaningful comparison testing.
"""

import asyncio
import os
import sys
from datetime import datetime, timedelta

import pytz

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.service.agent.tools.database_tool import get_database_provider
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


async def find_entities_with_data():
    """Find entities that have data in multiple time windows."""
    tz = pytz.timezone("America/New_York")
    now = datetime.now(tz)
    recent_end = now.replace(hour=0, minute=0, second=0, microsecond=0)
    recent_start = recent_end - timedelta(days=14)
    previous_start = recent_end - timedelta(days=28)
    previous_end = recent_end - timedelta(days=14)

    db_provider = get_database_provider()
    db_provider.connect()
    is_snowflake = os.getenv("DATABASE_PROVIDER", "snowflake").lower() == "snowflake"
    import inspect

    is_async = inspect.iscoroutinefunction(db_provider.execute_query)

    table_name = db_provider.get_full_table_name()

    if is_snowflake:
        email_col = "EMAIL_NORMALIZED"
        datetime_col = "TX_DATETIME"
    else:
        email_col = "email_normalized"
        datetime_col = "tx_datetime"

    # Find emails with transactions in both windows
    query = f"""
    WITH recent_window AS (
        SELECT DISTINCT {email_col} as email
        FROM {table_name}
        WHERE {datetime_col} >= '{recent_start.isoformat()}'
          AND {datetime_col} < '{recent_end.isoformat()}'
          AND {email_col} IS NOT NULL
    ),
    previous_window AS (
        SELECT DISTINCT {email_col} as email
        FROM {table_name}
        WHERE {datetime_col} >= '{previous_start.isoformat()}'
          AND {datetime_col} < '{previous_end.isoformat()}'
          AND {email_col} IS NOT NULL
    )
    SELECT r.email, 
           (SELECT COUNT(*) FROM {table_name} WHERE {email_col} = r.email 
            AND {datetime_col} >= '{recent_start.isoformat()}' 
            AND {datetime_col} < '{recent_end.isoformat()}') as recent_count,
           (SELECT COUNT(*) FROM {table_name} WHERE {email_col} = r.email 
            AND {datetime_col} >= '{previous_start.isoformat()}' 
            AND {datetime_col} < '{previous_end.isoformat()}') as previous_count
    FROM recent_window r
    INNER JOIN previous_window p ON r.email = p.email
    ORDER BY recent_count DESC
    LIMIT 10
    """

    if is_async:
        results = await db_provider.execute_query(query)
    else:
        results = db_provider.execute_query(query)

    logger.info(f"Found {len(results)} entities with data in both windows:")
    for i, row in enumerate(results, 1):
        email = row.get("email", "N/A")
        recent_count = row.get("recent_count", 0)
        previous_count = row.get("previous_count", 0)
        logger.info(f"  {i}. {email}: Recent={recent_count}, Previous={previous_count}")

    if len(results) > 0:
        best_entity = results[0].get("email")
        logger.info(f"\n✅ Best entity for testing: {best_entity}")
        return best_entity
    else:
        logger.warning("No entities found with data in both windows")
        return None


if __name__ == "__main__":
    asyncio.run(find_entities_with_data())
