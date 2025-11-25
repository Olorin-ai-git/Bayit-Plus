"""
Data Availability Check Service

Checks if transaction data exists for given entity and time windows
before running a full comparison. Useful for pre-validation.

Constitutional Compliance:
- Uses existing database provider infrastructure
- No hardcoded business logic
- Returns clear availability status
"""

from datetime import datetime
from typing import Any, Dict, Optional, Tuple

from app.service.agent.tools.database_tool import get_database_provider
from app.service.investigation.entity_filtering import (
    build_entity_where_clause,
    build_merchant_where_clause,
)
from app.service.investigation.query_builder import build_transaction_query
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


async def check_data_availability(
    entity_type: Optional[str],
    entity_value: Optional[str],
    window_a_start: datetime,
    window_a_end: datetime,
    window_b_start: datetime,
    window_b_end: datetime,
    merchant_ids: Optional[list[str]] = None,
    is_snowflake: Optional[bool] = None,
) -> Dict[str, Any]:
    """
    Check if transaction data exists for given entity and time windows.

    Args:
        entity_type: Entity type (email, phone, etc.)
        entity_value: Entity value
        window_a_start: Window A start time
        window_a_end: Window A end time
        window_b_start: Window B start time
        window_b_end: Window B end time
        merchant_ids: Optional merchant filter
        is_snowflake: Optional override for database type detection

    Returns:
        Dict with availability status for each window and overall status
    """
    import inspect
    import os

    if is_snowflake is None:
        is_snowflake = (
            os.getenv("DATABASE_PROVIDER", "snowflake").lower() == "snowflake"
        )

    db_provider = get_database_provider()
    db_provider.connect()
    is_async = hasattr(db_provider, "execute_query_async")

    entity_clause, _ = build_entity_where_clause(
        entity_type, entity_value, is_snowflake
    )
    merchant_clause, _ = build_merchant_where_clause(merchant_ids, is_snowflake)

    # Build simple count queries (more efficient than fetching all data)
    table_name = db_provider.get_full_table_name()

    if is_snowflake:
        datetime_col = "TX_DATETIME"
    else:
        datetime_col = "tx_datetime"

    where_parts_a = [
        f"{datetime_col} >= '{window_a_start.isoformat()}'",
        f"{datetime_col} < '{window_a_end.isoformat()}'",
    ]
    where_parts_b = [
        f"{datetime_col} >= '{window_b_start.isoformat()}'",
        f"{datetime_col} < '{window_b_end.isoformat()}'",
    ]

    if entity_clause:
        where_parts_a.append(entity_clause)
        where_parts_b.append(entity_clause)
    if merchant_clause:
        where_parts_a.append(merchant_clause)
        where_parts_b.append(merchant_clause)

    where_a = " AND ".join(where_parts_a)
    where_b = " AND ".join(where_parts_b)

    count_query_a = f"SELECT COUNT(*) as count FROM {table_name} WHERE {where_a}"
    count_query_b = f"SELECT COUNT(*) as count FROM {table_name} WHERE {where_b}"

    # Execute count queries
    if is_async:
        result_a = await db_provider.execute_query_async(count_query_a)
        result_b = await db_provider.execute_query_async(count_query_b)
    else:
        result_a = db_provider.execute_query(count_query_a)
        result_b = db_provider.execute_query(count_query_b)

    # Extract count from result
    count_a = result_a[0].get("count", 0) if result_a and len(result_a) > 0 else 0
    count_b = result_b[0].get("count", 0) if result_b and len(result_b) > 0 else 0

    available = count_a > 0 and count_b > 0

    entity_info = "all entities"
    if entity_type and entity_value:
        entity_info = f"{entity_type}:{entity_value}"

    return {
        "available": available,
        "entity": entity_info,
        "window_a": {
            "start": window_a_start.isoformat(),
            "end": window_a_end.isoformat(),
            "count": count_a,
            "has_data": count_a > 0,
        },
        "window_b": {
            "start": window_b_start.isoformat(),
            "end": window_b_end.isoformat(),
            "count": count_b,
            "has_data": count_b > 0,
        },
        "message": (
            f"Data availability check for {entity_info}: "
            f"Window A has {count_a} transactions, Window B has {count_b} transactions. "
            f"{'Both windows have data - comparison can proceed.' if available else 'One or both windows lack data - comparison not recommended.'}"
        ),
    }
