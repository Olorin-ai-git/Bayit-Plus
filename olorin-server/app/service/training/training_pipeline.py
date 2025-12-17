"""
Training Pipeline
Feature: 026-llm-training-pipeline

Batch training pipeline for LLM-based fraud detection.
"""

import asyncio
import sys
from datetime import datetime
from typing import List, Optional

from app.service.logging import get_bridge_logger
from app.service.training.llm_reasoning_engine import get_reasoning_engine
from app.service.training.training_config_loader import get_training_config
from app.service.training.training_data_extractor import TrainingDataExtractor
from app.service.training.training_models import (
    PredictionResult,
    TrainingMetrics,
    TrainingSample,
)

logger = get_bridge_logger(__name__)


class TrainingPipeline:
    """Pipeline for training and evaluating LLM fraud detection."""

    def __init__(self):
        """Initialize training pipeline."""
        self._config = get_training_config()
        self._reasoning_engine = get_reasoning_engine()
        self._data_extractor = TrainingDataExtractor()
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
            print(f"Processing batch {batch_idx + 1}/{len(batches)} ({len(batch)} samples)...")
            sys.stdout.flush()
            logger.debug(f"Processing batch {batch_idx + 1}/{len(batches)}")
            batch_results = await self._process_batch(batch)
            print(f"  Batch {batch_idx + 1} complete: {len(batch_results)} results")
            sys.stdout.flush()

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
        return await self._data_extractor.extract_samples(
            merchant_name=merchant_name,
            start_date=start_date,
            end_date=end_date,
        )


_training_pipeline: Optional[TrainingPipeline] = None


def get_training_pipeline() -> TrainingPipeline:
    """Get cached training pipeline instance."""
    global _training_pipeline
    if _training_pipeline is None:
        _training_pipeline = TrainingPipeline()
    return _training_pipeline


def clear_training_pipeline_cache() -> None:
    """Clear cached training pipeline to force reload with new config."""
    global _training_pipeline
    _training_pipeline = None
    logger.debug("Training pipeline cache cleared")
