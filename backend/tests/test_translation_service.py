"""
Unit Tests for Translation Service

Tests the universal translation service functionality.
"""

from unittest.mock import AsyncMock, Mock, patch

import pytest
from app.services.translation_service import TranslationService


class TestTranslationService:
    """Test cases for TranslationService."""

    @pytest.fixture
    def translation_service(self):
        """Create a translation service instance."""
        return TranslationService()

    def test_initialization(self, translation_service):
        """Test service initialization."""
        assert translation_service.model == "claude-sonnet-4-20250514"
        assert "en" in translation_service.supported_languages
        assert "es" in translation_service.supported_languages

    def test_translate_empty_text(self, translation_service):
        """Test translating empty text returns empty string."""
        result = translation_service.translate_text("", "en")
        assert result == ""

        result = translation_service.translate_text("   ", "en")
        assert result == ""

    def test_translate_unsupported_language(self, translation_service):
        """Test translating to unsupported language raises error."""
        with pytest.raises(ValueError) as exc_info:
            translation_service.translate_text("שלום", "fr")

        assert "Unsupported language code" in str(exc_info.value)

    @patch("app.services.translation_service.Anthropic")
    def test_translate_text_success(self, mock_anthropic, translation_service):
        """Test successful text translation."""
        mock_client = Mock()
        mock_response = Mock()
        mock_response.content = [Mock(text="Hello")]
        mock_client.messages.create.return_value = mock_response

        translation_service.client = mock_client

        result = translation_service.translate_text("שלום", "en")

        assert result == "Hello"
        mock_client.messages.create.assert_called_once()

    @patch("app.services.translation_service.Anthropic")
    def test_translate_text_removes_prefix(self, mock_anthropic, translation_service):
        """Test that Translation: prefix is removed."""
        mock_client = Mock()
        mock_response = Mock()
        mock_response.content = [Mock(text="Translation: Hello")]
        mock_client.messages.create.return_value = mock_response

        translation_service.client = mock_client

        result = translation_service.translate_text("שלום", "en")

        assert result == "Hello"
        assert "Translation:" not in result

    @patch("app.services.translation_service.Anthropic")
    def test_translate_text_handles_quotes(self, mock_anthropic, translation_service):
        """Test that quotes are stripped from translation."""
        mock_client = Mock()
        mock_response = Mock()
        mock_response.content = [Mock(text='"Hello"')]
        mock_client.messages.create.return_value = mock_response

        translation_service.client = mock_client

        result = translation_service.translate_text("שלום", "en")

        assert result == "Hello"
        assert '"' not in result

    @patch("app.services.translation_service.Anthropic")
    def test_translate_text_error_handling(self, mock_anthropic, translation_service):
        """Test error handling during translation."""
        mock_client = Mock()
        mock_client.messages.create.side_effect = Exception("API Error")

        translation_service.client = mock_client

        result = translation_service.translate_text("שלום", "en")

        assert result == ""

    @pytest.mark.asyncio
    async def test_translate_field_async(self, translation_service):
        """Test async field translation."""
        with patch.object(translation_service, "translate_text", return_value="Hello"):
            result = await translation_service.translate_field("שלום", "en")
            assert result == "Hello"

    @pytest.mark.asyncio
    async def test_translate_field_none_input(self, translation_service):
        """Test async field translation with None input."""
        result = await translation_service.translate_field(None, "en")
        assert result is None

    @pytest.mark.asyncio
    async def test_translate_fields_multiple(self, translation_service):
        """Test translating multiple fields at once."""
        fields = {"title": "שלום", "description": "זה תיאור", "author": "יוסי כהן"}

        with patch.object(translation_service, "translate_field") as mock_translate:
            mock_translate.side_effect = [
                "Hello",
                "This is a description",
                "Yossi Cohen",
            ]

            results = await translation_service.translate_fields(fields, "en")

            assert results["title"] == "Hello"
            assert results["description"] == "This is a description"
            assert results["author"] == "Yossi Cohen"

    def test_get_translation_stats(self, translation_service):
        """Test translation statistics calculation."""
        stats = translation_service.get_translation_stats(
            original_count=100, translated_count=85, field_count=340
        )

        assert stats["total_items"] == 100
        assert stats["translated_items"] == 85
        assert stats["skipped_items"] == 15
        assert stats["total_fields_translated"] == 340
        assert stats["success_rate"] == 85.0

    def test_get_translation_stats_zero_items(self, translation_service):
        """Test translation statistics with zero items."""
        stats = translation_service.get_translation_stats(
            original_count=0, translated_count=0, field_count=0
        )

        assert stats["success_rate"] == 0

    def test_validate_translation_success(self, translation_service):
        """Test translation validation success case."""
        result = translation_service.validate_translation(
            original_text="שלום עולם", translated_text="Hello World"
        )

        assert result is True

    def test_validate_translation_same_text(self, translation_service):
        """Test validation when text is the same (already in target language)."""
        result = translation_service.validate_translation(
            original_text="Hello", translated_text="Hello"
        )

        assert result is True

    def test_validate_translation_empty(self, translation_service):
        """Test validation fails for empty translation."""
        result = translation_service.validate_translation(
            original_text="שלום", translated_text=""
        )

        assert result is False

    def test_validate_translation_too_short(self, translation_service):
        """Test validation fails for too short translation."""
        result = translation_service.validate_translation(
            original_text="שלום עולם זה טקסט ארוך מאוד",
            translated_text="Hi",
            min_length_ratio=0.5,
        )

        assert result is False

    def test_validate_translation_too_long(self, translation_service):
        """Test validation fails for too long translation."""
        result = translation_service.validate_translation(
            original_text="שלום",
            translated_text="This is a very long translation that is too long for the original",
            max_length_ratio=2.0,
        )

        assert result is False
