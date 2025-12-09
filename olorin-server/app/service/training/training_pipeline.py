"""
Training Pipeline
Feature: 026-llm-training-pipeline

Batch training pipeline for LLM-based fraud detection.
Extracts training data from Snowflake and evaluates LLM predictions.
"""

import asyncio
import os
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from app.service.logging import get_bridge_logger
from app.service.training.llm_reasoning_engine import FraudAssessment, get_reasoning_engine
from app.service.training.training_config_loader import get_training_config

logger = get_bridge_logger(__name__)


@dataclass
class TrainingSample:
    """Single training sample with ground truth."""

    entity_type: str
    entity_value: str
    features: Dict[str, Any]
    is_fraud: bool
    merchant_name: Optional[str] = None
    tx_datetime: Optional[datetime] = None


@dataclass
class PredictionResult:
    """Result of prediction on a training sample."""

    sample: TrainingSample
    assessment: FraudAssessment
    is_correct: bool
    predicted_fraud: bool


@dataclass
class TrainingMetrics:
    """Metrics from training evaluation."""

    total_samples: int = 0
    true_positives: int = 0
    false_positives: int = 0
    true_negatives: int = 0
    false_negatives: int = 0
    precision: float = 0.0
    recall: float = 0.0
    f1_score: float = 0.0
    accuracy: float = 0.0
    prediction_results: List[PredictionResult] = field(default_factory=list)

    def calculate(self) -> None:
        """Calculate metrics from counts."""
        self.total_samples = (
            self.true_positives
            + self.false_positives
            + self.true_negatives
            + self.false_negatives
        )

        if self.total_samples > 0:
            self.accuracy = (self.true_positives + self.true_negatives) / self.total_samples

        if (self.true_positives + self.false_positives) > 0:
            self.precision = self.true_positives / (
                self.true_positives + self.false_positives
            )

        if (self.true_positives + self.false_negatives) > 0:
            self.recall = self.true_positives / (
                self.true_positives + self.false_negatives
            )

        if (self.precision + self.recall) > 0:
            self.f1_score = (
                2 * (self.precision * self.recall) / (self.precision + self.recall)
            )


class TrainingPipeline:
    """Pipeline for training and evaluating LLM fraud detection."""

    def __init__(self):
        """Initialize training pipeline."""
        self._config = get_training_config()
        self._reasoning_engine = get_reasoning_engine()
        self._semaphore = asyncio.Semaphore(
            self._config.batch_processing.max_concurrent
        )

    async def run_training_evaluation(
        self, samples: List[TrainingSample]
    ) -> TrainingMetrics:
        """
        Run training evaluation on provided samples.

        Args:
            samples: List of training samples with ground truth

        Returns:
            TrainingMetrics with evaluation results
        """
        logger.info(f"Starting training evaluation on {len(samples)} samples")

        metrics = TrainingMetrics()
        batch_size = self._config.batch_processing.batch_size
        batches = [
            samples[i : i + batch_size] for i in range(0, len(samples), batch_size)
        ]

        for batch_idx, batch in enumerate(batches):
            logger.debug(f"Processing batch {batch_idx + 1}/{len(batches)}")
            batch_results = await self._process_batch(batch)

            for result in batch_results:
                metrics.prediction_results.append(result)
                self._update_counts(metrics, result)

        metrics.calculate()

        logger.info(
            f"Training evaluation complete: "
            f"accuracy={metrics.accuracy:.3f}, "
            f"precision={metrics.precision:.3f}, "
            f"recall={metrics.recall:.3f}, "
            f"f1={metrics.f1_score:.3f}"
        )

        return metrics

    async def _process_batch(
        self, batch: List[TrainingSample]
    ) -> List[PredictionResult]:
        """Process a batch of samples concurrently."""
        tasks = [self._process_sample(sample) for sample in batch]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        valid_results = []
        for result in results:
            if isinstance(result, Exception):
                logger.error(f"Sample processing error: {result}")
            else:
                valid_results.append(result)

        return valid_results

    async def _process_sample(self, sample: TrainingSample) -> PredictionResult:
        """Process a single training sample."""
        async with self._semaphore:
            assessment = await self._reasoning_engine.analyze_entity(
                entity_type=sample.entity_type,
                entity_value=sample.entity_value,
                features=sample.features,
                merchant_name=sample.merchant_name,
            )

            threshold = self._config.scoring.fraud_threshold
            predicted_fraud = assessment.risk_score >= threshold

            return PredictionResult(
                sample=sample,
                assessment=assessment,
                is_correct=(predicted_fraud == sample.is_fraud),
                predicted_fraud=predicted_fraud,
            )

    def _update_counts(self, metrics: TrainingMetrics, result: PredictionResult) -> None:
        """Update confusion matrix counts."""
        if result.sample.is_fraud and result.predicted_fraud:
            metrics.true_positives += 1
        elif not result.sample.is_fraud and result.predicted_fraud:
            metrics.false_positives += 1
        elif not result.sample.is_fraud and not result.predicted_fraud:
            metrics.true_negatives += 1
        else:
            metrics.false_negatives += 1

    async def extract_training_samples_from_snowflake(
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
        from app.service.agent.tools.snowflake_tool.schema_constants import (
            get_full_table_name,
        )

        if end_date is None:
            end_date = datetime.utcnow() - timedelta(days=180)
        if start_date is None:
            start_date = end_date - timedelta(
                days=self._config.data_sampling.time_window_days
            )

        database = os.getenv("SNOWFLAKE_DATABASE", "GIL")
        schema = os.getenv("SNOWFLAKE_SCHEMA", "PUBLIC")

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
        samples = []

        for row in results:
            features = {
                "total_transactions": int(row.get("TX_COUNT", 0)),
                "total_gmv": float(row.get("TOTAL_GMV", 0) or 0),
                "fraud_tx_count": int(row.get("FRAUD_COUNT", 0)),
                "fraud_ratio": (
                    int(row.get("FRAUD_COUNT", 0)) / int(row.get("TX_COUNT", 1))
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


_training_pipeline: Optional[TrainingPipeline] = None


def get_training_pipeline() -> TrainingPipeline:
    """Get cached training pipeline instance."""
    global _training_pipeline
    if _training_pipeline is None:
        _training_pipeline = TrainingPipeline()
    return _training_pipeline
