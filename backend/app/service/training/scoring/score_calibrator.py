"""
Score Calibrator
Feature: 026-llm-training-pipeline

Provides Platt scaling and isotonic regression calibration for risk scores.
"""

import os
import pickle
from pathlib import Path
from typing import List, Optional, Tuple

import numpy as np

from app.service.logging import get_bridge_logger
from app.service.training.scoring.scorer_models import CalibrationResult
from app.service.training.training_config_loader import get_training_config

logger = get_bridge_logger(__name__)


class ScoreCalibrator:
    """Calibrates risk scores to well-calibrated probabilities."""

    def __init__(self):
        """Initialize score calibrator from config."""
        self._config = get_training_config()
        self._init_from_config()
        self._calibrator = None
        self._is_fitted = False
        self._load_calibrator()

    def _init_from_config(self) -> None:
        """Initialize settings from configuration."""
        self._method = os.getenv("LLM_CALIBRATION_METHOD", "isotonic")
        self._min_samples = int(os.getenv("LLM_CALIBRATION_MIN_SAMPLES", "100"))
        self._calibrator_path = os.getenv("LLM_CALIBRATOR_PATH", "data/calibrators")

    def _load_calibrator(self) -> None:
        """Load saved calibrator if available."""
        calibrator_file = os.path.join(
            self._calibrator_path, f"{self._method}_calibrator.pkl"
        )
        if os.path.exists(calibrator_file):
            try:
                with open(calibrator_file, "rb") as f:
                    self._calibrator = pickle.load(f)
                self._is_fitted = True
                logger.info(f"Loaded {self._method} calibrator")
            except Exception as e:
                logger.warning(f"Failed to load calibrator: {e}")

    def fit(self, scores: List[float], labels: List[bool]) -> bool:
        """
        Fit calibrator on training data.

        Args:
            scores: Raw model scores (0.0 to 1.0)
            labels: True labels (True=fraud)

        Returns:
            True if fitting succeeded
        """
        if len(scores) < self._min_samples:
            logger.warning(
                f"Insufficient samples: {len(scores)} < {self._min_samples}"
            )
            return False

        try:
            if self._method == "isotonic":
                self._fit_isotonic(scores, labels)
            elif self._method == "platt":
                self._fit_platt(scores, labels)
            else:
                logger.error(f"Unknown calibration method: {self._method}")
                return False

            self._is_fitted = True
            self._save_calibrator()
            logger.info(f"Fitted {self._method} calibrator on {len(scores)} samples")
            return True

        except Exception as e:
            logger.error(f"Calibration fitting failed: {e}")
            return False

    def _fit_isotonic(self, scores: List[float], labels: List[bool]) -> None:
        """Fit isotonic regression calibrator."""
        from sklearn.isotonic import IsotonicRegression

        y = [1 if label else 0 for label in labels]
        self._calibrator = IsotonicRegression(out_of_bounds="clip")
        self._calibrator.fit(scores, y)

    def _fit_platt(self, scores: List[float], labels: List[bool]) -> None:
        """Fit Platt scaling (sigmoid) calibrator."""
        from sklearn.linear_model import LogisticRegression

        X = np.array(scores).reshape(-1, 1)
        y = np.array([1 if label else 0 for label in labels])
        self._calibrator = LogisticRegression(max_iter=1000)
        self._calibrator.fit(X, y)

    def _save_calibrator(self) -> None:
        """Save calibrator to disk."""
        Path(self._calibrator_path).mkdir(parents=True, exist_ok=True)
        calibrator_file = os.path.join(
            self._calibrator_path, f"{self._method}_calibrator.pkl"
        )
        try:
            with open(calibrator_file, "wb") as f:
                pickle.dump(self._calibrator, f)
            logger.info(f"Saved calibrator to {calibrator_file}")
        except Exception as e:
            logger.error(f"Failed to save calibrator: {e}")

    def calibrate(self, score: float) -> CalibrationResult:
        """
        Calibrate a single score.

        Args:
            score: Raw score (0.0 to 1.0)

        Returns:
            CalibrationResult with calibrated score
        """
        if not self._is_fitted or self._calibrator is None:
            return CalibrationResult(
                original_score=score,
                calibrated_score=score,
                calibration_method=self._method,
                is_valid=False,
                error="Calibrator not fitted",
            )

        try:
            if self._method == "isotonic":
                calibrated = float(self._calibrator.predict([score])[0])
            elif self._method == "platt":
                calibrated = float(
                    self._calibrator.predict_proba([[score]])[0, 1]
                )
            else:
                calibrated = score

            calibrated = np.clip(calibrated, 0.0, 1.0)

            return CalibrationResult(
                original_score=score,
                calibrated_score=float(calibrated),
                calibration_method=self._method,
                is_valid=True,
            )

        except Exception as e:
            logger.error(f"Calibration failed: {e}")
            return CalibrationResult(
                original_score=score,
                calibrated_score=score,
                calibration_method=self._method,
                is_valid=False,
                error=str(e),
            )

    def calibrate_batch(self, scores: List[float]) -> List[CalibrationResult]:
        """Calibrate multiple scores."""
        return [self.calibrate(score) for score in scores]

    def get_calibration_curve(
        self,
        scores: List[float],
        labels: List[bool],
        n_bins: int = 10,
    ) -> Tuple[List[float], List[float]]:
        """
        Calculate calibration curve (reliability diagram data).

        Args:
            scores: Predicted scores
            labels: True labels
            n_bins: Number of bins

        Returns:
            Tuple of (mean_predicted, fraction_of_positives) per bin
        """
        scores_arr = np.array(scores)
        labels_arr = np.array([1 if l else 0 for l in labels])

        bin_edges = np.linspace(0, 1, n_bins + 1)
        mean_predicted = []
        fraction_positives = []

        for i in range(n_bins):
            mask = (scores_arr >= bin_edges[i]) & (scores_arr < bin_edges[i + 1])
            if np.sum(mask) > 0:
                mean_predicted.append(float(np.mean(scores_arr[mask])))
                fraction_positives.append(float(np.mean(labels_arr[mask])))

        return mean_predicted, fraction_positives

    def is_fitted(self) -> bool:
        """Check if calibrator is fitted."""
        return self._is_fitted
