"""
Cohort Evaluator
Feature: 026-llm-training-pipeline

Evaluates model performance across different cohorts (merchant, region, etc.).
"""

import os
from collections import defaultdict
from typing import Any, Dict, List, Optional

import numpy as np

from app.service.logging import get_bridge_logger
from app.service.training.evaluation.evaluation_models import CohortMetrics
from app.service.training.evaluation.pr_metrics import PRMetricsCalculator
from app.service.training.training_config_loader import get_training_config
from app.service.training.training_models import TrainingSample

logger = get_bridge_logger(__name__)


class CohortEvaluator:
    """Evaluates model performance by cohorts."""

    def __init__(self):
        """Initialize cohort evaluator from config."""
        self._config = get_training_config()
        self._pr_calculator = PRMetricsCalculator()
        self._init_from_config()

    def _init_from_config(self) -> None:
        """Initialize settings from configuration."""
        dims_str = os.getenv("LLM_COHORT_DIMS", "merchant,region,device_type")
        self._dimensions = [d.strip() for d in dims_str.split(",")]
        self._min_cohort_size = int(os.getenv("LLM_MIN_COHORT_SIZE", "20"))

    def evaluate_by_cohort(
        self,
        samples: List[TrainingSample],
        scores: List[float],
        dimension: str,
    ) -> List[CohortMetrics]:
        """
        Evaluate performance by a specific cohort dimension.

        Args:
            samples: Training samples with features
            scores: Predicted risk scores
            dimension: Cohort dimension (merchant, region, etc.)

        Returns:
            List of CohortMetrics for each cohort
        """
        cohorts: Dict[str, Dict[str, Any]] = defaultdict(
            lambda: {"samples": [], "scores": [], "labels": []}
        )

        for sample, score in zip(samples, scores):
            cohort_value = self._get_cohort_value(sample, dimension)
            cohorts[cohort_value]["samples"].append(sample)
            cohorts[cohort_value]["scores"].append(score)
            cohorts[cohort_value]["labels"].append(sample.is_fraud)

        metrics = []
        for cohort_name, data in cohorts.items():
            if len(data["samples"]) < self._min_cohort_size:
                continue

            cohort_metrics = self._calculate_cohort_metrics(
                cohort_name=cohort_name,
                dimension=dimension,
                scores=data["scores"],
                labels=data["labels"],
            )
            metrics.append(cohort_metrics)

        return sorted(metrics, key=lambda m: m.sample_count, reverse=True)

    def _get_cohort_value(self, sample: TrainingSample, dimension: str) -> str:
        """Extract cohort value from sample."""
        if dimension == "merchant":
            return sample.merchant_name or "unknown"
        elif dimension == "region":
            return sample.features.get("region", "unknown")
        elif dimension == "device_type":
            return sample.features.get("device_type", "unknown")
        else:
            return sample.features.get(dimension, "unknown")

    def _calculate_cohort_metrics(
        self,
        cohort_name: str,
        dimension: str,
        scores: List[float],
        labels: List[bool],
    ) -> CohortMetrics:
        """Calculate metrics for a single cohort."""
        scores_arr = np.array(scores)
        labels_arr = np.array([1 if l else 0 for l in labels])

        threshold = 0.5
        predictions = (scores_arr >= threshold).astype(int)

        tp = np.sum((predictions == 1) & (labels_arr == 1))
        fp = np.sum((predictions == 1) & (labels_arr == 0))
        tn = np.sum((predictions == 0) & (labels_arr == 0))
        fn = np.sum((predictions == 0) & (labels_arr == 1))

        precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0.0
        fpr = fp / (fp + tn) if (fp + tn) > 0 else 0.0

        pr_curve = self._pr_calculator.calculate_pr_curve(scores, labels)

        return CohortMetrics(
            cohort_name=cohort_name,
            cohort_dimension=dimension,
            sample_count=len(scores),
            fraud_count=int(np.sum(labels_arr)),
            precision=float(precision),
            recall=float(recall),
            f1_score=float(f1),
            fpr=float(fpr),
            pr_auc=pr_curve.pr_auc,
        )

    def evaluate_all_dimensions(
        self,
        samples: List[TrainingSample],
        scores: List[float],
    ) -> Dict[str, List[CohortMetrics]]:
        """
        Evaluate performance across all configured dimensions.

        Args:
            samples: Training samples
            scores: Predicted risk scores

        Returns:
            Dict mapping dimension to list of cohort metrics
        """
        results = {}
        for dimension in self._dimensions:
            results[dimension] = self.evaluate_by_cohort(samples, scores, dimension)
            logger.info(f"Evaluated {len(results[dimension])} cohorts for {dimension}")
        return results

    def detect_disparity(
        self,
        cohort_metrics: List[CohortMetrics],
        metric_name: str = "f1_score",
        threshold: float = 0.2,
    ) -> List[Dict[str, Any]]:
        """
        Detect performance disparity between cohorts.

        Args:
            cohort_metrics: List of cohort metrics
            metric_name: Metric to compare
            threshold: Disparity threshold

        Returns:
            List of disparity alerts
        """
        if len(cohort_metrics) < 2:
            return []

        values = [getattr(m, metric_name, 0) for m in cohort_metrics]
        mean_value = np.mean(values)
        std_value = np.std(values)

        disparities = []
        for metrics in cohort_metrics:
            value = getattr(metrics, metric_name, 0)
            deviation = abs(value - mean_value) / (mean_value if mean_value > 0 else 1)

            if deviation > threshold:
                disparities.append({
                    "cohort": metrics.cohort_name,
                    "dimension": metrics.cohort_dimension,
                    "metric": metric_name,
                    "value": value,
                    "mean": float(mean_value),
                    "deviation": float(deviation),
                    "direction": "below" if value < mean_value else "above",
                })

        return disparities
