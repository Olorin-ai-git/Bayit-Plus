"""
Tests for Trivia Translation Service
Covers sanitization, translation, rate limiting, and security
"""

import pytest
from unittest.mock import Mock, patch, AsyncMock

from app.services.trivia.trivia_translation_service import (
    TriviaTextSanitizer,
    TriviaTranslationService,
    RateLimitExceeded,
)


class TestTriviaTextSanitizer:
    """Test input sanitization for security."""

    def test_sanitize_removes_script_tags(self):
        """Test that <script> tags are removed."""
        sanitizer = TriviaTextSanitizer()
        malicious = "Hello <script>alert('xss')</script> World"
        result = sanitizer.sanitize(malicious)

        assert "<script" not in result.lower()
        assert "alert" not in result.lower()
        assert "Hello" in result
        assert "World" in result

    def test_sanitize_removes_javascript_urls(self):
        """Test that javascript: URLs are removed."""
        sanitizer = TriviaTextSanitizer()
        malicious = "Click javascript:alert('xss') here"
        result = sanitizer.sanitize(malicious)

        assert "javascript:" not in result.lower()
        assert "alert" not in result.lower()

    def test_sanitize_removes_iframe_tags(self):
        """Test that <iframe> tags are removed."""
        sanitizer = TriviaTextSanitizer()
        malicious = "Content <iframe src='evil.com'></iframe> here"
        result = sanitizer.sanitize(malicious)

        assert "<iframe" not in result.lower()
        assert "evil.com" not in result

    def test_sanitize_removes_template_injection(self):
        """Test that template injection patterns are removed."""
        sanitizer = TriviaTextSanitizer()

        # Jinja2-style
        malicious1 = "Test {% exec('evil') %} content"
        result1 = sanitizer.sanitize(malicious1)
        assert "{%" not in result1

        # Handlebars-style
        malicious2 = "Test {{exec('evil')}} content"
        result2 = sanitizer.sanitize(malicious2)
        assert "{{" not in result2

    def test_sanitize_limits_length(self):
        """Test that text is truncated to 1000 characters."""
        sanitizer = TriviaTextSanitizer()
        long_text = "A" * 2000
        result = sanitizer.sanitize(long_text)

        assert len(result) <= 1000

    def test_sanitize_html_encodes(self):
        """Test that HTML special characters are encoded."""
        sanitizer = TriviaTextSanitizer()
        html_text = "<div>Hello & goodbye</div>"
        result = sanitizer.sanitize(html_text)

        # HTML encoded versions
        assert "&lt;" in result or "<div" not in result
        assert "&amp;" in result or "& " not in result

    def test_sanitize_removes_excessive_whitespace(self):
        """Test that excessive whitespace is normalized."""
        sanitizer = TriviaTextSanitizer()
        messy = "Hello    \n\n\n    World   \t\t  Test"
        result = sanitizer.sanitize(messy)

        assert "Hello World Test" in result
        assert "    " not in result
        assert "\n" not in result

    def test_sanitize_empty_string(self):
        """Test sanitizing empty string returns empty."""
        sanitizer = TriviaTextSanitizer()
        assert sanitizer.sanitize("") == ""
        assert sanitizer.sanitize("   ") == ""

    def test_sanitize_none_returns_empty(self):
        """Test sanitizing None returns empty string."""
        sanitizer = TriviaTextSanitizer()
        assert sanitizer.sanitize(None) == ""

    def test_sanitize_preserves_safe_content(self):
        """Test that safe content is preserved."""
        sanitizer = TriviaTextSanitizer()
        safe = "This is a safe trivia fact about movies."
        result = sanitizer.sanitize(safe)

        assert result == safe


