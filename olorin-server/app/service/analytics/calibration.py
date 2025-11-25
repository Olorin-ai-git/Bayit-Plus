"""
Model Calibration for Fraud Detection.

Implements isotonic regression calibration to convert raw scores to calibrated probabilities.

Week 9 Phase 3 implementation.
"""

import logging
import os
import pickle
from typing import List, Optional, Dict, Any, Tuple
from pathlib import Path
import numpy as np

from app.service.analytics.calibration_metrics import (
    calculate_calibration_curve,
    calculate_calibration_metrics
)

logger = logging.getLogger(__name__)


class IsotonicCalibrator:
    """
    Isotonic regression calibrator for fraud detection scores.

    Calibrates raw model scores to well-calibrated probabilities using isotonic regression.
    """

    def __init__(self, calibrator_path: Optional[str] = None):
        """
        Initialize isotonic calibrator.

        Args:
            calibrator_path: Path to saved calibrator artifact
        """
        if calibrator_path is None:
            calibrator_env = os.getenv("CALIBRATOR_PATH")
            if not calibrator_env:
                raise RuntimeError("CALIBRATOR_PATH environment variable is required")
            self.calibrator_path = calibrator_env
        else:
            self.calibrator_path = calibrator_path

        self.calibrator = None
        self.is_fitted = False

        min_samples_env = os.getenv("CALIBRATION_MIN_SAMPLES")
        if not min_samples_env:
            raise RuntimeError("CALIBRATION_MIN_SAMPLES environment variable is required")
        self.min_samples = int(min_samples_env)

        self._load_calibrator()

    def _load_calibrator(self) -> None:
        """Load saved calibrator from disk."""
        calibrator_file = os.path.join(self.calibrator_path, "isotonic_calibrator.pkl")

        if not os.path.exists(calibrator_file):
            logger.info("No saved calibrator found, will need training")
            return

        try:
            with open(calibrator_file, 'rb') as f:
                self.calibrator = pickle.load(f)
            self.is_fitted = True
            logger.info(f"✓ Loaded calibrator from {calibrator_file}")
        except Exception as e:
            logger.error(f"Failed to load calibrator: {e}")

    def fit(self, scores: List[float], labels: List[bool]) -> None:
        """
        Fit isotonic calibrator on training data.

        Args:
            scores: Raw model scores (0.0 to 1.0)
            labels: True labels (True=fraud, False=legitimate)
        """
        if len(scores) < self.min_samples:
            logger.warning(
                f"Insufficient samples for calibration: {len(scores)} < {self.min_samples}"
            )
            return

        try:
            from sklearn.isotonic import IsotonicRegression

            self.calibrator = IsotonicRegression(out_of_bounds='clip')
            self.calibrator.fit(scores, labels)
            self.is_fitted = True

            # Save calibrator
            self._save_calibrator()

            logger.info(f"✓ Fitted calibrator on {len(scores)} samples")
        except ImportError:
            logger.warning("scikit-learn not available, calibration disabled")
        except Exception as e:
            logger.error(f"Failed to fit calibrator: {e}")

    def _save_calibrator(self) -> None:
        """Save calibrator to disk."""
        Path(self.calibrator_path).mkdir(parents=True, exist_ok=True)
        calibrator_file = os.path.join(self.calibrator_path, "isotonic_calibrator.pkl")

        try:
            with open(calibrator_file, 'wb') as f:
                pickle.dump(self.calibrator, f)
            logger.info(f"✓ Saved calibrator to {calibrator_file}")
        except Exception as e:
            logger.error(f"Failed to save calibrator: {e}")

    def calibrate(self, score: float) -> float:
        """
        Calibrate a single score.

        Args:
            score: Raw score (0.0 to 1.0)

        Returns:
            Calibrated probability
        """
        if not self.is_fitted or self.calibrator is None:
            logger.debug("Calibrator not fitted, returning raw score")
            return score

        try:
            calibrated = float(self.calibrator.predict([score])[0])
            return np.clip(calibrated, 0.0, 1.0)
        except Exception as e:
            logger.error(f"Calibration failed: {e}")
            return score

    def calibrate_batch(self, scores: List[float]) -> List[float]:
        """
        Calibrate multiple scores.

        Args:
            scores: List of raw scores

        Returns:
            List of calibrated probabilities
        """
        if not self.is_fitted or self.calibrator is None:
            return scores

        try:
            calibrated = self.calibrator.predict(scores)
            return np.clip(calibrated, 0.0, 1.0).tolist()
        except Exception as e:
            logger.error(f"Batch calibration failed: {e}")
            return scores

    def get_calibration_curve(
        self,
        scores: List[float],
        labels: List[bool],
        n_bins: int = 10
    ) -> Tuple[List[float], List[float]]:
        """Get calibration curve data."""
        return calculate_calibration_curve(scores, labels, n_bins)

    def get_calibration_metrics(
        self,
        scores: List[float],
        labels: List[bool]
    ) -> Dict[str, float]:
        """Get calibration quality metrics."""
        return calculate_calibration_metrics(scores, labels)
