"""
Training Data Extractor
Feature: 026-llm-training-pipeline

Extracts and balances training data from Snowflake with temporal holdout.
Uses proper ML evaluation: features from one period, labels from the next.
"""

import os
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta
from typing import Any, List, Optional

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
        """Query with temporal holdout to prevent data leakage."""
        holdout = self._config.temporal_holdout
        feature_months = holdout.feature_period_months
        observation_months = holdout.observation_period_months

        observation_end = datetime.utcnow()
        observation_start = observation_end - relativedelta(months=observation_months)
        feature_end = observation_start
        feature_start = feature_end - relativedelta(months=feature_months)

        logger.info(f"Temporal holdout: features {feature_start} to {feature_end}")
        logger.info(f"Temporal holdout: labels {observation_start} to {observation_end}")

        # CRITICAL: Use GMV for USD-normalized amounts, not PAID_AMOUNT_VALUE_IN_CURRENCY (local currency)
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
            WHERE TX_DATETIME BETWEEN '{observation_start.isoformat()}' AND '{observation_end.isoformat()}'
              AND EMAIL IS NOT NULL
            GROUP BY EMAIL
        )
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
        LIMIT {self._config.data_sampling.max_sample_size * 2}
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
