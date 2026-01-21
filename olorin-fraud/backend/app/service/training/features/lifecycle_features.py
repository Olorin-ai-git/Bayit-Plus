"""
Lifecycle Features Extractor
Feature: 026-llm-training-pipeline

Extracts account lifecycle and temporal behavior features for fraud detection.
"""

from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from app.service.logging import get_bridge_logger
from app.service.training.features.feature_models import LifecycleFeatures

logger = get_bridge_logger(__name__)


class LifecycleFeatureExtractor:
    """Extracts lifecycle-based features from transaction data."""

    def extract(
        self,
        transactions: List[Dict[str, Any]],
        reference_time: datetime,
        account_created_at: Optional[datetime] = None,
    ) -> LifecycleFeatures:
        """
        Extract lifecycle features from transaction list.

        Args:
            transactions: List of transaction dicts with TX_DATETIME
            reference_time: Reference point for calculations
            account_created_at: Optional account creation timestamp

        Returns:
            LifecycleFeatures with calculated values
        """
        if not transactions:
            return LifecycleFeatures()

        tx_times = self._parse_transaction_times(transactions)
        if not tx_times:
            return LifecycleFeatures()

        first_tx = min(tx_times)
        last_tx = max(tx_times)

        account_age = self._calculate_account_age(
            account_created_at, first_tx, reference_time
        )
        days_since_first = (reference_time - first_tx).days
        days_since_last = (reference_time - last_tx).days
        avg_between = self._calculate_avg_days_between(tx_times)
        frequency_30d = self._calculate_frequency_30d(tx_times, reference_time)

        return LifecycleFeatures(
            account_age_days=account_age,
            days_since_first_tx=max(0, days_since_first),
            days_since_last_tx=max(0, days_since_last),
            avg_days_between_tx=avg_between,
            tx_frequency_30d=frequency_30d,
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

    def _calculate_account_age(
        self,
        account_created_at: Optional[datetime],
        first_tx: datetime,
        reference_time: datetime,
    ) -> int:
        """Calculate account age in days."""
        if account_created_at:
            age_days = (reference_time - account_created_at).days
        else:
            age_days = (reference_time - first_tx).days
        return max(0, age_days)

    def _calculate_avg_days_between(self, tx_times: List[datetime]) -> float:
        """Calculate average days between consecutive transactions."""
        if len(tx_times) < 2:
            return 0.0

        intervals = []
        for i in range(1, len(tx_times)):
            delta = (tx_times[i] - tx_times[i - 1]).total_seconds() / 86400
            intervals.append(delta)

        if not intervals:
            return 0.0

        return round(sum(intervals) / len(intervals), 2)

    def _calculate_frequency_30d(
        self, tx_times: List[datetime], reference_time: datetime
    ) -> float:
        """Calculate transaction frequency in last 30 days."""
        window_start = reference_time - timedelta(days=30)
        tx_in_window = [t for t in tx_times if window_start <= t <= reference_time]
        return round(len(tx_in_window) / 30.0, 4)
