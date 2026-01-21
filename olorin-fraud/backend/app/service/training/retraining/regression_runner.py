"""
Regression Runner
Feature: 026-llm-training-pipeline

Runs pre-production regression tests to validate model updates.
"""

import os
import uuid
from datetime import datetime
from typing import List, Optional

from app.service.logging import get_bridge_logger
from app.service.training.evaluation.pr_metrics import PRMetricsCalculator
from app.service.training.retraining.retraining_models import RegressionResult
from app.service.training.training_config_loader import get_training_config
from app.service.training.training_models import TrainingSample

logger = get_bridge_logger(__name__)


class RegressionRunner:
    """Runs regression tests for model validation."""

    def __init__(self):
        """Initialize regression runner from config."""
        self._config = get_training_config()
        self._pr_calculator = PRMetricsCalculator()
        self._init_from_config()
        self._results: List[RegressionResult] = []

    def _init_from_config(self) -> None:
        """Initialize settings from configuration."""
        self._require_pass = os.getenv("LLM_REQUIRE_REGRESSION", "true").lower() == "true"
        self._degradation_threshold = float(
            os.getenv("LLM_DEGRADATION_THRESHOLD", "0.05")
        )
        self._min_samples = int(os.getenv("LLM_MIN_REGRESSION_SAMPLES", "100"))

    def run_regression(
        self,
        test_samples: List[TrainingSample],
        current_scores: List[float],
        baseline_scores: List[float],
        model_version: str,
    ) -> RegressionResult:
        """
        Run regression test comparing current to baseline.

        Args:
            test_samples: Test samples with ground truth
            current_scores: Scores from current model
            baseline_scores: Scores from baseline model
            model_version: Version identifier for current model

        Returns:
            RegressionResult with pass/fail and details
        """
        labels = [s.is_fraud for s in test_samples]

        if len(labels) < self._min_samples:
            return self._create_failure_result(
                model_version=model_version,
                reason=f"Insufficient samples: {len(labels)} < {self._min_samples}",
                sample_count=len(labels),
            )

        baseline_pr = self._pr_calculator.calculate_pr_curve(baseline_scores, labels)
        current_pr = self._pr_calculator.calculate_pr_curve(current_scores, labels)

        baseline_f1 = self._calculate_f1(baseline_scores, labels)
        current_f1 = self._calculate_f1(current_scores, labels)

        degradation = baseline_pr.pr_auc - current_pr.pr_auc
        passed = degradation <= self._degradation_threshold

        if not passed:
            failure_reason = (
                f"PR-AUC degraded by {degradation:.4f} "
                f"(threshold: {self._degradation_threshold})"
            )
        else:
            failure_reason = None

        result = RegressionResult(
            test_id=str(uuid.uuid4()),
            model_version=model_version,
            run_at=datetime.utcnow(),
            passed=passed,
            baseline_pr_auc=baseline_pr.pr_auc,
            current_pr_auc=current_pr.pr_auc,
            baseline_f1=baseline_f1,
            current_f1=current_f1,
            degradation=degradation,
            sample_count=len(labels),
            failure_reason=failure_reason,
            test_details={
                "baseline_avg_precision": baseline_pr.average_precision,
                "current_avg_precision": current_pr.average_precision,
            },
        )

        self._results.append(result)
        logger.info(
            f"Regression test {'PASSED' if passed else 'FAILED'}: "
            f"version={model_version}, degradation={degradation:.4f}"
        )

        return result

    def _calculate_f1(self, scores: List[float], labels: List[bool]) -> float:
        """Calculate F1 score at default threshold."""
        import numpy as np

        scores_arr = np.array(scores)
        labels_arr = np.array([1 if l else 0 for l in labels])
        predictions = (scores_arr >= 0.5).astype(int)

        tp = np.sum((predictions == 1) & (labels_arr == 1))
        fp = np.sum((predictions == 1) & (labels_arr == 0))
        fn = np.sum((predictions == 0) & (labels_arr == 1))

        precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0.0

        return float(f1)

    def _create_failure_result(
        self,
        model_version: str,
        reason: str,
        sample_count: int,
    ) -> RegressionResult:
        """Create a failure result."""
        result = RegressionResult(
            test_id=str(uuid.uuid4()),
            model_version=model_version,
            run_at=datetime.utcnow(),
            passed=False,
            sample_count=sample_count,
            failure_reason=reason,
        )
        self._results.append(result)
        return result

    def should_block_deployment(self, result: RegressionResult) -> bool:
        """Check if result should block deployment."""
        if not self._require_pass:
            return False
        return not result.passed

    def get_results(self, limit: int = 10) -> List[RegressionResult]:
        """Get recent regression results."""
        return self._results[-limit:]

    def get_pass_rate(self) -> float:
        """Get overall pass rate."""
        if not self._results:
            return 0.0
        passed = sum(1 for r in self._results if r.passed)
        return passed / len(self._results)
