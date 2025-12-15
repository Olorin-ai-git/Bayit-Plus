#!/usr/bin/env python3
"""
Continuous Training Optimizer
Feature: 026-llm-training-pipeline

Automated parameter sweep for finding optimal fraud detection thresholds.
"""

import asyncio
import os
import signal
import sys
from datetime import datetime
from itertools import product
from pathlib import Path
from typing import List, Optional

sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
load_dotenv()

from app.service.logging import get_bridge_logger
from app.service.training.convergence_detector import ConvergenceDetector, OptimizationResult
from app.service.training.evaluation_wrapper import (
    EvaluationConfig,
    ParallelEvaluator,
    generate_config_id,
)
from app.service.training.results_persister import ResultsPersister
from app.service.training.training_data_extractor import TrainingDataExtractor
from app.service.training.training_models import TrainingSample

logger = get_bridge_logger(__name__)


class ParameterGridGenerator:
    """Generates parameter combinations for optimization."""

    def __init__(self):
        """Initialize from environment."""
        self._threshold_min = float(os.getenv("CONTINUOUS_TRAINING_THRESHOLD_MIN", "0.30"))
        self._threshold_max = float(os.getenv("CONTINUOUS_TRAINING_THRESHOLD_MAX", "0.90"))
        self._threshold_step = float(os.getenv("CONTINUOUS_TRAINING_THRESHOLD_STEP", "0.05"))

        self._llm_weight_min = float(os.getenv("CONTINUOUS_TRAINING_LLM_WEIGHT_MIN", "0.20"))
        self._llm_weight_max = float(os.getenv("CONTINUOUS_TRAINING_LLM_WEIGHT_MAX", "0.40"))
        self._llm_weight_step = float(os.getenv("CONTINUOUS_TRAINING_LLM_WEIGHT_STEP", "0.05"))

        self._prompt_versions = ["v14", "v15"]  # Focus on best performing prompts
        self._baseline_scores = [0.20, 0.25]  # Reduced for faster iteration

    def generate(self) -> List[EvaluationConfig]:
        """Generate all parameter combinations."""
        thresholds = self._generate_range(
            self._threshold_min, self._threshold_max, self._threshold_step
        )
        llm_weights = self._generate_range(
            self._llm_weight_min, self._llm_weight_max, self._llm_weight_step
        )

        configs = []
        for threshold, prompt, weight, baseline in product(
            thresholds, self._prompt_versions, llm_weights, self._baseline_scores
        ):
            config_id = generate_config_id(threshold, prompt, weight, baseline)
            configs.append(
                EvaluationConfig(
                    threshold=threshold,
                    prompt_version=prompt,
                    llm_weight=weight,
                    baseline_score=baseline,
                    config_id=config_id,
                )
            )

        logger.info(f"Generated {len(configs)} parameter combinations")
        return configs

    def _generate_range(self, start: float, end: float, step: float) -> List[float]:
        """Generate range of values."""
        values = []
        current = start
        while current <= end + 0.001:
            values.append(round(current, 2))
            current += step
        return values


