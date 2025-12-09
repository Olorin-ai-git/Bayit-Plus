"""
Training Data Extractor
Feature: 026-llm-training-pipeline

Extracts and balances training data from Snowflake.
"""

import os
from datetime import datetime, timedelta
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
        """Query training data from Snowflake."""
        from app.service.agent.tools.snowflake_tool.schema_constants import (
            get_full_table_name,
        )

        table = get_full_table_name()
        merchant_filter = (
            f"AND MERCHANT_NAME = '{merchant_name}'" if merchant_name else ""
        )

        query = f"""
        SELECT
            EMAIL,
            COUNT(*) as tx_count,
            SUM(PAID_AMOUNT_VALUE_IN_CURRENCY) as total_gmv,
            SUM(CASE WHEN IS_FRAUD_TX = 1 THEN 1 ELSE 0 END) as fraud_count,
            MAX(IS_FRAUD_TX) as has_fraud,
            COUNT(DISTINCT IP_ADDRESS) as ip_count,
            COUNT(DISTINCT DEVICE_FINGERPRINT) as device_count,
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
        return self._parse_results(results)

    def _parse_results(self, results: List[Any]) -> List[TrainingSample]:
        """Parse query results into TrainingSample objects."""
        samples = []
        for row in results:
            features = {
                "total_transactions": int(row.get("TX_COUNT", 0)),
                "total_gmv": float(row.get("TOTAL_GMV", 0) or 0),
                "fraud_tx_count": int(row.get("FRAUD_COUNT", 0)),
                "fraud_ratio": (
                    int(row.get("FRAUD_COUNT", 0)) / max(int(row.get("TX_COUNT", 1)), 1)
                ),
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
