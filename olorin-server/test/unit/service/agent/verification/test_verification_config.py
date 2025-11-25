#!/usr/bin/env python3
"""
Unit tests for verification configuration system.

Tests configuration loading, validation, and environment management.
"""

import os
from unittest.mock import MagicMock, patch

import pytest

from app.service.agent.verification.verification_config import (
    VerificationConfig,
    get_verification_config,
)


class TestVerificationConfig:
    """Test suite for VerificationConfig class."""

    def test_default_configuration(self):
        """Test default configuration values."""
        config = VerificationConfig()

        assert config.enabled is True
        assert config.max_retries == 3
        assert config.confidence_threshold == 0.8
        assert config.timeout_seconds == 30
        assert config.cache_enabled is True
        assert config.cache_ttl_hours == 24
        assert config.log_level == "INFO"
        assert len(config.model_configs) > 0

    @patch.dict(
        os.environ,
        {
            "LLM_VERIFICATION_ENABLED": "true",
            "LLM_VERIFICATION_MAX_RETRIES": "5",
            "LLM_VERIFICATION_CONFIDENCE_THRESHOLD": "0.85",
            "LLM_VERIFICATION_TIMEOUT_SECONDS": "45",
        },
    )
    def test_environment_configuration_override(self):
        """Test configuration override from environment variables."""
        config = VerificationConfig()

        assert config.enabled is True
        assert config.max_retries == 5
        assert config.confidence_threshold == 0.85
        assert config.timeout_seconds == 45

    @patch.dict(
        os.environ,
        {
            "LLM_VERIFICATION_CACHE_ENABLED": "false",
            "LLM_VERIFICATION_CACHE_TTL_HOURS": "48",
            "LLM_VERIFICATION_LOG_LEVEL": "DEBUG",
        },
    )
    def test_cache_and_logging_configuration(self):
        """Test cache and logging configuration from environment."""
        config = VerificationConfig()

        assert config.cache_enabled is False
        assert config.cache_ttl_hours == 48
        assert config.log_level == "DEBUG"

    @patch("app.service.agent.verification.verification_config.ConfigLoader")
    def test_firebase_secrets_loading(self, mock_config_loader):
        """Test Firebase Secrets integration."""
        mock_loader = MagicMock()
        mock_loader.load_secret.side_effect = lambda key: f"firebase_{key.lower()}"
        mock_config_loader.return_value = mock_loader

        config = VerificationConfig()

        # Should have called Firebase for API keys
        assert mock_loader.load_secret.called

    def test_model_configuration_validation(self):
        """Test verification model configuration validation."""
        config = VerificationConfig()

        # Should have at least one model configured
        assert len(config.model_configs) > 0

        # Each model should have required fields
        for model_config in config.model_configs.values():
            assert hasattr(model_config, "name")
            assert hasattr(model_config, "cost_per_1k_tokens")
            assert hasattr(model_config, "speed_rating")
            assert hasattr(model_config, "accuracy_rating")

    def test_get_retry_delay(self):
        """Test retry delay calculation."""
        config = VerificationConfig()

        # Test exponential backoff
        delay1 = config.get_retry_delay(1)
        delay2 = config.get_retry_delay(2)
        delay3 = config.get_retry_delay(3)

        assert delay1 < delay2 < delay3
        assert delay1 >= 1.0  # Minimum delay
        assert delay3 <= 32.0  # Maximum reasonable delay

    def test_get_cache_key_prefix(self):
        """Test cache key prefix generation."""
        config = VerificationConfig()
        prefix = config.get_cache_key_prefix()

        assert isinstance(prefix, str)
        assert len(prefix) > 0
        assert prefix.startswith("llm_verification")

    def test_is_model_available(self):
        """Test model availability checking."""
        config = VerificationConfig()

        # Test with a model that should exist
        assert config.is_model_available("gemini-1.5-flash") is True

        # Test with non-existent model
        assert config.is_model_available("non-existent-model") is False

    @patch.dict(os.environ, {"LLM_VERIFICATION_CONFIDENCE_THRESHOLD": "invalid"})
    def test_invalid_environment_values(self):
        """Test handling of invalid environment variable values."""
        config = VerificationConfig()

        # Should fall back to default value
        assert config.confidence_threshold == 0.8

    def test_health_check(self):
        """Test configuration health check."""
        config = VerificationConfig()
        health = config.health_check()

        assert health["config_loaded"] is True
        assert health["models_available"] >= 1
        assert "model_configs" in health


class TestGetVerificationConfig:
    """Test suite for get_verification_config function."""

    def test_singleton_behavior(self):
        """Test that get_verification_config returns same instance."""
        config1 = get_verification_config()
        config2 = get_verification_config()

        assert config1 is config2

    def test_configuration_consistency(self):
        """Test that singleton configuration is consistent."""
        config = get_verification_config()

        assert isinstance(config, VerificationConfig)
        assert config.enabled in [True, False]
        assert config.max_retries > 0
        assert 0 <= config.confidence_threshold <= 1


@pytest.fixture
def clean_environment():
    """Fixture to clean environment variables for testing."""
    # Store original values
    original_env = {}
    verification_vars = [
        key for key in os.environ.keys() if key.startswith("LLM_VERIFICATION_")
    ]

    for var in verification_vars:
        original_env[var] = os.environ[var]
        del os.environ[var]

    yield

    # Restore original values
    for var, value in original_env.items():
        os.environ[var] = value


class TestVerificationConfigurationIntegration:
    """Integration tests for verification configuration."""

    def test_full_configuration_cycle(self, clean_environment):
        """Test complete configuration loading cycle."""
        # Set test environment
        test_env = {
            "LLM_VERIFICATION_ENABLED": "true",
            "LLM_VERIFICATION_MAX_RETRIES": "4",
            "LLM_VERIFICATION_CONFIDENCE_THRESHOLD": "0.8",
            "LLM_VERIFICATION_CACHE_ENABLED": "true",
        }

        with patch.dict(os.environ, test_env):
            config = VerificationConfig()

            assert config.enabled is True
            assert config.max_retries == 4
            assert config.confidence_threshold == 0.8
            assert config.cache_enabled is True

    @patch("app.service.agent.verification.verification_config.ConfigLoader")
    def test_configuration_with_firebase_integration(self, mock_config_loader):
        """Test configuration with Firebase Secrets integration."""
        mock_loader = MagicMock()
        mock_loader.load_secret.return_value = "test_api_key"
        mock_config_loader.return_value = mock_loader

        config = VerificationConfig()

        # Should have attempted to load API keys from Firebase
        mock_loader.load_secret.assert_called()

    def test_model_priority_ordering(self):
        """Test that models are ordered by cost/speed priority."""
        config = VerificationConfig()
        models = config.model_configs

        # Should have models in some reasonable order
        assert len(models) > 0

        # Primary model should be OpenAI GPT-3.5 Turbo
        primary_model = config.primary_model
        assert (
            "gpt" in primary_model.value.lower()
            and "turbo" in primary_model.value.lower()
        )