class ContinuousTrainingOptimizer:
    """Main optimizer orchestrating the parameter sweep."""

    def __init__(self):
        """Initialize optimizer."""
        self._workers = int(os.getenv("CONTINUOUS_TRAINING_WORKERS", "5"))
        self._batch_size = int(os.getenv("CONTINUOUS_TRAINING_BATCH_SIZE", "10"))
        self._shutdown_requested = False

        self._grid_generator = ParameterGridGenerator()
        self._convergence_detector = ConvergenceDetector()
        self._results_persister = ResultsPersister()
        self._data_extractor = TrainingDataExtractor()

        signal.signal(signal.SIGINT, self._handle_shutdown)
        signal.signal(signal.SIGTERM, self._handle_shutdown)

    def _handle_shutdown(self, signum, frame):
        """Handle graceful shutdown."""
        logger.info("Shutdown requested, saving results...")
        self._shutdown_requested = True

    async def run(self) -> Optional[OptimizationResult]:
        """
        Run continuous optimization.

        Returns:
            Best OptimizationResult found
        """
        print("=" * 80)
        print("CONTINUOUS TRAINING OPTIMIZER")
        print("=" * 80)
        print(f"Workers: {self._workers}")
        print(f"Batch Size: {self._batch_size}")
        print(f"Started: {datetime.utcnow().isoformat()} UTC")
        print("=" * 80)

        samples = await self._extract_training_samples()
        if not samples:
            logger.error("No training samples extracted")
            return None

        print(f"\nTraining samples: {len(samples)}")
        fraud_count = sum(1 for s in samples if s.is_fraud)
        print(f"  Fraud: {fraud_count}")
        print(f"  Legitimate: {len(samples) - fraud_count}")

        configs = self._grid_generator.generate()
        print(f"\nParameter configurations: {len(configs)}")
        print("=" * 80)

        evaluator = ParallelEvaluator(samples)
        iteration = 0

        for batch_start in range(0, len(configs), self._batch_size):
            if self._shutdown_requested:
                break

            batch = configs[batch_start:batch_start + self._batch_size]
            print(f"\nBatch {batch_start // self._batch_size + 1}: "
                  f"configs {batch_start + 1}-{batch_start + len(batch)}")

            results = await evaluator.evaluate_batch(batch, iteration)

            for result in results:
                self._results_persister.save_result(result)
                state = self._convergence_detector.add_result(result)

                if result.f1_score > 0:
                    print(f"  {result.config_id}: F1={result.f1_score:.4f} "
                          f"P={result.precision:.4f} R={result.recall:.4f}")

            iteration += len(batch)

            if state.is_converged:
                print(f"\n✅ CONVERGED: {state.reason}")
                break

            print(f"  Progress: {iteration}/{len(configs)} "
                  f"| Best F1: {state.best_f1:.4f}")

        return self._finalize()

    async def _extract_training_samples(self) -> List[TrainingSample]:
        """Extract training samples with temporal isolation."""
        print("\nExtracting training samples from Snowflake...")
        samples = await self._data_extractor.extract_samples()
        return samples

    def _finalize(self) -> Optional[OptimizationResult]:
        """Finalize optimization and save results."""
        best = self._convergence_detector.get_best_result()
        top = self._convergence_detector.get_top_results(10)
        state = self._convergence_detector.get_state()

        self._results_persister.save_final_results(top, state)

        if best:
            self._results_persister.save_best_configuration(best)
            self._results_persister.generate_html_report(top, state, best)

            print("\n" + "=" * 80)
            print("OPTIMIZATION COMPLETE")
            print("=" * 80)
            print(f"Iterations: {state.iterations_completed}")
            print(f"Converged: {state.is_converged}")
            print(f"Reason: {state.reason}")
            print("\nBEST CONFIGURATION:")
            print(f"  Threshold: {best.threshold:.2f}")
            print(f"  Prompt: {best.prompt_version}")
            print(f"  LLM Weight: {best.llm_weight:.2f}")
            print(f"  Baseline: {best.baseline_score:.2f}")
            print(f"\nMETRICS:")
            print(f"  F1 Score: {best.f1_score:.4f}")
            print(f"  Precision: {best.precision:.4f}")
            print(f"  Recall: {best.recall:.4f}")
            print(f"\nCONFUSION MATRIX:")
            print(f"  TP: {best.true_positives}, FP: {best.false_positives}")
            print(f"  FN: {best.false_negatives}, TN: {best.true_negatives}")
            print("=" * 80)

        return best


async def main():
    """Main entry point."""
    enabled = os.getenv("CONTINUOUS_TRAINING_ENABLED", "false").lower() == "true"
    if not enabled:
        print("Continuous training is disabled. Set CONTINUOUS_TRAINING_ENABLED=true")
        return

    optimizer = ContinuousTrainingOptimizer()
    result = await optimizer.run()

    if result:
        print(f"\n✅ Best F1: {result.f1_score:.4f}")
    else:
        print("\n❌ No valid results found")


if __name__ == "__main__":
    asyncio.run(main())
