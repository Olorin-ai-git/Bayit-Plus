"""
Calibration Metrics Utilities.

Provides calibration quality metrics and curve calculation.

Week 9 Phase 3 implementation.
"""

import logging
from typing import List, Tuple, Dict
import numpy as np

logger = logging.getLogger(__name__)


def calculate_calibration_curve(
    scores: List[float],
    labels: List[bool],
    n_bins: int = 10
) -> Tuple[List[float], List[float]]:
    """
    Calculate calibration curve data.

    Args:
        scores: Raw scores
        labels: True labels
        n_bins: Number of bins for curve

    Returns:
        Tuple of (mean_predicted_values, fraction_of_positives)
    """
    if len(scores) < n_bins:
        return [], []

    try:
        from sklearn.calibration import calibration_curve

        fraction_of_positives, mean_predicted_value = calibration_curve(
            labels,
            scores,
            n_bins=n_bins,
            strategy='uniform'
        )

        return mean_predicted_value.tolist(), fraction_of_positives.tolist()
    except ImportError:
        logger.warning("scikit-learn not available for calibration curve")
        return [], []
    except Exception as e:
        logger.error(f"Failed to compute calibration curve: {e}")
        return [], []


def calculate_calibration_metrics(
    scores: List[float],
    labels: List[bool]
) -> Dict[str, float]:
    """
    Calculate calibration quality metrics.

    Args:
        scores: Raw or calibrated scores
        labels: True labels

    Returns:
        Dictionary with calibration metrics (brier_score, log_loss)
    """
    if len(scores) == 0:
        return {}

    try:
        from sklearn.metrics import brier_score_loss, log_loss

        metrics = {
            "brier_score": brier_score_loss(labels, scores),
            "log_loss": log_loss(labels, scores)
        }

        return metrics
    except ImportError:
        logger.warning("scikit-learn not available for metrics")
        return {}
    except Exception as e:
        logger.error(f"Failed to compute metrics: {e}")
        return {}
