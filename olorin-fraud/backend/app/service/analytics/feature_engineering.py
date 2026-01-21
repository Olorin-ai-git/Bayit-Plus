"""
Feature Engineering Pipeline for Fraud Detection.

Optimizes feature extraction with caching and selective extraction.

Week 7 Phase 3 implementation.
"""

import logging
import time
from typing import Any, Dict, List, Optional, Set

from app.service.analytics.feature_cache import get_from_cache, set_in_cache
from app.service.analytics.feature_extraction_helpers import (
    extract_day_of_week,
    extract_hour,
    handle_missing_values,
    safe_float,
)

logger = logging.getLogger(__name__)


class FeatureEngineeringPipeline:
    """
    Optimized feature engineering pipeline.

    Extracts, transforms, and caches features efficiently.
    """

    def __init__(
        self, selected_features: Optional[Set[str]] = None, enable_caching: bool = True
    ):
        """
        Initialize feature engineering pipeline.

        Args:
            selected_features: Set of features to extract (None = all)
            enable_caching: Whether to cache feature extraction results
        """
        self.selected_features = selected_features
        self.enable_caching = enable_caching

        self.extraction_times: Dict[str, List[float]] = {}
        self.extraction_counts: Dict[str, int] = {}

        logger.info(
            f"📊 Initialized FeatureEngineeringPipeline "
            f"(selected={len(selected_features) if selected_features else 'all'}, caching={enable_caching})"
        )

    def extract_optimized_features(
        self,
        transaction: Dict[str, Any],
        advanced_features: Optional[Dict[str, Any]] = None,
        historical_transactions: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """
        Extract optimized feature set for a transaction.

        Args:
            transaction: Transaction dictionary
            advanced_features: Pre-computed advanced features
            historical_transactions: Historical transactions for context

        Returns:
            Dictionary of extracted features
        """
        tx_id = transaction.get("TX_ID_KEY", "unknown")

        # Check cache if enabled
        if self.enable_caching:
            cached_features = get_from_cache(tx_id)
            if cached_features is not None:
                logger.debug(f"📊 Using cached features for {tx_id}")
                return cached_features

        start_time = time.time()

        # Extract core features
        features = {}

        # Basic transaction features
        if self._should_extract("tx_amount"):
            features["tx_amount"] = safe_float(
                transaction.get("TX_AMOUNT") or transaction.get("amount")
            )
        if self._should_extract("tx_hour"):
            features["tx_hour"] = extract_hour(transaction)
        if self._should_extract("tx_day_of_week"):
            features["tx_day_of_week"] = extract_day_of_week(transaction)

        # Advanced features (if provided)
        if advanced_features:
            self._extract_velocity_features(features, advanced_features)
            self._extract_enhanced_velocity_features(features, advanced_features)
            self._extract_other_advanced_features(features, advanced_features)

        # Handle missing values
        features = handle_missing_values(features)

        # Cache if enabled
        if self.enable_caching:
            set_in_cache(tx_id, features)

        # Track extraction time
        extraction_time = time.time() - start_time
        self._track_extraction_time("full_pipeline", extraction_time)

        return features

    def _extract_velocity_features(
        self, features: Dict[str, Any], advanced_features: Dict[str, Any]
    ) -> None:
        """Extract velocity features."""
        if self._should_extract("tx_per_5min_by_email"):
            features["tx_per_5min_by_email"] = advanced_features.get(
                "tx_per_5min_by_email", 0
            )
        if self._should_extract("tx_per_5min_by_device"):
            features["tx_per_5min_by_device"] = advanced_features.get(
                "tx_per_5min_by_device", 0
            )
        if self._should_extract("tx_per_5min_by_ip"):
            features["tx_per_5min_by_ip"] = advanced_features.get(
                "tx_per_5min_by_ip", 0
            )

    def _extract_enhanced_velocity_features(
        self, features: Dict[str, Any], advanced_features: Dict[str, Any]
    ) -> None:
        """Extract enhanced velocity features (Week 5)."""
        if self._should_extract("sliding_window_velocities"):
            sliding_windows = advanced_features.get("sliding_window_velocities", {})
            for window_name, count in sliding_windows.items():
                feature_name = f"velocity_{window_name}"
                if self._should_extract(feature_name):
                    features[feature_name] = count

        if self._should_extract("merchant_concentration"):
            merchant_conc = advanced_features.get("merchant_concentration", {})
            features["merchant_concentration_ratio"] = merchant_conc.get(
                "concentration_ratio", 0.0
            )
            features["merchant_concentration_flag"] = (
                1.0 if merchant_conc.get("is_concentrated") else 0.0
            )

        if self._should_extract("cross_entity_correlation"):
            cross_entity = advanced_features.get("cross_entity_correlation", {})
            features["unique_devices_per_email"] = cross_entity.get(
                "unique_devices_per_email", 0
            )
            features["unique_ips_per_email"] = cross_entity.get(
                "unique_ips_per_email", 0
            )
            features["unique_emails_per_device"] = cross_entity.get(
                "unique_emails_per_device", 0
            )

    def _extract_other_advanced_features(
        self, features: Dict[str, Any], advanced_features: Dict[str, Any]
    ) -> None:
        """Extract other advanced features."""
        if self._should_extract("distance_anomaly_score"):
            features["distance_anomaly_score"] = advanced_features.get(
                "distance_anomaly_score", 0.0
            )
        if self._should_extract("amount_clustering_score"):
            features["amount_clustering_score"] = advanced_features.get(
                "amount_clustering_score", 0.0
            )
        if self._should_extract("device_instability_score"):
            features["device_instability_score"] = advanced_features.get(
                "device_instability_score", 0.0
            )
        if self._should_extract("merchant_diversity_score"):
            features["merchant_diversity_score"] = advanced_features.get(
                "merchant_diversity_score", 0.5
            )

    def _should_extract(self, feature_name: str) -> bool:
        """Check if feature should be extracted."""
        if self.selected_features is None:
            return True
        return feature_name in self.selected_features

    def _track_extraction_time(
        self, feature_group: str, extraction_time: float
    ) -> None:
        """Track feature extraction time for performance monitoring."""
        if feature_group not in self.extraction_times:
            self.extraction_times[feature_group] = []
            self.extraction_counts[feature_group] = 0

        self.extraction_times[feature_group].append(extraction_time)
        self.extraction_counts[feature_group] += 1

        # Keep only last 1000 timings
        if len(self.extraction_times[feature_group]) > 1000:
            self.extraction_times[feature_group] = self.extraction_times[feature_group][
                -1000:
            ]

    def get_performance_stats(self) -> Dict[str, Any]:
        """Get feature extraction performance statistics."""
        import statistics

        stats = {}
        for feature_group, times in self.extraction_times.items():
            if times:
                stats[feature_group] = {
                    "count": self.extraction_counts[feature_group],
                    "avg_time_ms": statistics.mean(times) * 1000,
                    "p50_time_ms": statistics.median(times) * 1000,
                    "p95_time_ms": (
                        sorted(times)[int(len(times) * 0.95)] * 1000
                        if len(times) > 20
                        else None
                    ),
                }

        return stats
