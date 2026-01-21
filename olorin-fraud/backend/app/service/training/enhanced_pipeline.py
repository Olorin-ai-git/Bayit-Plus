"""
Enhanced Training Pipeline
Feature: 026-llm-training-pipeline

Orchestrates all training enhancements including feature engineering,
hybrid scoring, evaluation, and event-driven retraining.
"""

import os
from datetime import datetime
from typing import List, Optional

from app.service.logging import get_bridge_logger
from app.service.training.dataset import get_dataset_manager
from app.service.training.decision import get_risk_band_manager
from app.service.training.evaluation import get_champion_challenger, get_cohort_evaluator
from app.service.training.evaluation.pr_metrics import PRMetricsCalculator
from app.service.training.features import get_feature_engineer
from app.service.training.retraining import get_model_versioner, get_retrain_trigger
from app.service.training.retraining.regression_runner import RegressionRunner
from app.service.training.scoring import get_hybrid_scorer
from app.service.training.temporal import get_drift_monitor
from app.service.training.training_config_loader import get_training_config
from app.service.training.training_models import TrainingSample

logger = get_bridge_logger(__name__)


class EnhancedPipeline:
    """Orchestrates enhanced training pipeline with all enhancements."""

    def __init__(self):
        """Initialize enhanced pipeline components."""
        self._config = get_training_config()
        self._init_components()

    def _init_components(self) -> None:
        """Initialize all pipeline components."""
        self._feature_engineer = get_feature_engineer()
        self._dataset_manager = get_dataset_manager()
        self._hybrid_scorer = get_hybrid_scorer()
        self._risk_bands = get_risk_band_manager()
        self._pr_calculator = PRMetricsCalculator()
        self._cohort_evaluator = get_cohort_evaluator()
        self._champion_challenger = get_champion_challenger()
        self._drift_monitor = get_drift_monitor()
        self._retrain_trigger = get_retrain_trigger()
        self._regression_runner = RegressionRunner()
        self._model_versioner = get_model_versioner()

    async def run_full_pipeline(
        self,
        samples: List[TrainingSample],
        model_version: str,
    ) -> dict:
        """
        Run the complete enhanced training pipeline.

        Args:
            samples: Training samples with ground truth
            model_version: Version identifier for this run

        Returns:
            Dictionary with evaluation results and metrics
        """
        logger.info(f"Starting enhanced pipeline: version={model_version}")

        dataset = self._dataset_manager.prepare_dataset(samples)
        train_samples = dataset.train_samples
        test_samples = dataset.test_samples

        labels = [s.is_fraud for s in test_samples]
        scores = await self._score_samples(test_samples)

        pr_curve = self._pr_calculator.calculate_pr_curve(scores, labels)
        cohort_metrics = self._cohort_evaluator.evaluate_by_cohort(
            scores=scores,
            labels=labels,
            cohort_values=[s.merchant_name or "unknown" for s in test_samples],
            cohort_name="merchant",
        )

        self._check_for_drift(test_samples)
        self._check_for_retraining(pr_curve.pr_auc)

        self._model_versioner.create_snapshot(
            model_version=model_version,
            pr_auc=pr_curve.pr_auc,
            f1_score=self._calculate_f1(scores, labels),
            threshold=float(os.getenv("LLM_FRAUD_THRESHOLD", "0.5")),
            prompt_version=self._config.prompts.active_version,
        )

        return {
            "model_version": model_version,
            "pr_auc": pr_curve.pr_auc,
            "roc_auc": pr_curve.roc_auc,
            "cohort_metrics": cohort_metrics,
            "train_samples": len(train_samples),
            "test_samples": len(test_samples),
            "timestamp": datetime.utcnow().isoformat(),
        }

    async def _score_samples(self, samples: List[TrainingSample]) -> List[float]:
        """Score samples using hybrid scorer."""
        scores = []
        for sample in samples:
            features = self._feature_engineer.extract_features(sample)
            assessment = await self._hybrid_scorer.score(
                features=features.to_dict(),
                entity_type=sample.entity_type,
                entity_value=sample.entity_value,
                merchant_name=sample.merchant_name,
            )
            scores.append(assessment.risk_score)
        return scores

    def _check_for_drift(self, samples: List[TrainingSample]) -> None:
        """Check for feature drift."""
        for sample in samples:
            features = self._feature_engineer.extract_features(sample)
            self._drift_monitor.update_distribution("velocity_1h", features.velocity.tx_count_1h)

    def _check_for_retraining(self, current_pr_auc: float) -> None:
        """Check if retraining should be triggered."""
        baseline = self._model_versioner.get_latest()
        if baseline:
            event = self._retrain_trigger.check_performance_trigger(
                current_pr_auc=current_pr_auc,
                baseline_pr_auc=baseline.pr_auc,
            )
            if event:
                logger.warning(f"Retraining triggered: {event.reason.value}")

    def _calculate_f1(self, scores: List[float], labels: List[bool]) -> float:
        """Calculate F1 score at threshold."""
        threshold = float(os.getenv("LLM_FRAUD_THRESHOLD", "0.5"))
        predictions = [s >= threshold for s in scores]

        tp = sum(1 for p, l in zip(predictions, labels) if p and l)
        fp = sum(1 for p, l in zip(predictions, labels) if p and not l)
        fn = sum(1 for p, l in zip(predictions, labels) if not p and l)

        precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0

        if (precision + recall) == 0:
            return 0.0
        return 2 * precision * recall / (precision + recall)


_enhanced_pipeline: Optional[EnhancedPipeline] = None


def get_enhanced_pipeline() -> EnhancedPipeline:
    """Get cached enhanced pipeline instance."""
    global _enhanced_pipeline
    if _enhanced_pipeline is None:
        _enhanced_pipeline = EnhancedPipeline()
    return _enhanced_pipeline
