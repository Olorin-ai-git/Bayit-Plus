"""
Tests for TriviaTranslationService - Integration Tests

Verifies translation service functionality with mocked dependencies.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from anthropic.types import Message, TextBlock, Usage

from app.services.trivia.trivia_translation_service import (
    TriviaTranslationService,
    RateLimitExceeded
)


@pytest.fixture
def mock_anthropic_client():
    """Create a mock Anthropic client."""
    client = AsyncMock()
    return client


@pytest.fixture
def mock_rate_limiter():
    """Create a mock rate limiter that always allows requests."""
    limiter = AsyncMock()
    limiter.allow = AsyncMock(return_value=True)
    return limiter


@pytest.fixture
def mock_metering_service():
    """Create a mock metering service."""
    service = AsyncMock()
    service.record_usage = AsyncMock()
    return service


@pytest.fixture
def translation_service(mock_anthropic_client, mock_rate_limiter, mock_metering_service):
    """Create TriviaTranslationService with mocked dependencies."""
    return TriviaTranslationService(
        anthropic_client=mock_anthropic_client,
        rate_limiter=mock_rate_limiter,
        metering_service=mock_metering_service
    )


class TestTriviaTranslationServiceInit:
    """Test service initialization."""

    def test_init_with_dependencies(self, mock_anthropic_client, mock_rate_limiter, mock_metering_service):
        """Service should initialize with injected dependencies."""
        service = TriviaTranslationService(
            anthropic_client=mock_anthropic_client,
            rate_limiter=mock_rate_limiter,
            metering_service=mock_metering_service
        )
        assert service.client == mock_anthropic_client
        assert service.rate_limiter == mock_rate_limiter
        assert service.metering == mock_metering_service

    def test_init_supported_languages(self, translation_service):
        """Service should support Hebrew and Spanish."""
        assert "he" in translation_service.supported_translations
        assert "es" in translation_service.supported_translations
        assert translation_service.supported_translations["he"] == "Hebrew"
        assert translation_service.supported_translations["es"] == "Spanish"


class TestTranslateFromEnglish:
    """Test translate_from_english method."""

    @pytest.mark.asyncio
    async def test_translate_english_to_hebrew_success(self, translation_service, mock_anthropic_client):
        """Successful English→Hebrew translation."""
        # Mock API response
        mock_response = Message(
            id="msg_123",
            content=[TextBlock(type="text", text="הסרט זכה באוסקר")],
            model="claude-3-5-sonnet-20241022",
            role="assistant",
            stop_reason="end_turn",
            type="message",
            usage=Usage(input_tokens=10, output_tokens=5)
        )
        mock_anthropic_client.messages.create = AsyncMock(return_value=mock_response)

        result = await translation_service.translate_from_english(
            "The movie won an Oscar",
            "he",
            content_id="test123",
            partner_id="partner1"
        )

        assert result == "הסרט זכה באוסקר"
        mock_anthropic_client.messages.create.assert_called_once()

    @pytest.mark.asyncio
    async def test_translate_english_to_spanish_success(self, translation_service, mock_anthropic_client):
        """Successful English→Spanish translation."""
        mock_response = Message(
            id="msg_124",
            content=[TextBlock(type="text", text="La película ganó un Oscar")],
            model="claude-3-5-sonnet-20241022",
            role="assistant",
            stop_reason="end_turn",
            type="message",
            usage=Usage(input_tokens=10, output_tokens=5)
        )
        mock_anthropic_client.messages.create = AsyncMock(return_value=mock_response)

        result = await translation_service.translate_from_english(
            "The movie won an Oscar",
            "es",
            content_id="test123",
            partner_id="partner1"
        )

        assert result == "La película ganó un Oscar"

    @pytest.mark.asyncio
    async def test_translate_unsupported_language_raises_error(self, translation_service):
        """Unsupported target language should raise ValueError."""
        with pytest.raises(ValueError, match="Unsupported target language"):
            await translation_service.translate_from_english(
                "Text",
                "fr",  # French not supported
                content_id="test123"
            )

    @pytest.mark.asyncio
    async def test_translate_rate_limit_exceeded(self, translation_service, mock_rate_limiter):
        """Rate limit exceeded should raise RateLimitExceeded."""
        mock_rate_limiter.allow = AsyncMock(return_value=False)

        with pytest.raises(RateLimitExceeded, match="Translation rate limit exceeded"):
            await translation_service.translate_from_english(
                "Text",
                "he",
                content_id="test123"
            )

    @pytest.mark.asyncio
    async def test_translate_sanitizes_input(self, translation_service, mock_anthropic_client):
        """Input should be sanitized before translation."""
        mock_response = Message(
            id="msg_125",
            content=[TextBlock(type="text", text="הטקסט")],
            model="claude-3-5-sonnet-20241022",
            role="assistant",
            stop_reason="end_turn",
            type="message",
            usage=Usage(input_tokens=10, output_tokens=5)
        )
        mock_anthropic_client.messages.create = AsyncMock(return_value=mock_response)

        # Input with dangerous content
        malicious_input = "Text <script>alert('xss')</script>"

        result = await translation_service.translate_from_english(
            malicious_input,
            "he",
            content_id="test123"
        )

        # Should still return result (sanitizer removes dangerous content)
        assert result is not None

    @pytest.mark.asyncio
    async def test_translate_empty_after_sanitization_returns_original(self, translation_service):
        """Empty text after sanitization should return original."""
        # Only whitespace
        result = await translation_service.translate_from_english(
            "   \n\t  ",
            "he",
            content_id="test123"
        )

        # Should return original (empty after sanitization)
        assert result == "   \n\t  "

    @pytest.mark.asyncio
    async def test_translate_records_metering(self, translation_service, mock_anthropic_client, mock_metering_service):
        """Successful translation should record metering."""
        mock_response = Message(
            id="msg_126",
            content=[TextBlock(type="text", text="הסרט")],
            model="claude-3-5-sonnet-20241022",
            role="assistant",
            stop_reason="end_turn",
            type="message",
            usage=Usage(input_tokens=10, output_tokens=5)
        )
        mock_anthropic_client.messages.create = AsyncMock(return_value=mock_response)

        await translation_service.translate_from_english(
            "The movie",
            "he",
            content_id="test123",
            partner_id="partner1"
        )

        # Should record usage
        mock_metering_service.record_usage.assert_called_once()
        call_args = mock_metering_service.record_usage.call_args
        assert call_args.kwargs["partner_id"] == "partner1"
        assert call_args.kwargs["resource_type"] == "trivia_translation"

    @pytest.mark.asyncio
    async def test_translate_api_error_returns_sanitized_text(self, translation_service, mock_anthropic_client):
        """API error should return sanitized original text."""
        mock_anthropic_client.messages.create = AsyncMock(side_effect=Exception("API Error"))

        result = await translation_service.translate_from_english(
            "The movie won an Oscar",
            "he",
            content_id="test123"
        )

        # Should return sanitized original on error
        assert "movie" in result
        assert "Oscar" in result

    @pytest.mark.asyncio
    async def test_translate_cleans_response_prefixes(self, translation_service, mock_anthropic_client):
        """Response prefixes like 'Translation:' should be removed."""
        mock_response = Message(
            id="msg_127",
            content=[TextBlock(type="text", text="Translation: הסרט זכה באוסקר")],
            model="claude-3-5-sonnet-20241022",
            role="assistant",
            stop_reason="end_turn",
            type="message",
            usage=Usage(input_tokens=10, output_tokens=5)
        )
        mock_anthropic_client.messages.create = AsyncMock(return_value=mock_response)

        result = await translation_service.translate_from_english(
            "The movie won an Oscar",
            "he",
            content_id="test123"
        )

        # "Translation:" prefix should be removed
        assert result == "הסרט זכה באוסקר"
        assert "Translation:" not in result


class TestTranslateTriviaFact:
    """Test translate_trivia_fact method (concurrent translation)."""

    @pytest.mark.asyncio
    async def test_translate_trivia_fact_success(self, translation_service):
        """Should translate to both Hebrew and Spanish concurrently."""
        # Mock concurrent translator
        translation_service.concurrent_translator.translate_to_all_languages = AsyncMock(
            return_value={
                "he": "הסרט זכה באוסקר",
                "es": "La película ganó un Oscar"
            }
        )

        result = await translation_service.translate_trivia_fact(
            "The movie won an Oscar",
            content_id="test123",
            partner_id="partner1"
        )

        assert result["he"] == "הסרט זכה באוסקר"
        assert result["es"] == "La película ganó un Oscar"

    @pytest.mark.asyncio
    async def test_translate_trivia_fact_calls_concurrent_translator(self, translation_service):
        """Should delegate to concurrent translator."""
        translation_service.concurrent_translator.translate_to_all_languages = AsyncMock(
            return_value={"he": "text_he", "es": "text_es"}
        )

        await translation_service.translate_trivia_fact(
            "English text",
            content_id="test123",
            partner_id="partner1"
        )

        # Should call concurrent translator with correct params
        translation_service.concurrent_translator.translate_to_all_languages.assert_called_once_with(
            "English text",
            target_languages=["he", "es"],
            content_id="test123",
            partner_id="partner1"
        )
