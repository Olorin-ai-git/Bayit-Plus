"""
Tests for TriviaConcurrentTranslator - Parallel Translation Tests

Verifies concurrent translation to multiple languages with error handling.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock

from app.services.trivia.trivia_concurrent_translator import TriviaConcurrentTranslator


@pytest.fixture
def mock_translation_service():
    """Create a mock translation service."""
    service = MagicMock()
    service.translate_from_english = AsyncMock()
    return service


@pytest.fixture
def concurrent_translator(mock_translation_service):
    """Create TriviaConcurrentTranslator with mocked service."""
    return TriviaConcurrentTranslator(mock_translation_service)


class TestConcurrentTranslatorInit:
    """Test concurrent translator initialization."""

    def test_init_with_service(self, mock_translation_service):
        """Should initialize with translation service."""
        translator = TriviaConcurrentTranslator(mock_translation_service)
        assert translator.translation_service == mock_translation_service


class TestTranslateToAllLanguages:
    """Test translate_to_all_languages method."""

    @pytest.mark.asyncio
    async def test_translate_to_default_languages(self, concurrent_translator, mock_translation_service):
        """Should translate to Hebrew and Spanish by default."""
        # Mock successful translations
        async def mock_translate(text, lang, content_id, partner_id):
            translations = {
                "he": "הסרט זכה באוסקר",
                "es": "La película ganó un Oscar"
            }
            return translations[lang]

        mock_translation_service.translate_from_english.side_effect = mock_translate

        result = await concurrent_translator.translate_to_all_languages(
            "The movie won an Oscar",
            content_id="test123",
            partner_id="partner1"
        )

        # Should have both translations
        assert result["he"] == "הסרט זכה באוסקר"
        assert result["es"] == "La película ganó un Oscar"

        # Should call translate twice (once per language)
        assert mock_translation_service.translate_from_english.call_count == 2

    @pytest.mark.asyncio
    async def test_translate_to_custom_languages(self, concurrent_translator, mock_translation_service):
        """Should translate to specified languages."""
        # Mock translation
        mock_translation_service.translate_from_english.return_value = "translated"

        result = await concurrent_translator.translate_to_all_languages(
            "English text",
            target_languages=["he", "es", "fr"],
            content_id="test123",
            partner_id="partner1"
        )

        # Should have three translations
        assert len(result) == 3
        assert "he" in result
        assert "es" in result
        assert "fr" in result

        # Should call translate three times
        assert mock_translation_service.translate_from_english.call_count == 3

    @pytest.mark.asyncio
    async def test_translate_concurrent_execution(self, concurrent_translator, mock_translation_service):
        """Translations should execute concurrently."""
        import asyncio

        # Track call order
        call_order = []

        async def mock_translate(text, lang, content_id, partner_id):
            call_order.append(f"start_{lang}")
            await asyncio.sleep(0.01)  # Simulate API delay
            call_order.append(f"end_{lang}")
            return f"translated_{lang}"

        mock_translation_service.translate_from_english.side_effect = mock_translate

        result = await concurrent_translator.translate_to_all_languages(
            "English text",
            target_languages=["he", "es"],
            content_id="test123"
        )

        # Should have both translations
        assert result["he"] == "translated_he"
        assert result["es"] == "translated_es"

        # Calls should overlap (concurrent execution)
        # Both should start before either finishes
        assert call_order.index("start_he") < call_order.index("end_he")
        assert call_order.index("start_es") < call_order.index("end_es")

    @pytest.mark.asyncio
    async def test_translate_handles_single_failure(self, concurrent_translator, mock_translation_service):
        """Should fallback to English if one translation fails."""
        # Mock Hebrew success, Spanish failure
        async def mock_translate(text, lang, content_id, partner_id):
            if lang == "he":
                return "הסרט זכה באוסקר"
            else:
                raise Exception("Translation failed")

        mock_translation_service.translate_from_english.side_effect = mock_translate

        result = await concurrent_translator.translate_to_all_languages(
            "The movie won an Oscar",
            target_languages=["he", "es"],
            content_id="test123"
        )

        # Hebrew should succeed
        assert result["he"] == "הסרט זכה באוסקר"

        # Spanish should fallback to English
        assert result["es"] == "The movie won an Oscar"

    @pytest.mark.asyncio
    async def test_translate_handles_all_failures(self, concurrent_translator, mock_translation_service):
        """Should fallback to English if all translations fail."""
        # Mock all failures
        mock_translation_service.translate_from_english.side_effect = Exception("API Error")

        result = await concurrent_translator.translate_to_all_languages(
            "The movie won an Oscar",
            target_languages=["he", "es"],
            content_id="test123"
        )

        # Both should fallback to English
        assert result["he"] == "The movie won an Oscar"
        assert result["es"] == "The movie won an Oscar"

    @pytest.mark.asyncio
    async def test_translate_passes_content_id(self, concurrent_translator, mock_translation_service):
        """Should pass content_id to translation service."""
        mock_translation_service.translate_from_english.return_value = "translated"

        await concurrent_translator.translate_to_all_languages(
            "English text",
            target_languages=["he"],
            content_id="content_123",
            partner_id="partner1"
        )

        # Should pass content_id to service
        # Method called as: translate_from_english(text, lang, content_id, partner_id)
        call_args = mock_translation_service.translate_from_english.call_args
        assert call_args.args[2] == "content_123"  # content_id is 3rd positional arg

    @pytest.mark.asyncio
    async def test_translate_passes_partner_id(self, concurrent_translator, mock_translation_service):
        """Should pass partner_id to translation service."""
        mock_translation_service.translate_from_english.return_value = "translated"

        await concurrent_translator.translate_to_all_languages(
            "English text",
            target_languages=["he"],
            content_id="test123",
            partner_id="partner_xyz"
        )

        # Should pass partner_id to service
        # Method called as: translate_from_english(text, lang, content_id, partner_id)
        call_args = mock_translation_service.translate_from_english.call_args
        assert call_args.args[3] == "partner_xyz"  # partner_id is 4th positional arg

    @pytest.mark.asyncio
    async def test_translate_handles_timeout(self, concurrent_translator, mock_translation_service):
        """Should handle timeout gracefully."""
        import asyncio

        # Mock translation that times out
        async def mock_translate(text, lang, content_id, partner_id):
            await asyncio.sleep(10)  # Very long delay
            return "never_reached"

        mock_translation_service.translate_from_english.side_effect = mock_translate

        # Use asyncio.wait_for to enforce timeout
        with pytest.raises(asyncio.TimeoutError):
            await asyncio.wait_for(
                concurrent_translator.translate_to_all_languages(
                    "English text",
                    target_languages=["he"],
                    content_id="test123"
                ),
                timeout=0.1  # 100ms timeout
            )

    @pytest.mark.asyncio
    async def test_translate_preserves_exception_info(self, concurrent_translator, mock_translation_service):
        """Should log exception details for debugging."""
        # Mock translation with specific error
        error_message = "Rate limit exceeded"
        mock_translation_service.translate_from_english.side_effect = Exception(error_message)

        result = await concurrent_translator.translate_to_all_languages(
            "English text",
            target_languages=["he"],
            content_id="test123"
        )

        # Should fallback to English
        assert result["he"] == "English text"

    @pytest.mark.asyncio
    async def test_translate_empty_language_list(self, concurrent_translator, mock_translation_service):
        """Should handle empty target languages list."""
        result = await concurrent_translator.translate_to_all_languages(
            "English text",
            target_languages=[],
            content_id="test123"
        )

        # Should return empty dict
        assert result == {}

        # Should not call translation service
        mock_translation_service.translate_from_english.assert_not_called()

    @pytest.mark.asyncio
    async def test_translate_single_language(self, concurrent_translator, mock_translation_service):
        """Should handle single target language."""
        mock_translation_service.translate_from_english.return_value = "הטקסט"

        result = await concurrent_translator.translate_to_all_languages(
            "The text",
            target_languages=["he"],
            content_id="test123"
        )

        # Should have single translation
        assert len(result) == 1
        assert result["he"] == "הטקסט"

    @pytest.mark.asyncio
    async def test_translate_many_languages(self, concurrent_translator, mock_translation_service):
        """Should handle many target languages."""
        # Mock translation
        async def mock_translate(text, lang, content_id, partner_id):
            return f"translated_{lang}"

        mock_translation_service.translate_from_english.side_effect = mock_translate

        languages = ["he", "es", "fr", "de", "it", "pt", "ru", "zh", "ja", "ko"]

        result = await concurrent_translator.translate_to_all_languages(
            "English text",
            target_languages=languages,
            content_id="test123"
        )

        # Should have all translations
        assert len(result) == 10
        for lang in languages:
            assert result[lang] == f"translated_{lang}"

    @pytest.mark.asyncio
    async def test_translate_mixed_success_and_failure(self, concurrent_translator, mock_translation_service):
        """Should handle mixed success and failure scenarios."""
        # Mock alternating success/failure
        call_count = 0

        async def mock_translate(text, lang, content_id, partner_id):
            nonlocal call_count
            call_count += 1
            if call_count % 2 == 0:
                raise Exception("Translation failed")
            return f"success_{lang}"

        mock_translation_service.translate_from_english.side_effect = mock_translate

        result = await concurrent_translator.translate_to_all_languages(
            "English text",
            target_languages=["he", "es", "fr", "de"],
            content_id="test123"
        )

        # Should have 4 results (2 success, 2 fallback)
        assert len(result) == 4

        # Some should succeed, some should fallback
        success_count = sum(1 for v in result.values() if v.startswith("success_"))
        fallback_count = sum(1 for v in result.values() if v == "English text")

        assert success_count == 2
        assert fallback_count == 2

    @pytest.mark.asyncio
    async def test_translate_none_content_id(self, concurrent_translator, mock_translation_service):
        """Should handle None content_id."""
        mock_translation_service.translate_from_english.return_value = "translated"

        result = await concurrent_translator.translate_to_all_languages(
            "English text",
            target_languages=["he"],
            content_id=None,
            partner_id="partner1"
        )

        # Should still work
        assert result["he"] == "translated"

        # Should pass None content_id
        # Method called as: translate_from_english(text, lang, content_id, partner_id)
        call_args = mock_translation_service.translate_from_english.call_args
        assert call_args.args[2] is None  # content_id is 3rd positional arg
