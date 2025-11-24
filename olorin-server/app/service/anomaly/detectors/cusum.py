"""
CUSUM Detector Implementation

Uses Cumulative Sum (CUSUM) method for detecting level shifts
and variance changes in time series.
"""

import numpy as np
from typing import Dict, Any, Optional

from app.service.anomaly.detectors.base import BaseDetector, DetectorResult
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class CUSUMDetector(BaseDetector):
    """
    CUSUM detector for detecting sustained level shifts.

    Tracks cumulative sum of deviations from mean, flagging when
    cumulative sum exceeds threshold.
    """

    def __init__(self, params: Dict[str, Any]):
        """
        Initialize CUSUM detector.

        Args:
            params: Detector parameters including:
                - delta: Shift detection sensitivity (default: 0.75 * std)
                - threshold: Alert threshold (default: 5.0 * std)
                - k: Anomaly threshold multiplier (default: 3.5)
                - persistence: Required persistence windows (default: 2)
                - min_support: Minimum data points required (default: 50)
        """
        super().__init__(params)
        self.delta_multiplier = params.get('delta')
        self.threshold_multiplier = params.get('threshold')

    def detect(self, series: np.ndarray) -> DetectorResult:
        """
        Detect anomalies using CUSUM method.

        Args:
            series: Time series data as numpy array

        Returns:
            DetectorResult with scores, anomaly indices, and evidence

        Raises:
            ValueError: If series is invalid or insufficient data
        """
        self.validate_series(series)

        try:
            # Calculate mean and standard deviation
            mu = np.mean(series)
            std = np.std(series)
            
            # Avoid division by zero
            if std == 0:
                std = 1e-9

            # Calculate delta and threshold
            if self.delta_multiplier is None:
                delta = std * 0.75
            else:
                delta = self.delta_multiplier if self.delta_multiplier > 0 else std * 0.75

            if self.threshold_multiplier is None:
                threshold = std * 5.0
            else:
                threshold = self.threshold_multiplier if self.threshold_multiplier > 0 else std * 5.0

            # Initialize CUSUM statistics
            s_pos = np.zeros_like(series, dtype=float)
            s_neg = np.zeros_like(series, dtype=float)
            scores = np.zeros_like(series, dtype=float)

            # Calculate CUSUM statistics
            for i in range(len(series)):
                x = series[i]
                
                # Positive shift detection
                if i == 0:
                    s_pos[i] = max(0, x - mu - delta)
                else:
                    s_pos[i] = max(0, (x - mu - delta) + s_pos[i-1])
                
                # Negative shift detection
                if i == 0:
                    s_neg[i] = max(0, mu - x - delta)
                else:
                    s_neg[i] = max(0, (mu - x - delta) + s_neg[i-1])
                
                # Score is max of positive/negative CUSUM normalized by threshold
                scores[i] = max(s_pos[i], s_neg[i]) / (threshold or 1e-9)

            # Find changepoint (index where CUSUM first exceeds threshold)
            changepoint_index = -1
            for i in range(len(scores)):
                if scores[i] > self.k_threshold:
                    changepoint_index = i
                    break

            # Filter anomalies by k threshold
            anomalies = self.filter_anomalies(scores)

            # Build evidence
            evidence = {
                's_pos': s_pos.tolist(),
                's_neg': s_neg.tolist(),
                'changepoint_index': changepoint_index,
                'mu': float(mu),
                'std': float(std),
                'delta': float(delta),
                'threshold': float(threshold)
            }

            logger.debug(
                f"CUSUM detection: {len(anomalies)} anomalies found "
                f"out of {len(series)} points, changepoint at index {changepoint_index}"
            )

            return DetectorResult(
                scores=scores,
                anomalies=anomalies,
                evidence=evidence
            )

        except Exception as e:
            logger.error(f"CUSUM detection failed: {e}")
            raise ValueError(f"CUSUM detection error: {e}") from e

