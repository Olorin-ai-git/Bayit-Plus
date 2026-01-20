"""
Comprehensive Tests for Olorin Configuration

Tests cover:
- Nested Pydantic configuration models
- Configuration defaults and validation
- Backward compatibility with deprecated properties
- Feature dependency validation
- Environment variable loading
"""

import os
import warnings

import pytest
from app.core.config_validation import ConfigValidationError, validate_olorin_config
from app.core.olorin_config import (
    CulturalContextConfig,
    DubbingConfig,
    EmbeddingConfig,
    OlorinSettings,
    PartnerAPIConfig,
    PineconeConfig,
    RecapConfig,
)
from pydantic import ValidationError

# ============================================
# PartnerAPIConfig Tests
# ============================================


def test_partner_api_config_defaults():
    """Test PartnerAPIConfig default values."""
    config = PartnerAPIConfig()
    assert config.api_key_salt == ""
    assert config.default_rate_limit_rpm == 60
    assert config.webhook_timeout_seconds == 10.0


def test_partner_api_config_from_env(monkeypatch):
    """Test PartnerAPIConfig loading from environment variables."""
    monkeypatch.setenv(
        "PARTNER_API_KEY_SALT", "test_salt_32_characters_minimum_length_required"
    )
    monkeypatch.setenv("PARTNER_DEFAULT_RATE_LIMIT_RPM", "120")
    monkeypatch.setenv("PARTNER_WEBHOOK_TIMEOUT_SECONDS", "15.0")

    config = PartnerAPIConfig()
    assert config.api_key_salt == "test_salt_32_characters_minimum_length_required"
    assert config.default_rate_limit_rpm == 120
    assert config.webhook_timeout_seconds == 15.0


def test_partner_api_config_salt_validation_too_short():
    """Test PartnerAPIConfig rejects API key salt that's too short."""
    with pytest.raises(ValidationError) as exc_info:
        PartnerAPIConfig(api_key_salt="too_short")

    assert "at least 32 characters" in str(exc_info.value)


def test_partner_api_config_rate_limit_bounds():
    """Test PartnerAPIConfig rate limit validation."""
    # Valid values
    config = PartnerAPIConfig(default_rate_limit_rpm=1)
    assert config.default_rate_limit_rpm == 1

    config = PartnerAPIConfig(default_rate_limit_rpm=10000)
    assert config.default_rate_limit_rpm == 10000

    # Invalid values
    with pytest.raises(ValidationError):
        PartnerAPIConfig(default_rate_limit_rpm=0)

    with pytest.raises(ValidationError):
        PartnerAPIConfig(default_rate_limit_rpm=10001)


# ============================================
# PineconeConfig Tests
# ============================================


def test_pinecone_config_defaults():
    """Test PineconeConfig default values."""
    config = PineconeConfig()
    assert config.api_key == ""
    assert config.environment == "us-east-1-aws"
    assert config.index_name == "olorin-content"


def test_pinecone_config_from_env(monkeypatch):
    """Test PineconeConfig loading from environment variables."""
    monkeypatch.setenv("PINECONE_API_KEY", "test-api-key")
    monkeypatch.setenv("PINECONE_ENVIRONMENT", "eu-west1-gcp")
    monkeypatch.setenv("PINECONE_INDEX_NAME", "custom-index")

    config = PineconeConfig()
    assert config.api_key == "test-api-key"
    assert config.environment == "eu-west1-gcp"
    assert config.index_name == "custom-index"


# ============================================
# EmbeddingConfig Tests
# ============================================


def test_embedding_config_defaults():
    """Test EmbeddingConfig default values."""
    config = EmbeddingConfig()
    assert config.model == "text-embedding-3-small"
    assert config.dimensions == 1536


def test_embedding_config_from_env(monkeypatch):
    """Test EmbeddingConfig loading from environment variables."""
    monkeypatch.setenv("EMBEDDING_MODEL", "text-embedding-3-large")
    monkeypatch.setenv("EMBEDDING_DIMENSIONS", "3072")

    config = EmbeddingConfig()
    assert config.model == "text-embedding-3-large"
    assert config.dimensions == 3072


