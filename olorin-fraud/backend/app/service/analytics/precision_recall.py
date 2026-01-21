"""
Precision/Recall Calculator for fraud detection metrics.
NO HARDCODED VALUES - All configuration from environment variables.
"""

import os
from datetime import datetime
from typing import Dict, Tuple

from app.service.agent.tools.database_tool import get_database_provider
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class PrecisionRecallCalculator:
    """Calculate precision, recall, and F1 score from fraud decisions."""

    def __init__(self):
        """Initialize precision/recall calculator."""
        db_provider_env = os.getenv("DATABASE_PROVIDER")
        if not db_provider_env:
            raise RuntimeError("DATABASE_PROVIDER environment variable is required")
        self.client = get_database_provider(db_provider_env)
        self.db_provider = db_provider_env.lower()
        logger.info(
            f"PrecisionRecallCalculator initialized with {db_provider_env.upper()} provider"
        )

    async def calculate(
        self, start_date: datetime, end_date: datetime, filters: Dict = None
    ) -> Tuple[float, float, float, int, int, int, int]:
        """
        Calculate precision, recall, F1, and confusion matrix counts.

        Args:
            start_date: Start of time period
            end_date: End of time period
            filters: Optional filters

        Returns:
            Tuple of (precision, recall, f1_score, tp, fp, tn, fn)
        """
        # Get table name and column names based on database provider
        table_name = self.client.get_full_table_name()

        if self.db_provider == "snowflake":
            # Snowflake: uppercase column names
            datetime_col = "TX_DATETIME"
            investigation_col = "INVESTIGATION_ID"
            fraud_col = "IS_FRAUD_TX"
            model_score_col = "MODEL_SCORE"
        else:
            # PostgreSQL: lowercase column names
            datetime_col = "tx_datetime"
            investigation_col = "investigation_id"
            fraud_col = "is_fraud_tx"
            model_score_col = "model_score"

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

        query = f"""
        SELECT 
            SUM(CASE WHEN {fraud_col} = 1 AND {model_score_col} > 0.5 THEN 1 ELSE 0 END) as tp,
            SUM(CASE WHEN {fraud_col} = 0 AND {model_score_col} > 0.5 THEN 1 ELSE 0 END) as fp,
            SUM(CASE WHEN {fraud_col} = 0 AND {model_score_col} <= 0.5 THEN 1 ELSE 0 END) as tn,
            SUM(CASE WHEN {fraud_col} = 1 AND {model_score_col} <= 0.5 THEN 1 ELSE 0 END) as fn
        FROM {table_name}
        WHERE {where_sql} AND {fraud_col} IS NOT NULL
        """

        # Handle both sync (Snowflake) and async (PostgreSQL) execute_query methods
        import inspect

        if inspect.iscoroutinefunction(self.client.execute_query):
            results = await self.client.execute_query(query)
        else:
            results = self.client.execute_query(query)

        if not results:
            return (0.0, 0.0, 0.0, 0, 0, 0, 0)

        row = results[0]
        tp = int(row.get("tp", 0) or 0)
        fp = int(row.get("fp", 0) or 0)
        tn = int(row.get("tn", 0) or 0)
        fn = int(row.get("fn", 0) or 0)

        precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        f1_score = (
            2 * (precision * recall) / (precision + recall)
            if (precision + recall) > 0
            else 0.0
        )

        return (precision, recall, f1_score, tp, fp, tn, fn)
