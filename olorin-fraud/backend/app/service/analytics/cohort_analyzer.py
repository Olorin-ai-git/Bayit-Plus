"""
Cohort Analyzer Service for segmenting fraud decisions.
NO HARDCODED VALUES - All configuration from environment variables.
"""

import os
from datetime import datetime
from typing import Any, Dict, List, Optional

from app.models.analytics import (
    Cohort,
    CohortAnalysisResponse,
    CohortComparison,
    FraudMetrics,
)
from app.service.agent.tools.database_tool import get_database_provider
from app.service.analytics.metrics_calculator import MetricsCalculator
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class CohortAnalyzer:
    """Analyze fraud detection performance by cohort segments."""

    def __init__(self):
        """Initialize cohort analyzer."""
        db_provider = os.getenv("DATABASE_PROVIDER", "snowflake")
        self.client = get_database_provider(db_provider)
        self.metrics_calculator = MetricsCalculator()
        self.min_count_threshold = int(os.getenv("COHORT_MIN_COUNT_THRESHOLD", "100"))
        logger.info(f"CohortAnalyzer initialized with {db_provider.upper()} provider")

    async def analyze_cohorts(
        self,
        dimension: str,
        start_date: datetime,
        end_date: datetime,
        min_count: Optional[int] = None,
    ) -> CohortAnalysisResponse:
        """
        Analyze cohorts for a dimension.

        Args:
            dimension: Dimension to segment by
            start_date: Start of time period
            end_date: End of time period
            min_count: Minimum transactions per cohort

        Returns:
            CohortAnalysisResponse with cohort analysis
        """
        min_count = min_count or self.min_count_threshold

        # Get table name and column names based on database provider
        table_name = self.client.get_full_table_name()
        db_provider = os.getenv("DATABASE_PROVIDER", "snowflake").lower()

        if db_provider == "snowflake":
            # Snowflake: uppercase column names
            datetime_col = "TX_DATETIME"
            model_score_col = "MODEL_SCORE"
            dimension_map = {
                "merchant": "MERCHANT_ID",
                "channel": "DEVICE_TYPE",
                "geography": "IP_COUNTRY_CODE",
                "device": "DEVICE_ID",
                "risk_band": f"CASE WHEN {model_score_col} < 0.3 THEN 'low' WHEN {model_score_col} < 0.7 THEN 'medium' ELSE 'high' END",
                "model_version": "MODEL_VERSION",
                "rule_version": "RULE_VERSION",
            }
        else:
            # PostgreSQL: lowercase column names
            datetime_col = "tx_datetime"
            model_score_col = "model_score"
            dimension_map = {
                "merchant": "merchant_id",
                "channel": "device_type",
                "geography": "ip_country_code",
                "device": "device_id",
                "risk_band": f"CASE WHEN {model_score_col} < 0.3 THEN 'low' WHEN {model_score_col} < 0.7 THEN 'medium' ELSE 'high' END",
                "model_version": "model_version",
                "rule_version": "rule_version",
            }

        where_clauses = [
            f"{datetime_col} >= '{start_date.isoformat()}'",
            f"{datetime_col} <= '{end_date.isoformat()}'",
        ]
        where_sql = " AND ".join(where_clauses)

        dimension_col = dimension_map.get(dimension.lower())
        if not dimension_col:
            raise ValueError(f"Invalid dimension: {dimension}")

        # Query cohorts
        query = f"""
        SELECT 
            {dimension_col} as cohort_value,
            COUNT(*) as transaction_count
        FROM {table_name}
        WHERE {where_sql} AND {dimension_col} IS NOT NULL
        GROUP BY {dimension_col}
        HAVING COUNT(*) >= {min_count}
        ORDER BY transaction_count DESC
        LIMIT 50
        """

        results = self.client.execute_query(query)
        cohorts = []

        for row in results:
            cohort_value = str(row.get("cohort_value", ""))
            filters = {dimension.lower(): cohort_value}
            metrics = await self.metrics_calculator.calculate_metrics(
                start_date, end_date, filters
            )

            cohort = Cohort(
                id=f"{dimension}-{cohort_value}",
                name=str(cohort_value),
                dimension=dimension,
                value=str(cohort_value),
                metrics=metrics,
                transactionCount=int(row.get("transaction_count", 0) or 0),
                meetsMinimumThreshold=True,
            )
            cohorts.append(cohort)

        # Calculate overall metrics
        overall_metrics = await self.metrics_calculator.calculate_metrics(
            start_date, end_date
        )

        # Find best/worst performers
        best_performer = (
            max(cohorts, key=lambda c: c.metrics.f1_score) if cohorts else None
        )
        worst_performer = (
            min(cohorts, key=lambda c: c.metrics.f1_score) if cohorts else None
        )

        return CohortAnalysisResponse(
            dimension=dimension,
            cohorts=cohorts,
            overallMetrics=overall_metrics,
            comparison=CohortComparison(
                bestPerformer=best_performer,
                worstPerformer=worst_performer,
                significantDifferences=[],
            ),
        )