def test_embedding_config_dimensions_bounds():
    """Test EmbeddingConfig dimensions validation."""
    # Valid values
    config = EmbeddingConfig(dimensions=256)
    assert config.dimensions == 256

    config = EmbeddingConfig(dimensions=3072)
    assert config.dimensions == 3072

    # Invalid values
    with pytest.raises(ValidationError):
        EmbeddingConfig(dimensions=100)

    with pytest.raises(ValidationError):
        EmbeddingConfig(dimensions=5000)


# ============================================
# DubbingConfig Tests
# ============================================


def test_dubbing_config_defaults():
    """Test DubbingConfig default values."""
    config = DubbingConfig()
    assert config.max_concurrent_sessions == 100
    assert config.session_timeout_minutes == 120
    assert config.target_latency_ms == 2000


def test_dubbing_config_from_env(monkeypatch):
    """Test DubbingConfig loading from environment variables."""
    monkeypatch.setenv("DUBBING_MAX_CONCURRENT_SESSIONS", "200")
    monkeypatch.setenv("DUBBING_SESSION_TIMEOUT_MINUTES", "180")
    monkeypatch.setenv("DUBBING_TARGET_LATENCY_MS", "1500")

    config = DubbingConfig()
    assert config.max_concurrent_sessions == 200
    assert config.session_timeout_minutes == 180
    assert config.target_latency_ms == 1500


def test_dubbing_config_validation():
    """Test DubbingConfig field validation."""
    # Valid values
    config = DubbingConfig(max_concurrent_sessions=1)
    assert config.max_concurrent_sessions == 1

    # Invalid values
    with pytest.raises(ValidationError):
        DubbingConfig(max_concurrent_sessions=0)

    with pytest.raises(ValidationError):
        DubbingConfig(max_concurrent_sessions=1001)

    with pytest.raises(ValidationError):
        DubbingConfig(session_timeout_minutes=0)

    with pytest.raises(ValidationError):
        DubbingConfig(target_latency_ms=100)


# ============================================
# RecapConfig Tests
# ============================================


def test_recap_config_defaults():
    """Test RecapConfig default values."""
    config = RecapConfig()
    assert config.max_context_tokens == 8000
    assert config.window_default_minutes == 15
    assert config.summary_max_tokens == 300


def test_recap_config_from_env(monkeypatch):
    """Test RecapConfig loading from environment variables."""
    monkeypatch.setenv("RECAP_MAX_CONTEXT_TOKENS", "16000")
    monkeypatch.setenv("RECAP_WINDOW_DEFAULT_MINUTES", "30")
    monkeypatch.setenv("RECAP_SUMMARY_MAX_TOKENS", "500")

    config = RecapConfig()
    assert config.max_context_tokens == 16000
    assert config.window_default_minutes == 30
    assert config.summary_max_tokens == 500


def test_recap_config_validation():
    """Test RecapConfig field validation."""
    # Valid values
    config = RecapConfig(max_context_tokens=1000)
    assert config.max_context_tokens == 1000

    # Invalid values
    with pytest.raises(ValidationError):
        RecapConfig(max_context_tokens=500)

    with pytest.raises(ValidationError):
        RecapConfig(window_default_minutes=0)

    with pytest.raises(ValidationError):
        RecapConfig(summary_max_tokens=10)


# ============================================
# CulturalContextConfig Tests
# ============================================


def test_cultural_context_config_defaults():
    """Test CulturalContextConfig default values."""
    config = CulturalContextConfig()
    assert config.reference_cache_ttl_hours == 24
    assert config.detection_min_confidence == 0.7


