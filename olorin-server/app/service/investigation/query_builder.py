"""
Query Builder Service

Builds SQL queries for fetching transactions from database.

Constitutional Compliance:
- Supports both Snowflake and PostgreSQL
- Dynamic column naming based on database provider
- No hardcoded table/column names
"""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field

from app.service.agent.tools.database_tool import get_database_provider
from app.service.agent.tools.database_tool.database_provider import DatabaseProvider


class InvestigationQueryConfig(BaseModel):
    """Configuration for investigation query column exclusion."""

    exclude_columns: List[str] = Field(
        default_factory=lambda: ["MODEL_SCORE", "IS_FRAUD_TX"],
        description="Columns to exclude from investigation queries",
    )
    database_provider: str = Field(
        ..., description="Database provider: 'snowflake' or 'postgresql'"
    )

    def get_excluded_columns(self) -> List[str]:
        """Get excluded columns with proper case for database provider."""
        if self.database_provider.lower() == "snowflake":
            return ["MODEL_SCORE", "IS_FRAUD_TX"]
        else:
            return ["model_score", "is_fraud_tx"]

    def exclude_columns_from_select(self, columns: List[str]) -> List[str]:
        """Filter out excluded columns from SELECT clause."""
        excluded = self.get_excluded_columns()
        excluded_upper = [col.upper() for col in excluded]
        return [col for col in columns if col.upper() not in excluded_upper]


def build_transaction_query(
    window_start: datetime,
    window_end: datetime,
    entity_clause: str,
    merchant_clause: str,
    is_snowflake: bool,
    db_provider: Optional[DatabaseProvider] = None,
    is_investigation: bool = False,
) -> str:
    """
    Build SQL query for fetching transactions.

    Args:
        window_start: Start of time window
        window_end: End of time window
        entity_clause: Entity filter clause
        merchant_clause: Merchant filter clause
        is_snowflake: Whether using Snowflake (affects column naming)
        db_provider: Database provider instance
        is_investigation: If True, exclude MODEL_SCORE and IS_FRAUD_TX (CRITICAL for unbiased investigation)

    Returns:
        SQL query string
    """
    if db_provider is None:
        db_provider = get_database_provider()
    table_name = db_provider.get_full_table_name()

    if is_snowflake:
        tx_id_col = "TX_ID_KEY"
        datetime_col = "TX_DATETIME"
        predicted_risk_col = "MODEL_SCORE"
        actual_outcome_col = "IS_FRAUD_TX"
        merchant_col = "STORE_ID"
        db_provider_name = "snowflake"
    else:
        tx_id_col = "tx_id_key"
        datetime_col = "tx_datetime"
        predicted_risk_col = "model_score"
        actual_outcome_col = "is_fraud_tx"
        merchant_col = "store_id"
        db_provider_name = "postgresql"

    where_parts = [
        f"{datetime_col} >= '{window_start.isoformat()}'",
        f"{datetime_col} < '{window_end.isoformat()}'",
    ]

    if entity_clause:
        where_parts.append(entity_clause)
    if merchant_clause:
        where_parts.append(merchant_clause)

    where_sql = " AND ".join(where_parts)

    # CRITICAL: During investigation, exclude MODEL_SCORE and IS_FRAUD_TX to prevent contamination
    # After investigation, IS_FRAUD_TX is included for comparison (but MODEL_SCORE remains excluded)
    select_parts = [
        f"{tx_id_col} as transaction_id",
        f"{merchant_col} as merchant_id",
        f"{datetime_col} as event_ts",
    ]

    if not is_investigation:
        # For comparison queries (post-investigation), include IS_FRAUD_TX for ground truth
        select_parts.append(f"{actual_outcome_col} as actual_outcome")

    # MODEL_SCORE is NEVER included (excluded during investigation and comparison)
    # IS_FRAUD_TX is excluded during investigation, but included for comparison

    query = f"""
    SELECT
        {', '.join(select_parts)}
    FROM {table_name}
    WHERE {where_sql}
    """

    return query
