"""
Feature Engineer
Feature: 026-llm-training-pipeline

Orchestrates all feature extraction modules for fraud detection training.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional

from app.service.logging import get_bridge_logger
from app.service.training.features.feature_models import (
    EnhancedFeatureVector,
    GeoFeatures,
    LifecycleFeatures,
    MerchantFeatures,
    VelocityFeatures,
)
from app.service.training.features.geo_features import GeoFeatureExtractor
from app.service.training.features.lifecycle_features import LifecycleFeatureExtractor
from app.service.training.features.merchant_features import MerchantFeatureExtractor
from app.service.training.features.velocity_features import VelocityFeatureExtractor
from app.service.training.training_config_loader import get_training_config

logger = get_bridge_logger(__name__)

FEATURE_NAMES = [
    "total_transactions", "total_gmv", "avg_tx_value", "std_tx_value",
    "ip_count", "device_count", "merchant_count",
    "tx_count_1h", "tx_count_24h", "tx_count_7d", "tx_count_30d",
    "velocity_1h_24h_ratio", "velocity_24h_7d_ratio",
    "max_tx_in_1h_window", "burst_score",
    "account_age_days", "days_since_first_tx", "days_since_last_tx",
    "avg_days_between_tx", "tx_frequency_30d",
    "impossible_travel_flag", "unique_countries_7d", "country_diversity_score",
    "vpn_proxy_flag", "ip_reputation_score",
    "deviation_from_merchant_avg_tx", "merchant_risk_tier",
    "cross_merchant_pattern_score", "merchant_fraud_rate",
]


class FeatureEngineer:
    """Orchestrates feature extraction for training samples."""

    def __init__(self):
        """Initialize feature engineer with config-driven extractors."""
        self._config = get_training_config()
        self._init_extractors()

    def _init_extractors(self) -> None:
        """Initialize feature extractors based on configuration."""
        features_config = getattr(self._config, "features", None)

        velocity_config = getattr(features_config, "velocity", None) if features_config else None
        self._velocity_enabled = getattr(velocity_config, "enabled", True) if velocity_config else True
        windows = getattr(velocity_config, "windows_hours", [1, 24, 168, 720]) if velocity_config else [1, 24, 168, 720]
        self._velocity_extractor = VelocityFeatureExtractor(windows_hours=windows)

        lifecycle_config = getattr(features_config, "lifecycle", None) if features_config else None
        self._lifecycle_enabled = getattr(lifecycle_config, "enabled", True) if lifecycle_config else True
        self._lifecycle_extractor = LifecycleFeatureExtractor()

        geo_config = getattr(features_config, "geo", None) if features_config else None
        self._geo_enabled = getattr(geo_config, "enabled", True) if geo_config else True
        impossible_km = getattr(geo_config, "impossible_travel_km", 500) if geo_config else 500
        impossible_hours = getattr(geo_config, "impossible_travel_hours", 1) if geo_config else 1
        self._geo_extractor = GeoFeatureExtractor(
            impossible_travel_km=impossible_km,
            impossible_travel_hours=impossible_hours,
        )

        merchant_config = getattr(features_config, "merchant", None) if features_config else None
        self._merchant_enabled = getattr(merchant_config, "enabled", True) if merchant_config else True
        peer_days = getattr(merchant_config, "peer_window_days", 30) if merchant_config else 30
        self._merchant_extractor = MerchantFeatureExtractor(peer_window_days=peer_days)

    def extract_features(
        self,
        transactions: List[Dict[str, Any]],
        base_features: Dict[str, Any],
        reference_time: Optional[datetime] = None,
        merchant_benchmarks: Optional[Dict[str, Any]] = None,
    ) -> EnhancedFeatureVector:
        """
        Extract complete feature vector from transactions.

        Args:
            transactions: List of raw transaction dicts
            base_features: Pre-computed base features from aggregation
            reference_time: Reference point for calculations
            merchant_benchmarks: Optional merchant benchmark data

        Returns:
            EnhancedFeatureVector with all feature categories
        """
        if reference_time is None:
            reference_time = datetime.utcnow()

        velocity = self._extract_velocity(transactions, reference_time)
        lifecycle = self._extract_lifecycle(transactions, reference_time)
        geo = self._extract_geo(transactions, reference_time)
        merchant = self._extract_merchant(transactions, merchant_benchmarks)

        return EnhancedFeatureVector(
            base_features=base_features,
            velocity=velocity,
            lifecycle=lifecycle,
            geo=geo,
            merchant=merchant,
            feature_names=FEATURE_NAMES,
        )

    def _extract_velocity(
        self, transactions: List[Dict[str, Any]], reference_time: datetime
    ) -> Optional[VelocityFeatures]:
        """Extract velocity features if enabled."""
        if not self._velocity_enabled:
            return None
        return self._velocity_extractor.extract(transactions, reference_time)

    def _extract_lifecycle(
        self, transactions: List[Dict[str, Any]], reference_time: datetime
    ) -> Optional[LifecycleFeatures]:
        """Extract lifecycle features if enabled."""
        if not self._lifecycle_enabled:
            return None
        return self._lifecycle_extractor.extract(transactions, reference_time)

    def _extract_geo(
        self, transactions: List[Dict[str, Any]], reference_time: datetime
    ) -> Optional[GeoFeatures]:
        """Extract geo features if enabled."""
        if not self._geo_enabled:
            return None
        return self._geo_extractor.extract(transactions, reference_time)

    def _extract_merchant(
        self,
        transactions: List[Dict[str, Any]],
        benchmarks: Optional[Dict[str, Any]],
    ) -> Optional[MerchantFeatures]:
        """Extract merchant features if enabled."""
        if not self._merchant_enabled:
            return None
        return self._merchant_extractor.extract(transactions, benchmarks)


_feature_engineer: Optional[FeatureEngineer] = None


def get_feature_engineer() -> FeatureEngineer:
    """Get cached feature engineer instance."""
    global _feature_engineer
    if _feature_engineer is None:
        _feature_engineer = FeatureEngineer()
    return _feature_engineer
