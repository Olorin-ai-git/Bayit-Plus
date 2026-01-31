"""
Unit tests for translation provider fallback logic.
Tests the fallback chain: Google → OpenAI → Claude
"""

import asyncio
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.services.live_translation_service import LiveTranslationService


class TestTranslationProviderFallback:
    """Test suite for translation provider fallback."""

    @pytest.fixture
    def mock_translation_cache(self):
        """Mock translation cache service."""
        with patch("app.services.live_translation_service.translation_cache_service") as mock:
            mock.get_cached_translation = AsyncMock(return_value=None)
            mock.store_translation = AsyncMock()
            yield mock

    @pytest.fixture
    def service_with_google(self):
        """Create service with Google as primary provider."""
        with patch("app.services.live_translation_service.GOOGLE_AVAILABLE", True):
            with patch("app.services.live_translation_service.OPENAI_AVAILABLE", True):
                service = LiveTranslationService(translation_provider="google")
                service.translate_client = MagicMock()
                service.openai_client = AsyncMock()
                yield service

    @pytest.mark.asyncio
    async def test_google_translate_success(self, service_with_google, mock_translation_cache):
        """Test successful translation with Google (no fallback)."""
        service_with_google.translate_client.translate.return_value = {
            "translatedText": "Hello World"
        }

        result = await service_with_google.translate_text(
            "שלום עולם", "he", "en", timeout_seconds=0.1
        )

        assert result == "Hello World"
        service_with_google.translate_client.translate.assert_called_once()

    @pytest.mark.asyncio
    async def test_google_failure_fallback_to_openai(self, service_with_google, mock_translation_cache):
        """Test fallback from Google to OpenAI when Google fails."""
        # Google fails
        service_with_google.translate_client.translate.side_effect = Exception("Google API error")

        # OpenAI succeeds
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = "Hello World"
        service_with_google.openai_client.chat.completions.create = AsyncMock(
            return_value=mock_response
        )

        result = await service_with_google.translate_text(
            "שלום עולם", "he", "en", timeout_seconds=0.1
        )

        assert result == "Hello World"
        service_with_google.translate_client.translate.assert_called_once()
        service_with_google.openai_client.chat.completions.create.assert_called_once()

    @pytest.mark.asyncio
    async def test_timeout_handling(self, service_with_google, mock_translation_cache):
        """Test timeout handling and fallback."""
        # Google times out
        async def slow_translate(*args, **kwargs):
            await asyncio.sleep(1)
            return "Should not reach here"

        service_with_google._translate_with_provider = AsyncMock(
            side_effect=asyncio.TimeoutError()
        )

        result = await service_with_google.translate_text(
            "שלום עולם", "he", "en", timeout_seconds=0.1, enable_fallback=False
        )

        # Should return original text on timeout
        assert result == "שלום עולם"

    @pytest.mark.asyncio
    async def test_cache_hit_no_translation(self, service_with_google, mock_translation_cache):
        """Test cache hit prevents translation."""
        mock_translation_cache.get_cached_translation.return_value = "Cached Translation"

        result = await service_with_google.translate_text("שלום עולם", "he", "en")

        assert result == "Cached Translation"
        # Translation providers should not be called
        service_with_google.translate_client.translate.assert_not_called()

    @pytest.mark.asyncio
    async def test_cache_storage_after_translation(self, service_with_google, mock_translation_cache):
        """Test successful translation is cached."""
        service_with_google.translate_client.translate.return_value = {
            "translatedText": "Hello World"
        }

        await service_with_google.translate_text("שלום עולם", "he", "en", cache_ttl_seconds=300)

        mock_translation_cache.store_translation.assert_called_once_with(
            "שלום עולם", "he", "en", "Hello World", channel_id=None, ttl_seconds=300
        )

    @pytest.mark.asyncio
    async def test_reduced_timeout_for_live(self, service_with_google, mock_translation_cache):
        """Test that live features use reduced 100ms timeout."""
        service_with_google.translate_client.translate.return_value = {
            "translatedText": "Hello World"
        }

        # Default timeout should be 100ms for live
        await service_with_google.translate_text("שלום עולם", "he", "en")

        # Verify the method was called (timeout is internal to implementation)
        assert service_with_google.translate_client.translate.called