def test_cultural_context_config_from_env(monkeypatch):
    """Test CulturalContextConfig loading from environment variables."""
    monkeypatch.setenv("CULTURAL_REFERENCE_CACHE_TTL_HOURS", "48")
    monkeypatch.setenv("CULTURAL_DETECTION_MIN_CONFIDENCE", "0.8")

    config = CulturalContextConfig()
    assert config.reference_cache_ttl_hours == 48
    assert config.detection_min_confidence == 0.8


def test_cultural_context_config_validation():
    """Test CulturalContextConfig field validation."""
    # Valid values
    config = CulturalContextConfig(detection_min_confidence=0.5)
    assert config.detection_min_confidence == 0.5

    config = CulturalContextConfig(detection_min_confidence=1.0)
    assert config.detection_min_confidence == 1.0

    # Invalid values
    with pytest.raises(ValidationError):
        CulturalContextConfig(detection_min_confidence=-0.1)

    with pytest.raises(ValidationError):
        CulturalContextConfig(detection_min_confidence=1.5)

    with pytest.raises(ValidationError):
        CulturalContextConfig(reference_cache_ttl_hours=0)


# ============================================
# OlorinSettings Tests
# ============================================


def test_olorin_settings_defaults():
    """Test OlorinSettings default values and nested configs."""
    settings = OlorinSettings()

    # Feature flags
    assert settings.dubbing_enabled is False
    assert settings.semantic_search_enabled is False
    assert settings.cultural_context_enabled is False
    assert settings.recap_enabled is False

    # Nested configs exist
    assert isinstance(settings.partner, PartnerAPIConfig)
    assert isinstance(settings.pinecone, PineconeConfig)
    assert isinstance(settings.embedding, EmbeddingConfig)
    assert isinstance(settings.dubbing, DubbingConfig)
    assert isinstance(settings.recap, RecapConfig)
    assert isinstance(settings.cultural, CulturalContextConfig)


def test_olorin_settings_from_env(monkeypatch):
    """Test OlorinSettings loading from environment variables."""
    # Feature flags
    monkeypatch.setenv("OLORIN_DUBBING_ENABLED", "true")
    monkeypatch.setenv("OLORIN_SEMANTIC_SEARCH_ENABLED", "true")

    # Partner config
    monkeypatch.setenv(
        "PARTNER_API_KEY_SALT", "test_salt_32_characters_minimum_length_required"
    )
    monkeypatch.setenv("PARTNER_DEFAULT_RATE_LIMIT_RPM", "120")

    # Pinecone config
    monkeypatch.setenv("PINECONE_API_KEY", "test-pinecone-key")
    monkeypatch.setenv("PINECONE_INDEX_NAME", "custom-index")

    settings = OlorinSettings()

    # Check feature flags
    assert settings.dubbing_enabled is True
    assert settings.semantic_search_enabled is True

    # Check nested configs
    assert (
        settings.partner.api_key_salt
        == "test_salt_32_characters_minimum_length_required"
    )
    assert settings.partner.default_rate_limit_rpm == 120
    assert settings.pinecone.api_key == "test-pinecone-key"
    assert settings.pinecone.index_name == "custom-index"


def test_olorin_settings_validate_enabled_features_no_errors():
    """Test validate_enabled_features returns no errors when properly configured."""
    settings = OlorinSettings(
        semantic_search_enabled=True,
        partner=PartnerAPIConfig(
            api_key_salt="test_salt_32_characters_minimum_length_required"
        ),
        pinecone=PineconeConfig(api_key="test-api-key"),
        embedding=EmbeddingConfig(model="text-embedding-3-small"),
    )

    errors = settings.validate_enabled_features()
    assert len(errors) == 0


def test_olorin_settings_validate_semantic_search_missing_pinecone():
    """Test validate_enabled_features detects missing Pinecone configuration."""
    settings = OlorinSettings(
        semantic_search_enabled=True,
        partner=PartnerAPIConfig(
            api_key_salt="test_salt_32_characters_minimum_length_required"
        ),
        pinecone=PineconeConfig(api_key=""),  # Missing API key
    )

    errors = settings.validate_enabled_features()
    assert len(errors) > 0
    assert any("PINECONE_API_KEY" in error for error in errors)


