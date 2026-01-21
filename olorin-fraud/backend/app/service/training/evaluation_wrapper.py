"""
Evaluation Wrapper
Feature: 026-llm-training-pipeline

Wraps training pipeline for single-configuration evaluation.
"""

import asyncio
import os
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from app.service.logging import get_bridge_logger
from app.service.training.convergence_detector import OptimizationResult
from app.service.training.llm_reasoning_engine import clear_reasoning_engine_cache
from app.service.training.training_config_loader import clear_training_config_cache
from app.service.training.training_models import TrainingMetrics, TrainingSample
from app.service.training.training_pipeline import clear_training_pipeline_cache

logger = get_bridge_logger(__name__)


@dataclass
class EvaluationConfig:
    """Configuration for a single evaluation run."""

    threshold: float
    prompt_version: str
    llm_weight: float
    baseline_score: float
    config_id: str


class EvaluationWrapper:
    """
    Wraps training pipeline for parameterized evaluation.

    Allows dynamic configuration of threshold, prompt version,
    and other parameters for grid search optimization.
    """

    def __init__(self, samples: List[TrainingSample]):
        """
        Initialize evaluation wrapper.

        Args:
            samples: Pre-extracted training samples to evaluate against
        """
        self._samples = samples
        self._semaphore_limit = int(os.getenv("CONTINUOUS_TRAINING_WORKERS", "5"))

    async def evaluate_configuration(
        self,
        config: EvaluationConfig,
        iteration: int,
    ) -> OptimizationResult:
        """
        Evaluate a single configuration.

        Args:
            config: Configuration to evaluate
            iteration: Current iteration number

        Returns:
            OptimizationResult with metrics
        """
        original_threshold = os.getenv("LLM_FRAUD_THRESHOLD")
        original_prompt = os.getenv("LLM_PROMPT_ACTIVE_VERSION")

        try:
            # Set new environment variables BEFORE clearing caches
            os.environ["LLM_FRAUD_THRESHOLD"] = str(config.threshold)
            os.environ["LLM_PROMPT_ACTIVE_VERSION"] = config.prompt_version

            # Clear ALL caches to force reload with new config values
            clear_training_config_cache()
            clear_reasoning_engine_cache()
            clear_training_pipeline_cache()

            from app.service.training.prompt_registry import get_prompt_registry
            from app.service.training.training_pipeline import TrainingPipeline

            registry = get_prompt_registry()
            registry.clear_cache()

            pipeline = TrainingPipeline()
            metrics = await pipeline.run_training_evaluation(self._samples)

            return self._create_result(config, metrics, iteration)

        except Exception as e:
            logger.error(f"Evaluation error for {config.config_id}: {e}")
            return self._create_error_result(config, iteration, str(e))

        finally:
            if original_threshold is not None:
                os.environ["LLM_FRAUD_THRESHOLD"] = original_threshold
            elif "LLM_FRAUD_THRESHOLD" in os.environ:
                del os.environ["LLM_FRAUD_THRESHOLD"]

            if original_prompt is not None:
                os.environ["LLM_PROMPT_ACTIVE_VERSION"] = original_prompt
            elif "LLM_PROMPT_ACTIVE_VERSION" in os.environ:
                del os.environ["LLM_PROMPT_ACTIVE_VERSION"]

    def _create_result(
        self,
        config: EvaluationConfig,
        metrics: TrainingMetrics,
        iteration: int,
    ) -> OptimizationResult:
        """Create OptimizationResult from metrics."""
        return OptimizationResult(
            config_id=config.config_id,
            threshold=config.threshold,
            prompt_version=config.prompt_version,
            llm_weight=config.llm_weight,
            baseline_score=config.baseline_score,
            precision=metrics.precision,
            recall=metrics.recall,
            f1_score=metrics.f1_score,
            true_positives=metrics.true_positives,
            false_positives=metrics.false_positives,
            true_negatives=metrics.true_negatives,
            false_negatives=metrics.false_negatives,
            iteration=iteration,
        )

    def _create_error_result(
        self,
        config: EvaluationConfig,
        iteration: int,
        error: str,
    ) -> OptimizationResult:
        """Create error result."""
        logger.warning(f"Error result for {config.config_id}: {error}")
        return OptimizationResult(
            config_id=config.config_id,
            threshold=config.threshold,
            prompt_version=config.prompt_version,
            llm_weight=config.llm_weight,
            baseline_score=config.baseline_score,
            precision=0.0,
            recall=0.0,
            f1_score=0.0,
            true_positives=0,
            false_positives=0,
            true_negatives=0,
            false_negatives=0,
            iteration=iteration,
        )


class ParallelEvaluator:
    """Runs multiple evaluations in parallel with semaphore control."""

    def __init__(self, samples: List[TrainingSample]):
        """
        Initialize parallel evaluator.

        Args:
            samples: Training samples for evaluation
        """
        self._samples = samples
        self._workers = int(os.getenv("CONTINUOUS_TRAINING_WORKERS", "5"))
        self._semaphore = asyncio.Semaphore(self._workers)
        self._wrapper = EvaluationWrapper(samples)

    async def evaluate_batch(
        self,
        configs: List[EvaluationConfig],
        start_iteration: int,
    ) -> List[OptimizationResult]:
        """
        Evaluate a batch of configurations in parallel.

        Args:
            configs: Configurations to evaluate
            start_iteration: Starting iteration number

        Returns:
            List of OptimizationResults
        """
        tasks = [
            self._evaluate_with_semaphore(config, start_iteration + i)
            for i, config in enumerate(configs)
        ]

        results = await asyncio.gather(*tasks, return_exceptions=True)

        valid_results = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                logger.error(f"Batch evaluation error: {result}")
                valid_results.append(
                    self._wrapper._create_error_result(
                        configs[i], start_iteration + i, str(result)
                    )
                )
            else:
                valid_results.append(result)

        return valid_results

    async def _evaluate_with_semaphore(
        self,
        config: EvaluationConfig,
        iteration: int,
    ) -> OptimizationResult:
        """Evaluate with semaphore control."""
        async with self._semaphore:
            return await self._wrapper.evaluate_configuration(config, iteration)


def generate_config_id(
    threshold: float,
    prompt_version: str,
    llm_weight: float,
    baseline_score: float,
) -> str:
    """Generate unique configuration ID."""
    return f"t{threshold:.2f}_p{prompt_version}_w{llm_weight:.2f}_b{baseline_score:.2f}"
