"""
Threshold Optimizer
Feature: 026-llm-training-pipeline

Optimizes decision threshold based on cost function.
"""

import os
from typing import List, Tuple

import numpy as np

from app.service.logging import get_bridge_logger
from app.service.training.scoring.scorer_models import ThresholdResult
from app.service.training.training_config_loader import get_training_config

logger = get_bridge_logger(__name__)


class ThresholdOptimizer:
    """Optimizes fraud decision threshold based on cost function."""

    def __init__(self):
        """Initialize threshold optimizer from config."""
        self._config = get_training_config()
        self._init_from_config()

    def _init_from_config(self) -> None:
        """Initialize settings from configuration."""
        self._cost_fn_ratio = float(os.getenv("LLM_COST_FN_RATIO", "10"))
        self._cost_fp_ratio = float(os.getenv("LLM_COST_FP_RATIO", "1"))
        self._search_steps = int(os.getenv("LLM_THRESHOLD_STEPS", "100"))

    def optimize(
        self,
        scores: List[float],
        labels: List[bool],
        search_range: Tuple[float, float] = (0.0, 1.0),
    ) -> ThresholdResult:
        """
        Find optimal threshold minimizing cost function.

        Cost = (Cost_FN x FN) + (Cost_FP x FP)

        Args:
            scores: Predicted risk scores
            labels: True fraud labels
            search_range: Range to search for optimal threshold

        Returns:
            ThresholdResult with optimal threshold and metrics
        """
        scores_arr = np.array(scores)
        labels_arr = np.array([1 if l else 0 for l in labels])

        thresholds = np.linspace(
            search_range[0], search_range[1], self._search_steps
        )

        best_threshold = 0.5
        best_cost = float("inf")
        best_metrics = {}

        for threshold in thresholds:
            predictions = (scores_arr >= threshold).astype(int)
            metrics = self._calculate_metrics(predictions, labels_arr)
            cost = self._calculate_cost(metrics)

            if cost < best_cost:
                best_cost = cost
                best_threshold = float(threshold)
                best_metrics = metrics

        logger.info(
            f"Optimal threshold: {best_threshold:.3f} "
            f"(cost={best_cost:.2f}, F1={best_metrics.get('f1', 0):.3f})"
        )

        return ThresholdResult(
            optimal_threshold=best_threshold,
            cost_at_threshold=best_cost,
            precision_at_threshold=best_metrics.get("precision", 0.0),
            recall_at_threshold=best_metrics.get("recall", 0.0),
            f1_at_threshold=best_metrics.get("f1", 0.0),
            cost_fn_ratio=self._cost_fn_ratio,
            cost_fp_ratio=self._cost_fp_ratio,
            search_range=search_range,
        )

    def _calculate_metrics(
        self,
        predictions: np.ndarray,
        labels: np.ndarray,
    ) -> dict:
        """Calculate confusion matrix and derived metrics."""
        tp = np.sum((predictions == 1) & (labels == 1))
        fp = np.sum((predictions == 1) & (labels == 0))
        tn = np.sum((predictions == 0) & (labels == 0))
        fn = np.sum((predictions == 0) & (labels == 1))

        precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0.0

        return {
            "tp": int(tp),
            "fp": int(fp),
            "tn": int(tn),
            "fn": int(fn),
            "precision": float(precision),
            "recall": float(recall),
            "f1": float(f1),
        }

    def _calculate_cost(self, metrics: dict) -> float:
        """Calculate cost based on FN and FP counts."""
        fn_cost = metrics["fn"] * self._cost_fn_ratio
        fp_cost = metrics["fp"] * self._cost_fp_ratio
        return fn_cost + fp_cost

    def analyze_threshold_curve(
        self,
        scores: List[float],
        labels: List[bool],
        n_points: int = 20,
    ) -> List[dict]:
        """
        Generate threshold analysis curve data.

        Args:
            scores: Predicted risk scores
            labels: True fraud labels
            n_points: Number of points in curve

        Returns:
            List of dicts with threshold and metrics at each point
        """
        scores_arr = np.array(scores)
        labels_arr = np.array([1 if l else 0 for l in labels])

        thresholds = np.linspace(0.0, 1.0, n_points)
        curve_data = []

        for threshold in thresholds:
            predictions = (scores_arr >= threshold).astype(int)
            metrics = self._calculate_metrics(predictions, labels_arr)
            cost = self._calculate_cost(metrics)

            curve_data.append({
                "threshold": float(threshold),
                "cost": cost,
                "precision": metrics["precision"],
                "recall": metrics["recall"],
                "f1": metrics["f1"],
                "tp": metrics["tp"],
                "fp": metrics["fp"],
                "fn": metrics["fn"],
            })

        return curve_data

    def get_metrics_at_threshold(
        self,
        scores: List[float],
        labels: List[bool],
        threshold: float,
    ) -> dict:
        """Get metrics at a specific threshold."""
        scores_arr = np.array(scores)
        labels_arr = np.array([1 if l else 0 for l in labels])
        predictions = (scores_arr >= threshold).astype(int)
        return self._calculate_metrics(predictions, labels_arr)