def test_olorin_settings_validate_missing_partner_salt():
    """Test validate_enabled_features detects missing partner API key salt."""
    settings = OlorinSettings(
        dubbing_enabled=True,
        partner=PartnerAPIConfig(api_key_salt=""),  # Missing salt
    )

    errors = settings.validate_enabled_features()
    assert len(errors) > 0
    assert any("PARTNER_API_KEY_SALT" in error for error in errors)


# ============================================
# Backward Compatibility Tests
# ============================================


def test_backward_compatible_properties(monkeypatch):
    """Test that backward-compatible properties work with deprecation warnings."""
    from app.core.config import settings

    # Test accessing old property names triggers deprecation warnings
    with warnings.catch_warnings(record=True) as w:
        warnings.simplefilter("always")

        # Access deprecated property
        _ = settings.PINECONE_API_KEY

        # Check deprecation warning was issued
        assert len(w) >= 1
        assert issubclass(w[0].category, DeprecationWarning)
        assert "Use settings.olorin.pinecone.api_key" in str(w[0].message)


def test_backward_compatible_properties_values():
    """Test that backward-compatible properties return correct values."""
    from app.core.config import settings

    # Suppress deprecation warnings for this test
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")

        # Test property delegation
        assert settings.PINECONE_ENVIRONMENT == settings.olorin.pinecone.environment
        assert settings.EMBEDDING_MODEL == settings.olorin.embedding.model
        assert (
            settings.DUBBING_MAX_CONCURRENT_SESSIONS
            == settings.olorin.dubbing.max_concurrent_sessions
        )
        assert (
            settings.RECAP_MAX_CONTEXT_TOKENS
            == settings.olorin.recap.max_context_tokens
        )
        assert (
            settings.CULTURAL_DETECTION_MIN_CONFIDENCE
            == settings.olorin.cultural.detection_min_confidence
        )
        assert settings.OLORIN_DUBBING_ENABLED == settings.olorin.dubbing_enabled


# ============================================
# Integration Tests
# ============================================


def test_full_config_integration(monkeypatch):
    """Test full Olorin configuration integration."""
    # Set all environment variables
    monkeypatch.setenv("OLORIN_DUBBING_ENABLED", "true")
    monkeypatch.setenv("OLORIN_SEMANTIC_SEARCH_ENABLED", "true")
    monkeypatch.setenv(
        "PARTNER_API_KEY_SALT", "integration_test_salt_32_characters_minimum"
    )
    monkeypatch.setenv("PINECONE_API_KEY", "integration-test-key")
    monkeypatch.setenv("EMBEDDING_MODEL", "text-embedding-3-large")
    monkeypatch.setenv("EMBEDDING_DIMENSIONS", "3072")

    settings = OlorinSettings()

    # Verify all settings loaded correctly
    assert settings.dubbing_enabled is True
    assert settings.semantic_search_enabled is True
    assert (
        settings.partner.api_key_salt == "integration_test_salt_32_characters_minimum"
    )
    assert settings.pinecone.api_key == "integration-test-key"
    assert settings.embedding.model == "text-embedding-3-large"
    assert settings.embedding.dimensions == 3072

    # Validate configuration
    errors = settings.validate_enabled_features()
    assert len(errors) == 0


def test_config_validation_with_missing_dependencies(monkeypatch):
    """Test configuration validation fails when dependencies are missing."""
    # Enable semantic search without Pinecone configuration
    monkeypatch.setenv("OLORIN_SEMANTIC_SEARCH_ENABLED", "true")
    monkeypatch.setenv(
        "PARTNER_API_KEY_SALT", "test_salt_32_characters_minimum_length_required"
    )
    monkeypatch.setenv("PINECONE_API_KEY", "")  # Missing

    settings = OlorinSettings()
    errors = settings.validate_enabled_features()

    assert len(errors) > 0
    assert any("PINECONE_API_KEY" in error for error in errors)
