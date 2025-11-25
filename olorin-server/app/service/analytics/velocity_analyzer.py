"""
Enhanced Velocity Analyzer for Fraud Detection.

Implements advanced velocity analysis:
1. Sliding window velocity (5min, 15min, 1hr, 24hr)
2. Entity-scoped velocity (email, device, IP, merchant)
3. Merchant concentration index
4. Cross-entity velocity correlation

Week 5 Phase 2 implementation.
"""

import logging
import time
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

from app.service.analytics.velocity_calculations import (
    calculate_entity_velocities,
    calculate_merchant_concentration,
    calculate_sliding_windows,
    detect_cross_entity_correlation,
)
from app.service.analytics.velocity_utils import extract_timestamp

logger = logging.getLogger(__name__)

# Cache configuration
VELOCITY_CACHE_TTL_SECONDS = 300  # 5 minutes cache for velocity metrics
_velocity_cache: Dict[str, Tuple[Any, float]] = {}


class VelocityAnalyzer:
    """
    Enhanced velocity analyzer with sliding windows and entity-scoped tracking.

    Provides:
    - Multi-window velocity tracking (5min, 15min, 1hr, 24hr)
    - Entity-scoped velocity (per email, device, IP, merchant)
    - Merchant concentration analysis
    - Cross-entity velocity correlation
    """

    def __init__(
        self,
        window_minutes_short: int = 5,
        window_minutes_medium: int = 15,
        window_hours_long: int = 1,
        window_hours_daily: int = 24,
        concentration_threshold: float = 0.70,
    ):
        """
        Initialize velocity analyzer with configurable time windows.

        Args:
            window_minutes_short: Short time window in minutes
            window_minutes_medium: Medium time window in minutes
            window_hours_long: Long time window in hours
            window_hours_daily: Daily time window in hours
            concentration_threshold: Merchant concentration threshold (0.0-1.0)
        """
        self.window_minutes_short = window_minutes_short
        self.window_minutes_medium = window_minutes_medium
        self.window_hours_long = window_hours_long
        self.window_hours_daily = window_hours_daily
        self.concentration_threshold = concentration_threshold

        logger.info(
            f"📊 VelocityAnalyzer initialized with windows: "
            f"{window_minutes_short}min, {window_minutes_medium}min, "
            f"{window_hours_long}hr, {window_hours_daily}hr"
        )

    def analyze_transaction_velocity(
        self,
        transaction: Dict[str, Any],
        historical_transactions: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """
        Analyze velocity metrics for a single transaction.

        Args:
            transaction: Transaction to analyze
            historical_transactions: Optional list of historical transactions

        Returns:
            Dictionary containing all velocity metrics
        """
        try:
            tx_id = transaction.get("TX_ID_KEY", "unknown")
            tx_timestamp = extract_timestamp(transaction)

            if not tx_timestamp:
                logger.warning(f"⚠️ No timestamp for transaction {tx_id}")
                return self._empty_velocity_result()

            # Calculate sliding window velocities
            sliding_windows = calculate_sliding_windows(
                transaction,
                tx_timestamp,
                historical_transactions,
                self.window_minutes_short,
                self.window_minutes_medium,
                self.window_hours_long,
                self.window_hours_daily,
            )

            # Calculate entity-scoped velocities
            entity_velocities = calculate_entity_velocities(
                transaction,
                tx_timestamp,
                historical_transactions,
                self.window_hours_daily,
            )

            # Calculate merchant concentration
            merchant_concentration = calculate_merchant_concentration(
                transaction, historical_transactions, self.concentration_threshold
            )

            # Detect cross-entity correlations
            cross_entity = detect_cross_entity_correlation(
                transaction, historical_transactions
            )

            return {
                "success": True,
                "transaction_id": tx_id,
                "sliding_windows": sliding_windows,
                "entity_velocities": entity_velocities,
                "merchant_concentration": merchant_concentration,
                "cross_entity_correlation": cross_entity,
                "timestamp": tx_timestamp.isoformat(),
            }

        except Exception as e:
            logger.error(f"❌ Velocity analysis failed: {e}", exc_info=True)
            return {"success": False, "error": str(e)}

    def _empty_velocity_result(self) -> Dict[str, Any]:
        """Return empty velocity result structure."""
        return {
            "success": True,
            "sliding_windows": {},
            "entity_velocities": {},
            "merchant_concentration": {},
            "cross_entity_correlation": {},
        }
