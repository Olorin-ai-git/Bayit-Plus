"""
Analytics Repository for data access layer.
NO HARDCODED VALUES - All configuration from environment variables.
"""

import os
from datetime import datetime
from typing import Any, Dict, List, Optional

from app.service.agent.tools.database_tool import get_database_provider
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class AnalyticsRepository:
    """Repository for analytics data access."""

    def __init__(self):
        """Initialize analytics repository."""
        db_provider = os.getenv("DATABASE_PROVIDER", "snowflake")
        self.client = get_database_provider(db_provider)
        logger.info(
            f"AnalyticsRepository initialized with {db_provider.upper()} provider"
        )

    def get_fraud_decisions(
        self,
        start_date: datetime,
        end_date: datetime,
        filters: Optional[Dict[str, Any]] = None,
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        """
        Get fraud decisions for a time period.

        Args:
            start_date: Start of time period
            end_date: End of time period
            filters: Optional filters
            limit: Maximum number of records

        Returns:
            List of fraud decision dictionaries
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

        # Get table name and column names based on database provider
        table_name = self.client.get_full_table_name()
        db_provider = os.getenv("DATABASE_PROVIDER", "snowflake").lower()

        if db_provider == "snowflake":
            # Snowflake: uppercase column names
            datetime_col = "TX_DATETIME"
            id_col = "TX_ID_KEY"
            investigation_col = "INVESTIGATION_ID"
            decision_col = "NSURE_LAST_DECISION"
            model_score_col = "MODEL_SCORE"
            rule_score_col = "RULE_BASED_SCORE"
            model_version_col = "MODEL_VERSION"
            merchant_col = "MERCHANT_ID"
            device_col = "DEVICE_ID"
            country_col = "IP_COUNTRY_CODE"
            fraud_col = "IS_FRAUD_TX"
        else:
            # PostgreSQL: lowercase column names
            datetime_col = "tx_datetime"
            id_col = "tx_id_key"
            investigation_col = "investigation_id"
            decision_col = "nSure_last_decision"
            model_score_col = "model_score"
            rule_score_col = "rule_based_score"
            model_version_col = "model_version"
            merchant_col = "merchant_id"
            device_col = "device_id"
            country_col = "ip_country_code"
            fraud_col = "is_fraud_tx"

        query = f"""
        SELECT 
            {id_col} as id,
            {id_col} as transaction_id,
            {investigation_col} as investigation_id,
            {datetime_col} as timestamp,
            {decision_col} as decision,
            {model_score_col} as model_score,
            {rule_score_col} as rule_score,
            {model_score_col} as final_score,
            {model_version_col} as model_version,
            {merchant_col} as merchant_id,
            {device_col} as device_id,
            {country_col} as ip_country,
            {fraud_col} as is_fraud_tx
        FROM {table_name}
        WHERE {where_sql}
        ORDER BY {datetime_col} DESC
        LIMIT {limit}
        """

        return self.client.execute_query(query)