@pytest.mark.asyncio
class TestTriviaTranslationService:
    """Test translation service with security controls."""

    @pytest.fixture
    def mock_anthropic_client(self):
        """Mock Anthropic client for testing."""
        mock = AsyncMock()
        mock_response = Mock()
        mock_response.content = [Mock(text="Traducción de prueba")]
        mock_response.content[0].__class__.__name__ = "TextBlock"
        mock.messages.create = AsyncMock(return_value=mock_response)
        return mock

    @pytest.fixture
    def mock_rate_limiter(self):
        """Mock rate limiter for testing."""
        mock = AsyncMock()
        mock.allow = AsyncMock(return_value=True)
        return mock

    @pytest.fixture
    def mock_metering(self):
        """Mock metering service for testing."""
        mock = AsyncMock()
        mock.record_usage = AsyncMock()
        return mock

    @pytest.fixture
    def service(self, mock_anthropic_client, mock_rate_limiter, mock_metering):
        """Create service with mocked dependencies."""
        with patch('app.services.trivia.trivia_translation_service.AsyncAnthropic') as mock_anthropic:
            mock_anthropic.return_value = mock_anthropic_client

            with patch('app.services.trivia.trivia_translation_service.SimpleRateLimiter') as mock_rl:
                mock_rl.return_value = mock_rate_limiter

                with patch('app.services.trivia.trivia_translation_service.MeteringService') as mock_meter:
                    mock_meter.return_value = mock_metering

                    service = TriviaTranslationService()
                    return service

    async def test_translate_from_english_to_hebrew(self, service, mock_anthropic_client):
        """Test translating English to Hebrew."""
        # Setup mock response - properly mock TextBlock
        from anthropic.types import TextBlock

        mock_response = Mock()
        mock_content = TextBlock(text="זו עובדה בדיקה", type="text")
        mock_response.content = [mock_content]
        mock_anthropic_client.messages.create = AsyncMock(return_value=mock_response)

        result = await service.translate_from_english(
            "This is a test fact",
            "he",
            "test_content_123"
        )

        assert result == "זו עובדה בדיקה"

    async def test_translate_from_english_to_spanish(self, service, mock_anthropic_client):
        """Test translating English to Spanish."""
        # Setup mock response - properly mock TextBlock
        from anthropic.types import TextBlock

        mock_response = Mock()
        mock_content = TextBlock(text="Este es un hecho de prueba", type="text")
        mock_response.content = [mock_content]
        mock_anthropic_client.messages.create = AsyncMock(return_value=mock_response)

        result = await service.translate_from_english(
            "This is a test fact",
            "es",
            "test_content_123"
        )

        assert result == "Este es un hecho de prueba"

    async def test_translate_trivia_fact_both_languages(self, service, mock_anthropic_client):
        """Test translating to both Hebrew and Spanish concurrently."""
        # Setup mock to return different responses
        call_count = 0

        async def mock_create(*args, **kwargs):
            nonlocal call_count
            call_count += 1

            mock_response = Mock()
            mock_content = Mock()

            if call_count == 1:
                # Hebrew response
                mock_content.text = "זו עובדה"
            else:
                # Spanish response
                mock_content.text = "Este es un hecho"

            mock_content.__class__.__name__ = "TextBlock"
            mock_response.content = [mock_content]
            return mock_response

        mock_anthropic_client.messages.create = mock_create

        result = await service.translate_trivia_fact(
            "This is a fact",
            "test_content_123"
        )

        assert "he" in result
        assert "es" in result
        assert result["he"]
        assert result["es"]

    async def test_invalid_target_language(self, service):
        """Test that invalid target language raises ValueError."""
        with pytest.raises(ValueError, match="Unsupported target language"):
            await service.translate_from_english(
                "Test",
                "fr",  # French not supported
                "test_content"
            )

    async def test_rate_limiting_enforced(self, service, mock_rate_limiter):
        """Test that rate limiting is enforced."""
        # Mock rate limiter to deny
        mock_rate_limiter.allow = AsyncMock(return_value=False)

        with pytest.raises(RateLimitExceeded, match="Translation rate limit exceeded"):
            await service.translate_from_english(
                "Test",
                "he",
                "test_content"
            )

    async def test_input_sanitization_applied(self, service, mock_anthropic_client):
        """Test that input sanitization is applied before translation."""
        malicious = "Test <script>alert('xss')</script> fact"

        # Setup mock response
        mock_response = Mock()
        mock_content = Mock()
        mock_content.text = "עובדה נקייה"
        mock_content.__class__.__name__ = "TextBlock"
        mock_response.content = [mock_content]
        mock_anthropic_client.messages.create = AsyncMock(return_value=mock_response)

        result = await service.translate_from_english(
            malicious,
            "he",
            "test_content"
        )

        # Verify sanitization was called (script tag removed from prompt)
        call_args = mock_anthropic_client.messages.create.call_args
        prompt = call_args[1]['messages'][0]['content']

        assert "<script" not in prompt
        assert "alert" not in prompt

    async def test_output_validation_rejects_malicious_content(self, service, mock_anthropic_client):
        """Test that output validation rejects malicious translations."""
        # Setup mock to return malicious content
        mock_response = Mock()
        mock_content = Mock()
        mock_content.text = "Translation <script>alert('xss')</script>"
        mock_content.__class__.__name__ = "TextBlock"
        mock_response.content = [mock_content]
        mock_anthropic_client.messages.create = AsyncMock(return_value=mock_response)

        result = await service.translate_from_english(
            "Test",
            "he",
            "test_content"
        )

        # Should fallback to sanitized original, not return malicious content
        assert "<script" not in result
        assert result == "Test"  # Fallback to sanitized original

    async def test_empty_text_after_sanitization(self, service):
        """Test handling of text that becomes empty after sanitization."""
        # Text that will be sanitized to [removed]
        malicious_text = "<script></script>"

        result = await service.translate_from_english(
            malicious_text,
            "he",
            "test_content"
        )

        # Should return sanitized version (security: never return unsanitized malicious content)
        assert result == "[removed]"
        assert "<script" not in result

    async def test_metering_recorded(self, service, mock_anthropic_client, mock_metering):
        """Test that translation usage is recorded in metering."""
        # Setup mock response - use actual TextBlock
        from anthropic.types import TextBlock

        mock_response = Mock()
        mock_content = TextBlock(text="Traducción", type="text")
        mock_response.content = [mock_content]
        mock_anthropic_client.messages.create = AsyncMock(return_value=mock_response)

        await service.translate_from_english(
            "This is a test",
            "es",
            "test_content",
            "partner_123"
        )

        # Verify metering was called
        mock_metering.record_usage.assert_called_once()
        call_args = mock_metering.record_usage.call_args

        assert call_args[1]['partner_id'] == "partner_123"
        assert call_args[1]['resource_type'] == "trivia_translation"
        assert call_args[1]['quantity'] > 0  # Estimated tokens

    async def test_translation_failure_fallback(self, service, mock_anthropic_client):
        """Test that translation failures fallback to original text."""
        # Setup mock to raise exception
        mock_anthropic_client.messages.create = AsyncMock(
            side_effect=Exception("API Error")
        )

        result = await service.translate_from_english(
            "Test fact",
            "he",
            "test_content"
        )

        # Should return sanitized original text
        assert result == "Test fact"

    async def test_validate_translation_output_suspicious_length_ratio(self, service):
        """Test that suspicious length ratios are logged but allowed."""
        # Very short translation (0.2x ratio)
        valid = service._validate_translation_output(
            "This is a very long English sentence with many words",
            "Short",
            "he"
        )

        # Should still be valid (logged warning but allowed)
        assert valid is True

        # Very long translation (5x ratio)
        valid = service._validate_translation_output(
            "Test",
            "This is a very very very very long translation that is five times longer",
            "es"
        )

        # Should be invalid (ratio > 3.0)
        assert valid is False

    def test_supported_languages(self, service):
        """Test that only Hebrew and Spanish are supported."""
        assert "he" in service.supported_translations
        assert "es" in service.supported_translations
        assert "fr" not in service.supported_translations
        assert "de" not in service.supported_translations
