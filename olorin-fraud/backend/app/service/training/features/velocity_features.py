"""
Velocity Features Extractor
Feature: 026-llm-training-pipeline

Extracts multi-window transaction velocity features for fraud detection.
"""

from datetime import datetime, timedelta
from typing import Any, Dict, List

from app.service.logging import get_bridge_logger
from app.service.training.features.feature_models import VelocityFeatures

logger = get_bridge_logger(__name__)


class VelocityFeatureExtractor:
    """Extracts velocity-based features from transaction data."""

    def __init__(
        self,
        windows_hours: List[int],
    ):
        """
        Initialize velocity feature extractor.

        Args:
            windows_hours: List of window sizes in hours (e.g., [1, 24, 168, 720])
        """
        self._windows_hours = windows_hours

    def extract(
        self,
        transactions: List[Dict[str, Any]],
        reference_time: datetime,
    ) -> VelocityFeatures:
        """
        Extract velocity features from transaction list.

        Args:
            transactions: List of transaction dicts with TX_DATETIME
            reference_time: Reference point for window calculations

        Returns:
            VelocityFeatures with calculated values
        """
        if not transactions:
            return VelocityFeatures()

        tx_times = self._parse_transaction_times(transactions)
        if not tx_times:
            return VelocityFeatures()

        counts = self._count_by_window(tx_times, reference_time)
        ratios = self._calculate_ratios(counts)
        burst = self._calculate_burst_metrics(tx_times)

        return VelocityFeatures(
            tx_count_1h=counts.get(1, 0),
            tx_count_24h=counts.get(24, 0),
            tx_count_7d=counts.get(168, 0),
            tx_count_30d=counts.get(720, 0),
            velocity_1h_24h_ratio=ratios.get("1h_24h", 0.0),
            velocity_24h_7d_ratio=ratios.get("24h_7d", 0.0),
            max_tx_in_1h_window=burst.get("max_1h", 0),
            burst_score=burst.get("score", 0.0),
        )

    def _parse_transaction_times(
        self, transactions: List[Dict[str, Any]]
    ) -> List[datetime]:
        """Parse transaction timestamps."""
        times = []
        for tx in transactions:
            tx_time = tx.get("TX_DATETIME")
            if tx_time is None:
                continue
            if isinstance(tx_time, str):
                try:
                    tx_time = datetime.fromisoformat(tx_time.replace("Z", "+00:00"))
                except ValueError:
                    continue
            if isinstance(tx_time, datetime):
                times.append(tx_time)
        return sorted(times)

    def _count_by_window(
        self,
        tx_times: List[datetime],
        reference_time: datetime,
    ) -> Dict[int, int]:
        """Count transactions in each time window."""
        counts = {}
        for hours in self._windows_hours:
            window_start = reference_time - timedelta(hours=hours)
            count = sum(1 for t in tx_times if window_start <= t <= reference_time)
            counts[hours] = count
        return counts

    def _calculate_ratios(self, counts: Dict[int, int]) -> Dict[str, float]:
        """Calculate velocity ratios between windows."""
        ratios = {}
        count_1h = counts.get(1, 0)
        count_24h = counts.get(24, 0)
        count_7d = counts.get(168, 0)

        if count_24h > 0:
            ratios["1h_24h"] = round(count_1h / count_24h, 4)
        if count_7d > 0:
            ratios["24h_7d"] = round(count_24h / count_7d, 4)

        return ratios

    def _calculate_burst_metrics(
        self, tx_times: List[datetime]
    ) -> Dict[str, Any]:
        """Calculate burst detection metrics."""
        if len(tx_times) < 2:
            return {"max_1h": len(tx_times), "score": 0.0}

        max_in_1h = 0
        for i, ref_time in enumerate(tx_times):
            window_start = ref_time - timedelta(hours=1)
            count = sum(1 for t in tx_times if window_start <= t <= ref_time)
            max_in_1h = max(max_in_1h, count)

        burst_score = min(1.0, max_in_1h / 10.0) if max_in_1h > 0 else 0.0

        return {"max_1h": max_in_1h, "score": round(burst_score, 4)}
