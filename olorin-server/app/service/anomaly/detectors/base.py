"""
Abstract Base Detector Class

This module defines the abstract interface for all anomaly detection algorithms.
All detector implementations must inherit from this base class.
"""

from abc import ABC, abstractmethod
from typing import Dict, List, Any, Optional
import numpy as np
from datetime import datetime

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class DetectorResult:
    """Result from detector execution."""

    def __init__(
        self,
        scores: np.ndarray,
        anomalies: List[int],
        evidence: Optional[Dict[str, Any]] = None
    ):
        self.scores = scores
        self.anomalies = anomalies
        self.evidence = evidence or {}


class BaseDetector(ABC):
    """
    Abstract base class for anomaly detection algorithms.

    All detector implementations must inherit from this class and implement
    the detect method.
    """

    def __init__(self, params: Dict[str, Any]):
        """
        Initialize detector with parameters.

        Args:
            params: Detector-specific configuration parameters
        """
        self.params = params
        from app.config.anomaly_config import get_anomaly_config
        config = get_anomaly_config()
        self.k_threshold = params.get('k', config.default_k_threshold)
        self.persistence = params.get('persistence', config.default_persistence)
        self.min_support = params.get('min_support', config.default_min_support)

    @abstractmethod
    def detect(self, series: np.ndarray) -> DetectorResult:
        """
        Detect anomalies in a time series.

        Args:
            series: Time series data as numpy array

        Returns:
            DetectorResult with scores, anomaly indices, and evidence

        Raises:
            ValueError: If series is invalid or insufficient data
        """
        pass

    def validate_series(self, series: np.ndarray) -> None:
        """
        Validate time series has sufficient data.

        Args:
            series: Time series to validate

        Raises:
            ValueError: If series is invalid or insufficient
        """
        if series is None or len(series) == 0:
            raise ValueError("Series cannot be empty")
        if len(series) < self.min_support:
            raise ValueError(
                f"Insufficient data: {len(series)} < {self.min_support} "
                f"(min_support)"
            )
        if not np.all(np.isfinite(series)):
            raise ValueError("Series contains non-finite values (NaN or Inf)")

    def filter_anomalies(
        self,
        scores: np.ndarray,
        evidence: Optional[Dict[str, Any]] = None
    ) -> List[int]:
        """
        Filter anomalies based on k threshold.

        Args:
            scores: Anomaly scores for each point
            evidence: Optional evidence dictionary

        Returns:
            List of indices where score > k_threshold
        """
        anomaly_indices = np.where(scores > self.k_threshold)[0].tolist()
        return anomaly_indices

