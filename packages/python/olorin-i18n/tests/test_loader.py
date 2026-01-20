"""Tests for TranslationFileLoader."""

from pathlib import Path

import pytest

from olorin_i18n import I18nConfig, LanguageNotFoundError, TranslationFileLoader


@pytest.fixture
def valid_config() -> I18nConfig:
    """Create config with valid locales path."""
    # Use the actual shared/i18n/locales path
    project_root = Path(__file__).parent.parent.parent.parent.parent
    locales_path = project_root / "shared" / "i18n" / "locales"

    return I18nConfig(
        locales_path=locales_path,
        cache_enabled=True,
        cache_ttl_seconds=3600,
    )


class TestTranslationFileLoader:
    """Tests for translation file loader."""

    def test_load_supported_language(self, valid_config: I18nConfig) -> None:
        """Test loading a supported language."""
        if not valid_config.locales_path or not valid_config.locales_path.exists():
            pytest.skip("shared/i18n/locales not found")

        loader = TranslationFileLoader(valid_config)
        translations = loader.load_language("he")

        assert isinstance(translations, dict)
        assert len(translations) > 0

    def test_load_all_languages(self, valid_config: I18nConfig) -> None:
        """Test loading all supported languages."""
        if not valid_config.locales_path or not valid_config.locales_path.exists():
            pytest.skip("shared/i18n/locales not found")

        loader = TranslationFileLoader(valid_config)
        all_translations = loader.load_all_languages()

        assert isinstance(all_translations, dict)
        assert len(all_translations) > 0

    def test_unsupported_language(self, valid_config: I18nConfig) -> None:
        """Test loading unsupported language raises error."""
        loader = TranslationFileLoader(valid_config)

        with pytest.raises(LanguageNotFoundError):
            loader.load_language("xx")  # type: ignore

    def test_cache_functionality(self, valid_config: I18nConfig) -> None:
        """Test cache functionality."""
        if not valid_config.locales_path or not valid_config.locales_path.exists():
            pytest.skip("shared/i18n/locales not found")

        config = I18nConfig(
            locales_path=valid_config.locales_path,
            cache_enabled=True,
            cache_ttl_seconds=3600,
        )
        loader = TranslationFileLoader(config)

        # Load language twice
        first_load = loader.load_language("he")
        second_load = loader.load_language("he")

        # Should be the same object (cached)
        assert first_load is second_load

    def test_cache_disabled(self, valid_config: I18nConfig) -> None:
        """Test cache disabled."""
        if not valid_config.locales_path or not valid_config.locales_path.exists():
            pytest.skip("shared/i18n/locales not found")

        config = I18nConfig(
            locales_path=valid_config.locales_path,
            cache_enabled=False,
        )
        loader = TranslationFileLoader(config)

        # Load language twice
        first_load = loader.load_language("he")
        second_load = loader.load_language("he")

        # Should be different objects (not cached)
        assert first_load is not second_load
        # But same content
        assert first_load == second_load

    def test_clear_cache(self, valid_config: I18nConfig) -> None:
        """Test clearing cache."""
        if not valid_config.locales_path or not valid_config.locales_path.exists():
            pytest.skip("shared/i18n/locales not found")

        loader = TranslationFileLoader(valid_config)

        # Load language
        loader.load_language("he")
        assert len(loader._cache) > 0

        # Clear cache
        loader.clear_cache("he")
        assert "he" not in loader._cache

    def test_clear_all_cache(self, valid_config: I18nConfig) -> None:
        """Test clearing all cache."""
        if not valid_config.locales_path or not valid_config.locales_path.exists():
            pytest.skip("shared/i18n/locales not found")

        loader = TranslationFileLoader(valid_config)

        # Load multiple languages
        loader.load_language("he")
        loader.load_language("en")
        assert len(loader._cache) > 0

        # Clear all cache
        loader.clear_cache()
        assert len(loader._cache) == 0

    def test_cache_stats(self, valid_config: I18nConfig) -> None:
        """Test cache statistics."""
        if not valid_config.locales_path or not valid_config.locales_path.exists():
            pytest.skip("shared/i18n/locales not found")

        loader = TranslationFileLoader(valid_config)

        # Load language
        loader.load_language("he")
        stats = loader.cache_stats()

        assert stats["total_entries"] > 0
        assert stats["expired_entries"] == 0
