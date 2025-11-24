"""
STL+MAD Detector Implementation

Uses Seasonal and Trend decomposition using Loess (STL) with
Median Absolute Deviation (MAD) for robust anomaly detection.
"""

import numpy as np
from statsmodels.tsa.seasonal import STL
from typing import Dict, Any

from app.service.anomaly.detectors.base import BaseDetector, DetectorResult
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class STLMADDetector(BaseDetector):
    """
    STL+MAD detector for time series anomaly detection.

    Uses STL decomposition to separate trend and seasonal components,
    then uses MAD on residuals to identify anomalies.
    """

    def __init__(self, params: Dict[str, Any]):
        """
        Initialize STL+MAD detector.

        Args:
            params: Detector parameters including:
                - period: STL period (default: 672 for 7 days at 15-min intervals)
                - robust: Use robust STL decomposition (default: True)
                - k: Anomaly threshold multiplier (default: 3.5)
                - persistence: Required persistence windows (default: 2)
                - min_support: Minimum data points required (default: 50)
        """
        super().__init__(params)
        self.period = params.get('period', 672)
        self.robust = params.get('robust', True)

    def detect(self, series: np.ndarray) -> DetectorResult:
        """
        Detect anomalies using STL+MAD method.

        Args:
            series: Time series data as numpy array

        Returns:
            DetectorResult with scores, anomaly indices, and evidence

        Raises:
            ValueError: If series is invalid or insufficient data
        """
        self.validate_series(series)

        try:
            # Adjust period if series is shorter than period
            actual_period = min(self.period, len(series) // 2)
            if actual_period < 2:
                actual_period = 2

            # Perform STL decomposition
            stl_result = STL(series, period=actual_period, robust=self.robust).fit()

            # Calculate residuals
            trend = stl_result.trend
            seasonal = stl_result.seasonal
            residuals = series - (trend + seasonal)

            # Calculate MAD (Median Absolute Deviation)
            median_residual = np.median(residuals)
            mad = np.median(np.abs(residuals - median_residual))
            
            # Avoid division by zero
            if mad == 0:
                mad = 1e-9

            # Calculate normalized scores: |residual| / (1.4826 * MAD)
            # Factor 1.4826 makes MAD consistent with standard deviation for normal distribution
            scores = np.abs(residuals) / (1.4826 * mad)

            # Filter anomalies by k threshold
            anomalies = self.filter_anomalies(scores)

            # Build evidence
            evidence = {
                'residuals': residuals.tolist(),
                'mad': float(mad),
                'trend': trend.tolist(),
                'seasonal': seasonal.tolist(),
                'period': actual_period
            }

            logger.debug(
                f"STL+MAD detection: {len(anomalies)} anomalies found "
                f"out of {len(series)} points"
            )

            return DetectorResult(
                scores=scores,
                anomalies=anomalies,
                evidence=evidence
            )

        except Exception as e:
            logger.error(f"STL+MAD detection failed: {e}")
            raise ValueError(f"STL+MAD detection error: {e}") from e

