"""Tests for OlorinSettings configuration."""

import os
from unittest.mock import patch

import pytest

from olorin_config import (
    CulturalContextConfig,
    DatabaseConfig,
    DubbingConfig,
    EmbeddingConfig,
    MeteringConfig,
    OlorinSettings,
    PartnerAPIConfig,
    PineconeConfig,
    RecapConfig,
    ResilienceConfig,
)


class TestOlorinSettings:
    """Test OlorinSettings main class."""

    def test_default_settings(self) -> None:
        """Test that default settings load without errors."""
        settings = OlorinSettings()
        assert settings.dubbing_enabled is False
        assert settings.semantic_search_enabled is False
        assert settings.cultural_context_enabled is False
        assert settings.recap_enabled is False

    def test_feature_flags_from_env(self) -> None:
        """Test that feature flags are loaded from environment."""
        with patch.dict(
            os.environ,
            {
                "OLORIN_DUBBING_ENABLED": "true",
                "OLORIN_SEMANTIC_SEARCH_ENABLED": "true",
            },
        ):
            settings = OlorinSettings()
            assert settings.dubbing_enabled is True
            assert settings.semantic_search_enabled is True

    def test_nested_config_loading(self) -> None:
        """Test that nested configurations load correctly."""
        with patch.dict(
            os.environ,
            {
                "PINECONE_API_KEY": "test-key",
                "PINECONE_INDEX_NAME": "test-index",
            },
        ):
            settings = OlorinSettings()
            assert settings.pinecone.api_key == "test-key"
            assert settings.pinecone.index_name == "test-index"

    def test_validate_enabled_features_semantic_search(self) -> None:
        """Test validation for semantic search configuration."""
        with patch.dict(
            os.environ,
            {
                "OLORIN_SEMANTIC_SEARCH_ENABLED": "true",
                "PINECONE_API_KEY": "",
            },
        ):
            settings = OlorinSettings()
            errors = settings.validate_enabled_features()
            assert len(errors) > 0
            assert any("PINECONE_API_KEY" in e for e in errors)

    def test_validate_enabled_features_valid(self) -> None:
        """Test validation passes with valid configuration."""
        with patch.dict(
            os.environ,
            {
                "OLORIN_SEMANTIC_SEARCH_ENABLED": "true",
                "PINECONE_API_KEY": "test-key",
                "PARTNER_API_KEY_SALT": "a" * 32,
            },
        ):
            settings = OlorinSettings()
            errors = settings.validate_enabled_features()
            assert len(errors) == 0

    def test_is_any_feature_enabled(self) -> None:
        """Test is_any_feature_enabled method."""
        settings = OlorinSettings()
        assert settings.is_any_feature_enabled() is False

        with patch.dict(os.environ, {"OLORIN_DUBBING_ENABLED": "true"}):
            settings = OlorinSettings()
            assert settings.is_any_feature_enabled() is True

    def test_get_enabled_features(self) -> None:
        """Test get_enabled_features method."""
        settings = OlorinSettings()
        assert settings.get_enabled_features() == []

        with patch.dict(
            os.environ,
            {
                "OLORIN_DUBBING_ENABLED": "true",
                "OLORIN_RECAP_ENABLED": "true",
            },
        ):
            settings = OlorinSettings()
            features = settings.get_enabled_features()
            assert "dubbing" in features
            assert "recap" in features


class TestPartnerAPIConfig:
    """Test PartnerAPIConfig."""

    def test_default_values(self) -> None:
        """Test default partner API configuration."""
        config = PartnerAPIConfig()
        assert config.default_rate_limit_rpm == 60
        assert config.webhook_timeout_seconds == 10.0

    def test_api_key_salt_validation_short(self) -> None:
        """Test that short API key salt is rejected."""
        with pytest.raises(ValueError):
            PartnerAPIConfig(api_key_salt="short")

    def test_api_key_salt_validation_valid(self) -> None:
        """Test that valid API key salt is accepted."""
        config = PartnerAPIConfig(api_key_salt="a" * 32)
        assert len(config.api_key_salt) == 32


class TestPineconeConfig:
    """Test PineconeConfig."""

    def test_default_values(self) -> None:
        """Test default Pinecone configuration."""
        config = PineconeConfig()
        assert config.environment == "us-east-1-aws"
        assert config.index_name == "olorin-content"

    def test_env_override(self) -> None:
        """Test environment variable override."""
        with patch.dict(os.environ, {"PINECONE_INDEX_NAME": "custom-index"}):
            config = PineconeConfig()
            assert config.index_name == "custom-index"


class TestDubbingConfig:
    """Test DubbingConfig."""

    def test_default_values(self) -> None:
        """Test default dubbing configuration."""
        config = DubbingConfig()
        assert config.max_concurrent_sessions == 100
        assert config.session_timeout_minutes == 120
        assert config.target_latency_ms == 2000
        assert config.stt_provider == "elevenlabs"


class TestRecapConfig:
    """Test RecapConfig."""

    def test_default_values(self) -> None:
        """Test default recap configuration."""
        config = RecapConfig()
        assert config.max_context_tokens == 8000
        assert config.window_default_minutes == 15
        assert config.summary_max_tokens == 300


class TestMeteringConfig:
    """Test MeteringConfig."""

    def test_default_costs(self) -> None:
        """Test default metering costs."""
        config = MeteringConfig()
        assert config.cost_per_audio_second_stt == 0.00004
        assert config.cost_per_audio_second_tts == 0.00024
        assert config.cost_per_1k_tokens_llm == 0.003


class TestResilienceConfig:
    """Test ResilienceConfig."""

    def test_default_values(self) -> None:
        """Test default resilience configuration."""
        config = ResilienceConfig()
        assert config.circuit_breaker_failure_threshold == 5
        assert config.retry_max_attempts == 3
        assert config.retry_exponential_base == 2.0


class TestDatabaseConfig:
    """Test DatabaseConfig."""

    def test_default_values(self) -> None:
        """Test default database configuration."""
        config = DatabaseConfig()
        assert config.mongodb_db_name == "olorin_platform"
        assert config.use_separate_database is False

    def test_localhost_validation_dev(self) -> None:
        """Test localhost URL is allowed in development."""
        with patch.dict(os.environ, {"ENVIRONMENT": "development"}):
            config = DatabaseConfig(mongodb_url="mongodb://localhost:27017")
            assert config.mongodb_url == "mongodb://localhost:27017"

    def test_localhost_validation_prod(self) -> None:
        """Test localhost URL is rejected in production."""
        with patch.dict(os.environ, {"ENVIRONMENT": "production"}):
            with pytest.raises(ValueError):
                DatabaseConfig(mongodb_url="mongodb://localhost:27017")
