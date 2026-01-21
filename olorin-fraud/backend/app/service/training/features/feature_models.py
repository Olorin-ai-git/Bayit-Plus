"""
Feature Models
Feature: 026-llm-training-pipeline

Dataclasses for enhanced feature vectors used in fraud detection training.
"""

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass
class VelocityFeatures:
    """Multi-window transaction velocity features."""

    tx_count_1h: int = 0
    tx_count_24h: int = 0
    tx_count_7d: int = 0
    tx_count_30d: int = 0
    velocity_1h_24h_ratio: float = 0.0
    velocity_24h_7d_ratio: float = 0.0
    max_tx_in_1h_window: int = 0
    burst_score: float = 0.0

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for feature vector."""
        return {
            "tx_count_1h": self.tx_count_1h,
            "tx_count_24h": self.tx_count_24h,
            "tx_count_7d": self.tx_count_7d,
            "tx_count_30d": self.tx_count_30d,
            "velocity_1h_24h_ratio": self.velocity_1h_24h_ratio,
            "velocity_24h_7d_ratio": self.velocity_24h_7d_ratio,
            "max_tx_in_1h_window": self.max_tx_in_1h_window,
            "burst_score": self.burst_score,
        }


@dataclass
class LifecycleFeatures:
    """Account lifecycle and temporal behavior features."""

    account_age_days: int = 0
    days_since_first_tx: int = 0
    days_since_last_tx: int = 0
    avg_days_between_tx: float = 0.0
    tx_frequency_30d: float = 0.0

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for feature vector."""
        return {
            "account_age_days": self.account_age_days,
            "days_since_first_tx": self.days_since_first_tx,
            "days_since_last_tx": self.days_since_last_tx,
            "avg_days_between_tx": self.avg_days_between_tx,
            "tx_frequency_30d": self.tx_frequency_30d,
        }


@dataclass
class GeoFeatures:
    """Geographic and network risk features."""

    impossible_travel_flag: bool = False
    unique_countries_7d: int = 0
    country_diversity_score: float = 0.0
    vpn_proxy_flag: bool = False
    ip_reputation_score: float = 0.0

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for feature vector."""
        return {
            "impossible_travel_flag": int(self.impossible_travel_flag),
            "unique_countries_7d": self.unique_countries_7d,
            "country_diversity_score": self.country_diversity_score,
            "vpn_proxy_flag": int(self.vpn_proxy_flag),
            "ip_reputation_score": self.ip_reputation_score,
        }


@dataclass
class MerchantFeatures:
    """Merchant benchmark and cross-merchant pattern features."""

    deviation_from_merchant_avg_tx: float = 0.0
    merchant_risk_tier: int = 0
    cross_merchant_pattern_score: float = 0.0
    merchant_fraud_rate: float = 0.0

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for feature vector."""
        return {
            "deviation_from_merchant_avg_tx": self.deviation_from_merchant_avg_tx,
            "merchant_risk_tier": self.merchant_risk_tier,
            "cross_merchant_pattern_score": self.cross_merchant_pattern_score,
            "merchant_fraud_rate": self.merchant_fraud_rate,
        }


@dataclass
class EnhancedFeatureVector:
    """Complete enhanced feature vector combining all feature categories."""

    base_features: Dict[str, Any] = field(default_factory=dict)
    velocity: Optional[VelocityFeatures] = None
    lifecycle: Optional[LifecycleFeatures] = None
    geo: Optional[GeoFeatures] = None
    merchant: Optional[MerchantFeatures] = None
    feature_names: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        """Convert complete feature vector to dictionary."""
        result = dict(self.base_features)
        if self.velocity:
            result.update(self.velocity.to_dict())
        if self.lifecycle:
            result.update(self.lifecycle.to_dict())
        if self.geo:
            result.update(self.geo.to_dict())
        if self.merchant:
            result.update(self.merchant.to_dict())
        return result

    def to_array(self) -> List[float]:
        """Convert to numerical array for ML models."""
        feature_dict = self.to_dict()
        return [float(feature_dict.get(name, 0.0)) for name in self.feature_names]

    def get_feature_count(self) -> int:
        """Return total number of features."""
        return len(self.to_dict())
