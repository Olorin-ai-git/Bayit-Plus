"""
Unit tests for Unified Threshold Configuration Module
Feature: Training Data Separation & Positive GMV
"""

import os
from unittest.mock import patch

import pytest


class TestThresholdConfigLoader:
    """Tests for threshold configuration loading."""

    def test_load_threshold_config_from_env_vars(self):
        """Test loading config from explicitly set environment variables."""
        from app.config.threshold_config import (
            load_threshold_config,
            clear_threshold_config_cache,
        )

        # Clear cache first
        clear_threshold_config_cache()

        # Now set env vars and reload
        with patch.dict(os.environ, {
            "RISK_THRESHOLD_DEFAULT": "0.50",
            "LLM_FRAUD_THRESHOLD": "0.80",
        }):
            config = load_threshold_config()

            assert config is not None
            assert config.risk_threshold_default == 0.50
            assert config.llm_fraud_threshold == 0.80

    def test_load_threshold_config_from_env(self):
        """Test loading config from environment variables."""
        with patch.dict(os.environ, {
            "RISK_THRESHOLD_DEFAULT": "0.35",
            "LLM_FRAUD_THRESHOLD": "0.65",
        }):
            from app.config.threshold_config import (
                load_threshold_config,
                clear_threshold_config_cache,
            )

            clear_threshold_config_cache()
            config = load_threshold_config()

            assert config.risk_threshold_default == 0.35
            assert config.llm_fraud_threshold == 0.65

    def test_get_threshold_config_singleton(self):
        """Test get_threshold_config returns cached instance."""
        from app.config.threshold_config import (
            get_threshold_config,
            clear_threshold_config_cache,
        )

        clear_threshold_config_cache()
        config1 = get_threshold_config()
        config2 = get_threshold_config()
        assert config1 is config2

    def test_get_threshold_config_force_reload(self):
        """Test force_reload creates new instance."""
        from app.config.threshold_config import (
            get_threshold_config,
            clear_threshold_config_cache,
        )

        clear_threshold_config_cache()
        config1 = get_threshold_config()

        with patch.dict(os.environ, {"RISK_THRESHOLD_DEFAULT": "0.99"}):
            config2 = get_threshold_config(force_reload=True)
            assert config2.risk_threshold_default == 0.99


class TestGetRiskThreshold:
    """Tests for unified get_risk_threshold function."""

    def test_get_risk_threshold_returns_config_value(self):
        """Test get_risk_threshold returns configured value."""
        with patch.dict(os.environ, {"RISK_THRESHOLD_DEFAULT": "0.42"}):
            from app.config.threshold_config import (
                get_risk_threshold,
                clear_threshold_config_cache,
            )

            clear_threshold_config_cache()
            threshold = get_risk_threshold()
            assert threshold == 0.42

    def test_get_risk_threshold_default(self):
        """Test get_risk_threshold returns default when not set."""
        with patch.dict(os.environ, {}, clear=True):
            from app.config.threshold_config import (
                get_risk_threshold,
                clear_threshold_config_cache,
            )

            clear_threshold_config_cache()
            threshold = get_risk_threshold()
            assert threshold == 0.50


class TestGetLlmFraudThreshold:
    """Tests for get_llm_fraud_threshold function."""

    def test_get_llm_fraud_threshold_returns_config_value(self):
        """Test get_llm_fraud_threshold returns configured value."""
        with patch.dict(os.environ, {"LLM_FRAUD_THRESHOLD": "0.75"}):
            from app.config.threshold_config import (
                get_llm_fraud_threshold,
                clear_threshold_config_cache,
            )

            clear_threshold_config_cache()
            threshold = get_llm_fraud_threshold()
            assert threshold == 0.75

    def test_get_llm_fraud_threshold_default(self):
        """Test get_llm_fraud_threshold returns default when not set."""
        with patch.dict(os.environ, {}, clear=True):
            from app.config.threshold_config import (
                get_llm_fraud_threshold,
                clear_threshold_config_cache,
            )

            clear_threshold_config_cache()
            threshold = get_llm_fraud_threshold()
            assert threshold == 0.80


class TestThresholdConfigValidation:
    """Tests for threshold configuration validation."""

    def test_threshold_must_be_between_0_and_1(self):
        """Test threshold values must be in [0, 1] range."""
        from pydantic import ValidationError
        from app.config.threshold_config import ThresholdConfig

        with pytest.raises(ValidationError):
            ThresholdConfig(
                risk_threshold_default=1.5,  # Invalid: > 1.0
                llm_fraud_threshold=0.80,
            )

    def test_negative_threshold_fails(self):
        """Test negative threshold fails validation."""
        from pydantic import ValidationError
        from app.config.threshold_config import ThresholdConfig

        with pytest.raises(ValidationError):
            ThresholdConfig(
                risk_threshold_default=-0.1,  # Invalid: < 0
                llm_fraud_threshold=0.80,
            )

    def test_valid_threshold_passes(self):
        """Test valid thresholds pass validation."""
        from app.config.threshold_config import ThresholdConfig

        config = ThresholdConfig(
            risk_threshold_default=0.5,
            llm_fraud_threshold=0.8,
        )
        assert config.risk_threshold_default == 0.5
        assert config.llm_fraud_threshold == 0.8


class TestThresholdConfigCacheManagement:
    """Tests for cache management."""

    def test_clear_cache_allows_reload(self):
        """Test clearing cache allows config reload from env."""
        from app.config.threshold_config import (
            get_threshold_config,
            clear_threshold_config_cache,
        )

        with patch.dict(os.environ, {"RISK_THRESHOLD_DEFAULT": "0.30"}):
            clear_threshold_config_cache()
            config1 = get_threshold_config()
            assert config1.risk_threshold_default == 0.30

        with patch.dict(os.environ, {"RISK_THRESHOLD_DEFAULT": "0.70"}):
            clear_threshold_config_cache()
            config2 = get_threshold_config()
            assert config2.risk_threshold_default == 0.70
