"""
Training Data Extractor
Feature: 026-llm-training-pipeline

Extracts and balances training data from Snowflake with dual-period temporal holdout.

Training uses TWO periods that exclude the investigation window:
- Period 1: Historical data BEFORE investigation starts (>24 months ago)
- Period 2: GMV window AFTER investigation ends (12-6 months ago)

This ensures no overlap between training data and detection/investigation data.
"""

import os
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta
from typing import Any, List, Optional

from app.config.revenue_config import get_revenue_config
from app.service.logging import get_bridge_logger
from app.service.training.training_config_loader import get_training_config
from app.service.training.training_models import TrainingSample

logger = get_bridge_logger(__name__)


class TrainingDataExtractor:
    """Extracts training data from Snowflake."""

    def __init__(self):
        """Initialize data extractor."""
        self._config = get_training_config()

    async def extract_samples(
        self,
        merchant_name: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> List[TrainingSample]:
        """
        Extract training samples from Snowflake.

        Args:
            merchant_name: Filter by merchant
            start_date: Start of date range
            end_date: End of date range

        Returns:
            List of TrainingSample objects
        """
        from app.service.agent.tools.snowflake_tool.client import SnowflakeClient

        if end_date is None:
            end_date = datetime.utcnow() - timedelta(days=180)
        if start_date is None:
            start_date = end_date - timedelta(
                days=self._config.data_sampling.time_window_days
            )

        database = os.getenv("SNOWFLAKE_DATABASE")
        schema = os.getenv("SNOWFLAKE_SCHEMA")

        if not database or not schema:
            raise ValueError("SNOWFLAKE_DATABASE and SNOWFLAKE_SCHEMA must be set")

        client = SnowflakeClient()
        await client.connect(database=database, schema=schema)

        try:
            samples = await self._query_training_data(
                client, merchant_name, start_date, end_date
            )
            balanced = self._balance_samples(samples)
            logger.info(f"Extracted {len(balanced)} balanced training samples")
            return balanced
        finally:
            await client.disconnect()

    async def _query_training_data(
        self,
        client: Any,
        merchant_name: Optional[str],
        start_date: datetime,
        end_date: datetime,
    ) -> List[TrainingSample]:
        """Query training data from Snowflake with temporal holdout."""
        from app.service.agent.tools.snowflake_tool.schema_constants import (
            get_full_table_name,
        )

        table = get_full_table_name()
        merchant_filter = (
            f"AND MERCHANT_NAME = '{merchant_name}'" if merchant_name else ""
        )

        holdout = self._config.temporal_holdout
        if holdout and holdout.enabled:
            return await self._query_temporal_holdout(
                client, table, merchant_filter, holdout.min_transactions_in_feature_period
            )

        return await self._query_legacy(
            client, table, merchant_filter, start_date, end_date
        )

    async def _query_temporal_holdout(
        self, client: Any, table: str, merchant_filter: str, min_tx: int
    ) -> List[TrainingSample]:
        """
        Query with dual-period temporal holdout to prevent data leakage.

        Training uses TWO periods that exclude the investigation window:
        - Period 1: Historical data BEFORE investigation starts
        - Period 2: GMV window AFTER investigation ends

        Timeline:
        |---Period 1---|---Investigation (EXCLUDED)---|---Period 2 (GMV)---|---Recent---|
           >24mo ago          24-12 months ago            12-6 months ago     <6mo ago
        """
        revenue_config = get_revenue_config()
        holdout = self._config.temporal_holdout
        feature_months = holdout.feature_period_months
        observation_months = holdout.observation_period_months

        now = datetime.utcnow()

        # Investigation window (EXCLUDED from training)
        inv_start = now - relativedelta(months=revenue_config.investigation_window_start_months)
        inv_end = now - relativedelta(months=revenue_config.investigation_window_end_months)

        # Training Period 1: Historical (before investigation)
        # Features from even further back, labels up to investigation start
        period1_label_end = inv_start  # Labels end where investigation starts
        period1_label_start = period1_label_end - relativedelta(months=observation_months)
        period1_feature_end = period1_label_start
        period1_feature_start = period1_feature_end - relativedelta(months=feature_months)

        # Training Period 2: GMV window (after investigation)
        # This is where we have confirmed fraud outcomes
        period2_label_start = now - relativedelta(months=revenue_config.saved_fraud_gmv_start_months)
        period2_label_end = now - relativedelta(months=revenue_config.saved_fraud_gmv_end_months)
        period2_feature_end = period2_label_start
        period2_feature_start = period2_feature_end - relativedelta(months=feature_months)

        logger.info("=" * 60)
        logger.info("DUAL-PERIOD TRAINING DATA EXTRACTION")
        logger.info("=" * 60)
        logger.info(f"Investigation window (EXCLUDED): {inv_start.date()} to {inv_end.date()}")
        logger.info(f"Period 1 (Historical):")
        logger.info(f"  Features: {period1_feature_start.date()} to {period1_feature_end.date()}")
        logger.info(f"  Labels:   {period1_label_start.date()} to {period1_label_end.date()}")
        logger.info(f"Period 2 (GMV Window):")
        logger.info(f"  Features: {period2_feature_start.date()} to {period2_feature_end.date()}")
        logger.info(f"  Labels:   {period2_label_start.date()} to {period2_label_end.date()}")
        logger.info("=" * 60)

        # Query both periods and combine results
        samples_p1 = await self._query_single_period(
            client, table, merchant_filter, min_tx,
            period1_feature_start, period1_feature_end,
            period1_label_start, period1_label_end,
            "Period1_Historical"
        )

        samples_p2 = await self._query_single_period(
            client, table, merchant_filter, min_tx,
            period2_feature_start, period2_feature_end,
            period2_label_start, period2_label_end,
            "Period2_GMV"
        )

        logger.info(f"Period 1 samples: {len(samples_p1)} ({sum(1 for s in samples_p1 if s.is_fraud)} fraud)")
        logger.info(f"Period 2 samples: {len(samples_p2)} ({sum(1 for s in samples_p2 if s.is_fraud)} fraud)")

        combined = samples_p1 + samples_p2
        logger.info(f"Combined samples: {len(combined)} ({sum(1 for s in combined if s.is_fraud)} fraud)")

        return combined

    async def _query_single_period(
        self, client: Any, table: str, merchant_filter: str, min_tx: int,
        feature_start: datetime, feature_end: datetime,
        label_start: datetime, label_end: datetime,
        period_name: str
    ) -> List[TrainingSample]:
        """Query a single training period with stratified sampling."""
        half_limit = self._config.data_sampling.max_sample_size // 2
        query = f"""
        WITH feature_period AS (
            SELECT
                EMAIL,
                COUNT(*) as tx_count,
                SUM(GMV) as total_gmv,
                COUNT(DISTINCT IP) as ip_count,
                COUNT(DISTINCT FIPP_VISITOR_ID) as device_count,
                COUNT(DISTINCT MERCHANT_NAME) as merchant_count,
                AVG(GMV) as avg_tx_value,
                STDDEV(GMV) as std_tx_value,
                MIN(TX_DATETIME) as first_tx,
                MAX(TX_DATETIME) as last_tx,
                MAX(MERCHANT_NAME) as merchant
            FROM {table}
            WHERE TX_DATETIME BETWEEN '{feature_start.isoformat()}' AND '{feature_end.isoformat()}'
              AND EMAIL IS NOT NULL
              {merchant_filter}
            GROUP BY EMAIL
            HAVING COUNT(*) >= {min_tx}
        ),
        observation_period AS (
            SELECT
                EMAIL,
                MAX(IS_FRAUD_TX) as committed_fraud
            FROM {table}
            WHERE TX_DATETIME BETWEEN '{label_start.isoformat()}' AND '{label_end.isoformat()}'
              AND EMAIL IS NOT NULL
            GROUP BY EMAIL
        ),
        labeled_data AS (
            SELECT
                f.EMAIL,
                f.tx_count,
                f.total_gmv,
                f.ip_count,
                f.device_count,
                f.merchant_count,
                f.avg_tx_value,
                f.std_tx_value,
                f.first_tx,
                f.last_tx,
                f.merchant,
                COALESCE(o.committed_fraud, 0) as is_fraud
            FROM feature_period f
            LEFT JOIN observation_period o ON f.EMAIL = o.EMAIL
        ),
        fraud_samples AS (
            SELECT * FROM labeled_data WHERE is_fraud = 1 LIMIT {half_limit}
        ),
        legit_samples AS (
            SELECT * FROM labeled_data WHERE is_fraud = 0 LIMIT {half_limit}
        )
        SELECT * FROM fraud_samples
        UNION ALL
        SELECT * FROM legit_samples
        """

        results = await client.execute_query(query)
        return self._parse_temporal_results(results)

    async def _query_legacy(
        self, client: Any, table: str, merchant_filter: str,
        start_date: datetime, end_date: datetime
    ) -> List[TrainingSample]:
        """Legacy query (no temporal holdout - has data leakage)."""
        logger.warning("Using legacy query without temporal holdout - potential leakage")
        # CRITICAL: Use GMV for USD-normalized amounts, not PAID_AMOUNT_VALUE_IN_CURRENCY (local currency)
        query = f"""
        SELECT
            EMAIL,
            COUNT(*) as tx_count,
            SUM(GMV) as total_gmv,
            MAX(IS_FRAUD_TX) as has_fraud,
            COUNT(DISTINCT IP) as ip_count,
            COUNT(DISTINCT FIPP_VISITOR_ID) as device_count,
            MIN(TX_DATETIME) as first_tx,
            MAX(TX_DATETIME) as last_tx,
            MAX(MERCHANT_NAME) as merchant
        FROM {table}
        WHERE TX_DATETIME BETWEEN '{start_date.isoformat()}' AND '{end_date.isoformat()}'
          AND EMAIL IS NOT NULL
          {merchant_filter}
        GROUP BY EMAIL
        HAVING COUNT(*) >= 2
        LIMIT {self._config.data_sampling.max_sample_size * 2}
        """
        results = await client.execute_query(query)
        return self._parse_legacy_results(results)

    def _parse_temporal_results(self, results: List[Any]) -> List[TrainingSample]:
        """Parse temporal holdout results - NO fraud_tx_count feature."""
        samples = []
        for row in results:
            features = {
                "total_transactions": int(row.get("TX_COUNT", 0)),
                "total_gmv": float(row.get("TOTAL_GMV", 0) or 0),
                "ip_count": int(row.get("IP_COUNT", 0)),
                "device_count": int(row.get("DEVICE_COUNT", 0)),
                "merchant_count": int(row.get("MERCHANT_COUNT", 0)),
                "avg_tx_value": float(row.get("AVG_TX_VALUE", 0) or 0),
                "std_tx_value": float(row.get("STD_TX_VALUE", 0) or 0),
                "first_tx_date": str(row.get("FIRST_TX", "")),
                "last_tx_date": str(row.get("LAST_TX", "")),
            }
            samples.append(
                TrainingSample(
                    entity_type="email",
                    entity_value=row.get("EMAIL", ""),
                    features=features,
                    is_fraud=int(row.get("IS_FRAUD", 0)) == 1,
                    merchant_name=row.get("MERCHANT"),
                )
            )
        return samples

    def _parse_legacy_results(self, results: List[Any]) -> List[TrainingSample]:
        """Parse legacy results (kept for backward compatibility)."""
        samples = []
        for row in results:
            features = {
                "total_transactions": int(row.get("TX_COUNT", 0)),
                "total_gmv": float(row.get("TOTAL_GMV", 0) or 0),
                "ip_count": int(row.get("IP_COUNT", 0)),
                "device_count": int(row.get("DEVICE_COUNT", 0)),
                "first_tx_date": str(row.get("FIRST_TX", "")),
                "last_tx_date": str(row.get("LAST_TX", "")),
            }
            samples.append(
                TrainingSample(
                    entity_type="email",
                    entity_value=row.get("EMAIL", ""),
                    features=features,
                    is_fraud=int(row.get("HAS_FRAUD", 0)) == 1,
                    merchant_name=row.get("MERCHANT"),
                )
            )
        return samples

    def _balance_samples(self, samples: List[TrainingSample]) -> List[TrainingSample]:
        """Balance samples by fraud ratio."""
        fraud_samples = [s for s in samples if s.is_fraud]
        legit_samples = [s for s in samples if not s.is_fraud]

        target_ratio = self._config.data_sampling.fraud_ratio
        max_samples = self._config.data_sampling.max_sample_size

        if len(fraud_samples) == 0:
            return legit_samples[:max_samples]

        fraud_count = int(max_samples * target_ratio)
        legit_count = max_samples - fraud_count

        balanced_fraud = fraud_samples[:fraud_count]
        balanced_legit = legit_samples[:legit_count]

        return balanced_fraud + balanced_legit
