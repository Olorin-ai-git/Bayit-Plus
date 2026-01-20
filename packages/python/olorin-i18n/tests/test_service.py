"""Tests for I18nService."""

import pytest

from olorin_i18n import (
    ConfigurationError,
    I18nConfig,
    I18nService,
    LanguageNotFoundError,
    TranslationKeyError,
)


@pytest.fixture
def i18n_config() -> I18nConfig:
    """Create test I18nConfig."""
    return I18nConfig(
        default_language="he",
        fallback_language="he",
        cache_enabled=False,
        track_missing_keys=True,
    )


@pytest.fixture
def i18n_service(i18n_config: I18nConfig) -> I18nService:
    """Create test I18nService."""
    return I18nService(config=i18n_config)


class TestI18nServiceLanguageInfo:
    """Tests for language info methods."""

    def test_get_language_info_hebrew(self, i18n_service: I18nService) -> None:
        """Test getting Hebrew language info."""
        lang_info = i18n_service.get_language_info("he")
        assert lang_info["code"] == "he"
        assert lang_info["name"] == "עברית"
        assert lang_info["rtl"] is True
        assert lang_info["coverage"] == 100

    def test_get_language_info_english(self, i18n_service: I18nService) -> None:
        """Test getting English language info."""
        lang_info = i18n_service.get_language_info("en")
        assert lang_info["code"] == "en"
        assert lang_info["rtl"] is False
        assert lang_info["coverage"] == 100

    def test_get_language_info_unsupported(self, i18n_service: I18nService) -> None:
        """Test getting unsupported language raises error."""
        with pytest.raises(LanguageNotFoundError):
            i18n_service.get_language_info("xx")  # type: ignore

    def test_is_rtl_hebrew(self, i18n_service: I18nService) -> None:
        """Test RTL detection for Hebrew."""
        assert i18n_service.is_rtl("he") is True

    def test_is_rtl_english(self, i18n_service: I18nService) -> None:
        """Test RTL detection for English."""
        assert i18n_service.is_rtl("en") is False

    def test_get_all_languages(self, i18n_service: I18nService) -> None:
        """Test getting all languages."""
        languages = i18n_service.get_all_languages()
        assert len(languages) == 10
        assert any(lang["code"] == "he" for lang in languages)
        assert any(lang["code"] == "en" for lang in languages)

    def test_get_coverage(self, i18n_service: I18nService) -> None:
        """Test getting language coverage."""
        assert i18n_service.get_coverage("he") == 100
        assert i18n_service.get_coverage("en") == 100
        assert i18n_service.get_coverage("zh") == 55


class TestI18nServiceConfiguration:
    """Tests for configuration validation."""

    def test_default_language_validation(self) -> None:
        """Test validation of default language."""
        config = I18nConfig(default_language="xx")  # type: ignore
        with pytest.raises(ConfigurationError):
            I18nService(config=config)

    def test_fallback_language_validation(self) -> None:
        """Test validation of fallback language."""
        config = I18nConfig(fallback_language="xx")  # type: ignore
        with pytest.raises(ConfigurationError):
            I18nService(config=config)

    def test_cache_ttl_validation(self) -> None:
        """Test validation of cache TTL."""
        config = I18nConfig(cache_ttl_seconds=-1)
        with pytest.raises(ConfigurationError):
            I18nService(config=config)


class TestI18nServiceTypes:
    """Tests for type definitions."""

    def test_supported_languages_tuple(self) -> None:
        """Test that supported languages are properly defined."""
        from olorin_i18n import SUPPORTED_LANGUAGES

        assert len(SUPPORTED_LANGUAGES) == 10
        assert "he" in SUPPORTED_LANGUAGES
        assert "en" in SUPPORTED_LANGUAGES
        assert "es" in SUPPORTED_LANGUAGES
        assert "zh" in SUPPORTED_LANGUAGES
        assert "ja" in SUPPORTED_LANGUAGES


class TestI18nServiceMissingKeysTracking:
    """Tests for missing keys tracking."""

    def test_missing_keys_not_tracked_by_default(self) -> None:
        """Test that missing keys are not tracked by default."""
        config = I18nConfig(track_missing_keys=False)
        service = I18nService(config=config)

        # Try to get non-existent key with default
        result = service.get_translation("non.existent.key", "he", default="default")
        assert result == "default"
        assert service.get_missing_keys() == []

    def test_missing_keys_tracked_when_enabled(self) -> None:
        """Test that missing keys are tracked when enabled."""
        config = I18nConfig(track_missing_keys=True, cache_enabled=False)
        service = I18nService(config=config)

        # Try to get non-existent key with default
        service.get_translation("non.existent.key", "he", default="default")
        missing_keys = service.get_missing_keys()

        assert len(missing_keys) == 1
        assert missing_keys[0] == ("non.existent.key", "he")

    def test_clear_missing_keys_log(self) -> None:
        """Test clearing missing keys log."""
        config = I18nConfig(track_missing_keys=True, cache_enabled=False)
        service = I18nService(config=config)

        service.get_translation("non.existent.key", "he", default="default")
        assert len(service.get_missing_keys()) > 0

        service.clear_missing_keys_log()
        assert service.get_missing_keys() == []
