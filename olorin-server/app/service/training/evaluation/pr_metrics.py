"""
PR Metrics Calculator
Feature: 026-llm-training-pipeline

Calculates precision-recall based metrics for fraud detection evaluation.
"""

import os
from typing import List, Tuple

import numpy as np

from app.service.logging import get_bridge_logger
from app.service.training.evaluation.evaluation_models import PRCurve, RecallAtFPR
from app.service.training.training_config_loader import get_training_config

logger = get_bridge_logger(__name__)


class PRMetricsCalculator:
    """Calculates precision-recall and related metrics."""

    def __init__(self):
        """Initialize PR metrics calculator from config."""
        self._config = get_training_config()
        self._init_from_config()

    def _init_from_config(self) -> None:
        """Initialize settings from configuration."""
        self._target_fpr = float(os.getenv("LLM_TARGET_FPR", "0.005"))
        self._n_thresholds = int(os.getenv("LLM_PR_THRESHOLDS", "100"))

    def calculate_pr_curve(
        self,
        scores: List[float],
        labels: List[bool],
    ) -> PRCurve:
        """
        Calculate precision-recall curve.

        Args:
            scores: Predicted risk scores
            labels: True fraud labels

        Returns:
            PRCurve with all metrics
        """
        scores_arr = np.array(scores)
        labels_arr = np.array([1 if l else 0 for l in labels])

        thresholds = np.linspace(0, 1, self._n_thresholds)
        precisions = []
        recalls = []
        valid_thresholds = []

        for threshold in thresholds:
            predictions = (scores_arr >= threshold).astype(int)
            tp = np.sum((predictions == 1) & (labels_arr == 1))
            fp = np.sum((predictions == 1) & (labels_arr == 0))
            fn = np.sum((predictions == 0) & (labels_arr == 1))

            precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
            recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0

            precisions.append(float(precision))
            recalls.append(float(recall))
            valid_thresholds.append(float(threshold))

        pr_auc = self._calculate_auc(recalls, precisions)
        roc_auc = self._calculate_roc_auc(scores, labels)
        avg_precision = self._calculate_average_precision(scores, labels)

        return PRCurve(
            precisions=precisions,
            recalls=recalls,
            thresholds=valid_thresholds,
            pr_auc=pr_auc,
            roc_auc=roc_auc,
            average_precision=avg_precision,
        )

    def _calculate_auc(
        self,
        x: List[float],
        y: List[float],
    ) -> float:
        """Calculate area under curve using trapezoidal rule."""
        if len(x) < 2:
            return 0.0

        x_arr = np.array(x)
        y_arr = np.array(y)

        sorted_indices = np.argsort(x_arr)
        x_sorted = x_arr[sorted_indices]
        y_sorted = y_arr[sorted_indices]

        auc = np.trapz(y_sorted, x_sorted)
        return float(abs(auc))

    def _calculate_roc_auc(
        self,
        scores: List[float],
        labels: List[bool],
    ) -> float:
        """Calculate ROC AUC."""
        try:
            from sklearn.metrics import roc_auc_score
            labels_arr = [1 if l else 0 for l in labels]
            return float(roc_auc_score(labels_arr, scores))
        except Exception:
            return 0.0

    def _calculate_average_precision(
        self,
        scores: List[float],
        labels: List[bool],
    ) -> float:
        """Calculate average precision score."""
        try:
            from sklearn.metrics import average_precision_score
            labels_arr = [1 if l else 0 for l in labels]
            return float(average_precision_score(labels_arr, scores))
        except Exception:
            return 0.0

    def calculate_recall_at_fpr(
        self,
        scores: List[float],
        labels: List[bool],
        target_fpr: float = None,
    ) -> RecallAtFPR:
        """
        Calculate recall at target false positive rate.

        Args:
            scores: Predicted risk scores
            labels: True fraud labels
            target_fpr: Target FPR (defaults to config value)

        Returns:
            RecallAtFPR with achieved metrics
        """
        if target_fpr is None:
            target_fpr = self._target_fpr

        scores_arr = np.array(scores)
        labels_arr = np.array([1 if l else 0 for l in labels])

        thresholds = np.linspace(1, 0, self._n_thresholds)

        best_recall = 0.0
        best_fpr = 1.0
        best_threshold = 1.0

        for threshold in thresholds:
            predictions = (scores_arr >= threshold).astype(int)
            fp = np.sum((predictions == 1) & (labels_arr == 0))
            tn = np.sum((predictions == 0) & (labels_arr == 0))
            tp = np.sum((predictions == 1) & (labels_arr == 1))
            fn = np.sum((predictions == 0) & (labels_arr == 1))

            fpr = fp / (fp + tn) if (fp + tn) > 0 else 0.0
            recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0

            if fpr <= target_fpr and recall > best_recall:
                best_recall = recall
                best_fpr = fpr
                best_threshold = threshold

        return RecallAtFPR(
            target_fpr=target_fpr,
            achieved_recall=float(best_recall),
            actual_fpr=float(best_fpr),
            threshold_used=float(best_threshold),
        )

    def get_metrics_summary(
        self,
        scores: List[float],
        labels: List[bool],
    ) -> dict:
        """Get comprehensive metrics summary."""
        pr_curve = self.calculate_pr_curve(scores, labels)
        recall_at_fpr = self.calculate_recall_at_fpr(scores, labels)

        return {
            "pr_auc": pr_curve.pr_auc,
            "roc_auc": pr_curve.roc_auc,
            "average_precision": pr_curve.average_precision,
            "recall_at_target_fpr": recall_at_fpr.achieved_recall,
            "target_fpr": recall_at_fpr.target_fpr,
            "actual_fpr": recall_at_fpr.actual_fpr,
        }
