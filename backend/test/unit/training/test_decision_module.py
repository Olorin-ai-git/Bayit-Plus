"""
Unit tests for Decision Module (Risk Bands, Segment Thresholds)
Feature: 026-llm-training-pipeline
"""

import pytest

from app.service.training.decision.decision_models import (
    BandConfig,
    DecisionAction,
    RiskBand,
    SegmentConfig,
    SegmentedDecision,
)
from app.service.training.decision.risk_bands import RiskBandManager
from app.service.training.decision.segment_thresholds import SegmentThresholdManager


class TestRiskBandEnum:
    """Tests for risk band enum."""

    def test_risk_band_values(self):
        """Test risk band enum values."""
        assert RiskBand.AUTO_APPROVE.value == "auto_approve"
        assert RiskBand.LOG_ONLY.value == "log_only"
        assert RiskBand.MANUAL_REVIEW.value == "manual_review"
        assert RiskBand.AUTO_DECLINE.value == "auto_decline"

    def test_risk_band_ordering(self):
        """Test risk bands have correct risk ordering."""
        bands = list(RiskBand)
        assert bands[0] == RiskBand.AUTO_APPROVE
        assert bands[-1] == RiskBand.AUTO_DECLINE


class TestDecisionActionEnum:
    """Tests for decision action enum."""

    def test_decision_action_values(self):
        """Test decision action enum values."""
        assert DecisionAction.APPROVE.value == "approve"
        assert DecisionAction.APPROVE_LOG.value == "approve_log"
        assert DecisionAction.REVIEW.value == "review"
        assert DecisionAction.DECLINE.value == "decline"


class TestBandConfig:
    """Tests for band configuration."""

    def test_band_config_creation(self):
        """Test creating band config."""
        config = BandConfig(
            band=RiskBand.AUTO_APPROVE,
            min_score=0.0,
            max_score=0.30,
            action=DecisionAction.APPROVE,
        )
        assert config.band == RiskBand.AUTO_APPROVE
        assert config.min_score == 0.0
        assert config.max_score == 0.30

    def test_band_config_contains_score(self):
        """Test checking if score falls in band."""
        config = BandConfig(
            band=RiskBand.MANUAL_REVIEW,
            min_score=0.55,
            max_score=0.75,
            action=DecisionAction.REVIEW,
        )
        assert config.contains_score(0.60) is True
        assert config.contains_score(0.50) is False
        assert config.contains_score(0.75) is False  # max_score is exclusive


class TestSegmentConfig:
    """Tests for segment configuration."""

    def test_segment_config_creation(self):
        """Test creating segment config."""
        config = SegmentConfig(
            segment_id="seg_001",
            segment_name="high_risk_merchant",
            threshold_override=0.40,
        )
        assert config.segment_name == "high_risk_merchant"
        assert config.threshold_override == 0.40

    def test_segment_config_get_threshold(self):
        """Test getting threshold with override."""
        config = SegmentConfig(
            segment_id="seg_002",
            segment_name="test",
            threshold_override=0.35,
        )
        assert config.get_threshold(0.5) == 0.35

        config_default = SegmentConfig(
            segment_id="seg_003",
            segment_name="test2",
        )
        assert config_default.get_threshold(0.5) == 0.5


class TestSegmentedDecision:
    """Tests for segmented decision."""

    def test_segmented_decision_creation(self):
        """Test creating segmented decision."""
        decision = SegmentedDecision(
            risk_score=0.65,
            risk_band=RiskBand.MANUAL_REVIEW,
            action=DecisionAction.REVIEW,
            segment="default",
            confidence=0.85,
        )
        assert decision.risk_score == 0.65
        assert decision.risk_band == RiskBand.MANUAL_REVIEW
        assert decision.action == DecisionAction.REVIEW

    def test_segmented_decision_to_dict(self):
        """Test segmented decision to dict conversion."""
        decision = SegmentedDecision(
            risk_score=0.45,
            risk_band=RiskBand.LOG_ONLY,
            action=DecisionAction.APPROVE_LOG,
            segment="default",
            confidence=0.9,
        )
        d = decision.to_dict()
        assert isinstance(d, dict)
        assert d["risk_score"] == 0.45
        assert d["risk_band"] == "log_only"
        assert d["action"] == "approve_log"

    def test_segmented_decision_is_high_risk(self):
        """Test is_high_risk property."""
        high_risk = SegmentedDecision(
            risk_score=0.85,
            risk_band=RiskBand.AUTO_DECLINE,
            action=DecisionAction.DECLINE,
            segment="default",
            confidence=0.95,
        )
        assert high_risk.is_high_risk is True

        low_risk = SegmentedDecision(
            risk_score=0.15,
            risk_band=RiskBand.AUTO_APPROVE,
            action=DecisionAction.APPROVE,
            segment="default",
            confidence=0.95,
        )
        assert low_risk.is_high_risk is False


class TestRiskBandManager:
    """Tests for risk band manager."""

    def test_risk_band_manager_init(self):
        """Test risk band manager initialization."""
        manager = RiskBandManager()
        assert manager is not None

    def test_risk_band_manager_is_enabled(self):
        """Test checking if risk bands enabled."""
        manager = RiskBandManager()
        assert isinstance(manager.is_enabled(), bool)

    def test_risk_band_manager_get_band(self):
        """Test getting band config for score."""
        manager = RiskBandManager()
        low_band_config = manager.get_band(0.15)
        assert isinstance(low_band_config, BandConfig)
        assert low_band_config.band == RiskBand.AUTO_APPROVE

        high_band_config = manager.get_band(0.85)
        assert isinstance(high_band_config, BandConfig)
        assert high_band_config.band == RiskBand.AUTO_DECLINE

    def test_risk_band_manager_get_action_for_score(self):
        """Test getting action for score."""
        manager = RiskBandManager()
        action = manager.get_action_for_score(0.15)
        assert action == DecisionAction.APPROVE

        action = manager.get_action_for_score(0.85)
        assert action == DecisionAction.DECLINE

    def test_risk_band_manager_make_decision(self):
        """Test making a decision based on score."""
        manager = RiskBandManager()
        decision = manager.make_decision(
            score=0.65, confidence=0.9, segment="test"
        )
        assert isinstance(decision, SegmentedDecision)
        assert decision.risk_score == 0.65


class TestSegmentThresholdManager:
    """Tests for segment threshold manager."""

    def test_segment_threshold_manager_init(self):
        """Test segment threshold manager initialization."""
        manager = SegmentThresholdManager()
        assert manager is not None

    def test_segment_threshold_manager_is_enabled(self):
        """Test checking if segmentation enabled."""
        manager = SegmentThresholdManager()
        assert isinstance(manager.is_enabled(), bool)

    def test_segment_threshold_manager_get_threshold(self):
        """Test getting threshold for segment."""
        manager = SegmentThresholdManager()
        threshold = manager.get_threshold(segment="unknown")
        assert isinstance(threshold, float)
        assert 0.0 <= threshold <= 1.0

    def test_segment_threshold_manager_get_adjusted_threshold(self):
        """Test getting adjusted threshold for segment."""
        manager = SegmentThresholdManager()
        adjusted = manager.get_adjusted_threshold(
            segment="unknown", base_score=0.5
        )
        assert isinstance(adjusted, float)
        assert 0.0 <= adjusted <= 1.0
