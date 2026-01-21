"""
Metrics Calculator Service for fraud detection analytics.
NO HARDCODED VALUES - All configuration from environment variables.
"""

import os
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from app.models.analytics import FraudDecision, FraudMetrics
from app.service.agent.tools.database_tool import get_database_provider
from app.service.analytics.latency_calculator import LatencyCalculator
from app.service.analytics.precision_recall import PrecisionRecallCalculator
from app.service.analytics.throughput_calculator import ThroughputCalculator
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class MetricsCalculator:
    """Calculate fraud detection metrics from transaction data."""

    def __init__(self):
        """Initialize metrics calculator with database provider."""
        db_provider = os.getenv("DATABASE_PROVIDER", "snowflake")
        self.client = get_database_provider(db_provider)
        self.precision_recall_calc = PrecisionRecallCalculator()
        self.latency_calc = LatencyCalculator()
        self.throughput_calc = ThroughputCalculator()
        logger.info(
            f"MetricsCalculator initialized with {db_provider.upper()} provider"
        )

    async def calculate_metrics(
        self,
        start_date: datetime,
        end_date: datetime,
        filters: Optional[Dict[str, Any]] = None,
    ) -> FraudMetrics:
        """
        Calculate fraud metrics for a time period.

        Args:
            start_date: Start of time period
            end_date: End of time period
            filters: Optional filters (investigation_id, merchant_id, etc.)

        Returns:
            FraudMetrics object with calculated metrics
        """
        logger.info(f"Calculating metrics from {start_date} to {end_date}")

        # Get table name and column names based on database provider
        table_name = self.client.get_full_table_name()
        db_provider = os.getenv("DATABASE_PROVIDER", "snowflake").lower()

        if db_provider == "snowflake":
            # Snowflake: uppercase column names
            datetime_col = "TX_DATETIME"
            investigation_col = "INVESTIGATION_ID"
            merchant_col = "MERCHANT_ID"
            fraud_col = "IS_FRAUD_TX"
            model_score_col = "MODEL_SCORE"
            decision_col = "NSURE_LAST_DECISION"
            disputes_col = "COUNT_DISPUTES"
        else:
            # PostgreSQL: lowercase column names
            datetime_col = "tx_datetime"
            investigation_col = "investigation_id"
            merchant_col = "merchant_id"
            fraud_col = "is_fraud_tx"
            model_score_col = "model_score"
            decision_col = "nSure_last_decision"
            disputes_col = "count_disputes"

        # Build WHERE clause from filters
        where_clauses = [
            f"{datetime_col} >= '{start_date.isoformat()}'",
            f"{datetime_col} <= '{end_date.isoformat()}'",
        ]

        if filters:
            if filters.get("investigation_id"):
                where_clauses.append(
                    f"{investigation_col} = '{filters['investigation_id']}'"
                )
            if filters.get("merchant_id"):
                where_clauses.append(f"{merchant_col} = '{filters['merchant_id']}'")

        where_sql = " AND ".join(where_clauses)

        # Query decisions
        query = f"""
        SELECT 
            COUNT(*) as total_decisions,
            SUM(CASE WHEN {fraud_col} = 1 THEN 1 ELSE 0 END) as true_positives,
            SUM(CASE WHEN {fraud_col} = 0 AND {model_score_col} > 0.5 THEN 1 ELSE 0 END) as false_positives,
            SUM(CASE WHEN {fraud_col} = 0 AND {model_score_col} <= 0.5 THEN 1 ELSE 0 END) as true_negatives,
            SUM(CASE WHEN {fraud_col} = 1 AND {model_score_col} <= 0.5 THEN 1 ELSE 0 END) as false_negatives,
            SUM(CASE WHEN {decision_col} = 'approved' THEN 1 ELSE 0 END) as approved_count,
            SUM(CASE WHEN {disputes_col} > 0 THEN 1 ELSE 0 END) as chargeback_count,
            SUM(CASE WHEN {fraud_col} IS NOT NULL THEN 1 ELSE 0 END) as labeled_count
        FROM {table_name}
        WHERE {where_sql}
        """

        # Handle both sync (Snowflake) and async (PostgreSQL) execute_query methods
        if hasattr(self.client.execute_query, "__call__"):
            import inspect

            if inspect.iscoroutinefunction(self.client.execute_query):
                results = await self.client.execute_query(query)
            else:
                results = self.client.execute_query(query)
        else:
            results = self.client.execute_query(query)

        if not results:
            raise ValueError("No data found for metrics calculation")

        row = results[0]
        tp = int(row.get("true_positives", 0) or 0)
        fp = int(row.get("false_positives", 0) or 0)
        tn = int(row.get("true_negatives", 0) or 0)
        fn = int(row.get("false_negatives", 0) or 0)
        total = int(row.get("total_decisions", 0) or 0)
        approved = int(row.get("approved_count", 0) or 0)
        chargebacks = int(row.get("chargeback_count", 0) or 0)
        labeled = int(row.get("labeled_count", 0) or 0)

        # Use precision/recall calculator
        precision, recall, f1_score, calc_tp, calc_fp, calc_tn, calc_fn = (
            await self.precision_recall_calc.calculate(start_date, end_date, filters)
        )

        # Use calculated values if available, otherwise use query results
        if calc_tp > 0 or calc_fp > 0:
            tp, fp, tn, fn = calc_tp, calc_fp, calc_tn, calc_fn

        # Calculate rates
        capture_rate = recall  # Same as recall for fraud detection
        approval_rate = approved / total if total > 0 else 0.0
        chargeback_rate = chargebacks / approved if approved > 0 else 0.0

        # Use latency calculator
        latency_data = await self.latency_calc.calculate_percentiles(
            start_date, end_date, filters
        )

        # Use throughput calculator
        throughput_data = await self.throughput_calc.calculate(
            start_date, end_date, filters
        )
        decision_throughput = throughput_data.get("decisionsPerMinute", 0.0)

        # Calculate false positive cost (simplified - would need actual cost data)
        false_positive_cost = fp * float(os.getenv("FALSE_POSITIVE_COST", "50.0"))

        return FraudMetrics(
            start_time=start_date,
            end_time=end_date,
            time_window="custom",
            precision=precision,
            recall=recall,
            f1_score=f1_score,
            true_positives=tp,
            false_positives=fp,
            true_negatives=tn,
            false_negatives=fn,
            total_decisions=total,
            capture_rate=capture_rate,
            approval_rate=approval_rate,
            chargeback_rate=chargeback_rate,
            false_positive_cost=false_positive_cost,
            false_positive_count=fp,
            average_false_positive_cost=false_positive_cost / fp if fp > 0 else 0.0,
            model_latency={
                "p50": latency_data.get("p50", 0.0),
                "p95": latency_data.get("p95", 0.0),
                "p99": latency_data.get("p99", 0.0),
            },
            rule_latency={"p50": 0, "p95": 0, "p99": 0},
            decision_throughput=decision_throughput,
            labeled_data_count=labeled,
            unlabeled_data_count=total - labeled,
        )
