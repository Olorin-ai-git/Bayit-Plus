"""
Unit tests for Feature Engineering Module
Feature: 026-llm-training-pipeline
"""

from datetime import datetime

import pytest

from app.service.training.features.feature_models import (
    EnhancedFeatureVector,
    GeoFeatures,
    LifecycleFeatures,
    MerchantFeatures,
    VelocityFeatures,
)
from app.service.training.features.lifecycle_features import LifecycleFeatureExtractor


class TestVelocityFeatures:
    """Tests for velocity features dataclass."""

    def test_velocity_features_creation(self):
        """Test creating velocity features dataclass."""
        features = VelocityFeatures(
            tx_count_1h=5,
            tx_count_24h=20,
            tx_count_7d=100,
            tx_count_30d=400,
        )
        assert features.tx_count_1h == 5
        assert features.tx_count_24h == 20

    def test_velocity_features_to_dict(self):
        """Test velocity features to dict conversion."""
        features = VelocityFeatures(
            tx_count_1h=10,
            tx_count_24h=50,
            velocity_1h_24h_ratio=0.2,
        )
        d = features.to_dict()
        assert d["tx_count_1h"] == 10
        assert d["velocity_1h_24h_ratio"] == 0.2

    def test_velocity_features_defaults(self):
        """Test velocity features default values."""
        features = VelocityFeatures()
        assert features.tx_count_1h == 0
        assert features.burst_score == 0.0


class TestLifecycleFeatures:
    """Tests for lifecycle features dataclass."""

    def test_lifecycle_features_creation(self):
        """Test creating lifecycle features dataclass."""
        features = LifecycleFeatures(
            account_age_days=365,
            days_since_first_tx=300,
            days_since_last_tx=1,
        )
        assert features.account_age_days == 365
        assert features.days_since_last_tx == 1

    def test_lifecycle_features_to_dict(self):
        """Test lifecycle features to dict conversion."""
        features = LifecycleFeatures(account_age_days=100)
        d = features.to_dict()
        assert d["account_age_days"] == 100

    def test_lifecycle_extractor_init(self):
        """Test lifecycle extractor initialization."""
        extractor = LifecycleFeatureExtractor()
        assert extractor is not None


class TestGeoFeatures:
    """Tests for geo features dataclass."""

    def test_geo_features_creation(self):
        """Test creating geo features dataclass."""
        features = GeoFeatures(
            unique_countries_7d=3,
            impossible_travel_flag=False,
            country_diversity_score=0.5,
        )
        assert features.unique_countries_7d == 3
        assert features.impossible_travel_flag is False

    def test_geo_features_to_dict(self):
        """Test geo features to dict conversion."""
        features = GeoFeatures(
            impossible_travel_flag=True,
            unique_countries_7d=5,
        )
        d = features.to_dict()
        assert d["impossible_travel_flag"] == 1
        assert d["unique_countries_7d"] == 5


class TestMerchantFeatures:
    """Tests for merchant features dataclass."""

    def test_merchant_features_creation(self):
        """Test creating merchant features dataclass."""
        features = MerchantFeatures(
            deviation_from_merchant_avg_tx=2.5,
            merchant_risk_tier=2,
            cross_merchant_pattern_score=0.3,
        )
        assert features.deviation_from_merchant_avg_tx == 2.5
        assert features.merchant_risk_tier == 2

    def test_merchant_features_to_dict(self):
        """Test merchant features to dict conversion."""
        features = MerchantFeatures(
            merchant_fraud_rate=0.02,
            merchant_risk_tier=1,
        )
        d = features.to_dict()
        assert d["merchant_fraud_rate"] == 0.02


class TestEnhancedFeatureVector:
    """Tests for enhanced feature vector."""

    def test_enhanced_feature_vector_creation(self):
        """Test creating enhanced feature vector."""
        vector = EnhancedFeatureVector(
            velocity=VelocityFeatures(),
            lifecycle=LifecycleFeatures(),
            geo=GeoFeatures(),
            merchant=MerchantFeatures(),
        )
        assert vector.velocity is not None
        assert vector.lifecycle is not None

    def test_enhanced_feature_vector_to_dict(self):
        """Test converting feature vector to dict."""
        vector = EnhancedFeatureVector(
            velocity=VelocityFeatures(tx_count_1h=10),
            lifecycle=LifecycleFeatures(account_age_days=50),
            geo=GeoFeatures(),
            merchant=MerchantFeatures(),
        )
        d = vector.to_dict()
        assert isinstance(d, dict)
        assert d["tx_count_1h"] == 10
        assert d["account_age_days"] == 50

    def test_enhanced_feature_vector_get_feature_count(self):
        """Test getting feature count."""
        vector = EnhancedFeatureVector(
            velocity=VelocityFeatures(),
            lifecycle=LifecycleFeatures(),
            geo=GeoFeatures(),
            merchant=MerchantFeatures(),
        )
        count = vector.get_feature_count()
        assert count > 0

    def test_enhanced_feature_vector_to_array(self):
        """Test converting to array with feature names."""
        vector = EnhancedFeatureVector(
            velocity=VelocityFeatures(tx_count_1h=10),
            lifecycle=LifecycleFeatures(),
            geo=GeoFeatures(),
            merchant=MerchantFeatures(),
            feature_names=["tx_count_1h", "account_age_days"],
        )
        arr = vector.to_array()
        assert isinstance(arr, list)
        assert len(arr) == 2
        assert arr[0] == 10.0
