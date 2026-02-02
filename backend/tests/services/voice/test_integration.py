"""
Integration tests for wizard voice system
Tests real-world usage scenarios
"""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from app.services.voice.intent_router import IntentRouter
from app.services.voice.models import VoiceIntent


@pytest.mark.asyncio
class TestWizardIntegration:
    """Integration tests for complete wizard flow."""

    async def test_hebrew_kids_request_flow(self):
        """Test complete Hebrew kids content request."""
        router = IntentRouter(
            language="he",
            platform="web",
            user_id="test_user_123"
        )

        with patch('app.services.voice.intent_router.VoiceContext.from_request') as mock_context, \
             patch('app.services.voice.intent_handlers.kids_content_service') as mock_kids_service:

            # Mock context
            mock_ctx = MagicMock()
            mock_ctx.user_id = "test_user_123"
            mock_ctx.language = "he"
            mock_ctx.platform = "web"
            mock_ctx.conversation_id = "conv-123"
            mock_ctx.family_controls = None
            mock_context.return_value = mock_ctx

            # Mock kids service
            mock_response = MagicMock()
            mock_response.items = [
                MagicMock(
                    id="item1",
                    title="כדור קסום",
                    age_rating=5,
                    category="cartoons",
                    thumbnail="http://example.com/thumb.jpg"
                )
            ]
            mock_kids_service.fetch_all_content = AsyncMock(return_value=mock_response)

            # Execute
            response = await router.process_and_route("תוכן לילדים בגיל 5")

            # Verify
            assert response.intent == "KIDS"
            assert response.confidence >= 0.9
            assert "מצאתי" in response.spoken_response
            assert response.action is not None
            assert response.action.type == "kids_content"

    async def test_english_search_flow(self):
        """Test complete English search request."""
        router = IntentRouter(
            language="en",
            platform="web",
            user_id="test_user_456"
        )

        with patch('app.services.voice.intent_router.VoiceContext.from_request') as mock_context, \
             patch('app.services.voice.intent_handlers.UnifiedSearchService') as mock_search_service:

            # Mock context
            mock_ctx = MagicMock()
            mock_ctx.user_id = "test_user_456"
            mock_ctx.language = "en"
            mock_ctx.platform = "web"
            mock_ctx.conversation_id = "conv-456"
            mock_ctx.subscription_tier = "premium"
            mock_ctx.is_beta_user = False
            mock_context.return_value = mock_ctx

            # Mock search service
            mock_instance = mock_search_service.return_value
            mock_instance.search = AsyncMock(return_value={
                "results": [
                    {"title": "Action Movie 1", "year": 2020},
                    {"title": "Action Movie 2", "year": 2021}
                ],
                "total_found": 2
            })

            # Execute
            response = await router.process_and_route("search for comedy")

            # Verify
            assert response.intent == "SEARCH"
            assert response.confidence >= 0.8
            assert "2 results" in response.spoken_response or "Found" in response.spoken_response
            assert response.action is not None
            assert response.action.type == "search"

    async def test_spanish_kids_request_with_family_controls(self):
        """Test Spanish kids request with family controls override."""
        router = IntentRouter(
            language="es",
            platform="ios",
            user_id="test_user_789"
        )

        with patch('app.services.voice.intent_router.VoiceContext.from_request') as mock_context, \
             patch('app.services.voice.intent_handlers.kids_content_service') as mock_kids_service:

            # Mock context with family controls
            mock_fc = MagicMock()
            mock_fc.kids_age_limit = 8

            mock_ctx = MagicMock()
            mock_ctx.user_id = "test_user_789"
            mock_ctx.language = "es"
            mock_ctx.platform = "ios"
            mock_ctx.conversation_id = "conv-789"
            mock_ctx.family_controls = mock_fc
            mock_context.return_value = mock_ctx

            # Mock kids service
            mock_response = MagicMock()
            mock_response.items = [
                MagicMock(
                    id="item1",
                    title="Dibujos animados",
                    age_rating=7,
                    category="cartoons",
                    thumbnail="http://example.com/thumb.jpg"
                )
            ]
            mock_kids_service.fetch_all_content = AsyncMock(return_value=mock_response)

            # Execute - request age 6 (below youngsters threshold)
            response = await router.process_and_route("para niños de 6 años")

            # Verify
            assert response.intent == "KIDS"
            assert "Encontré" in response.spoken_response or "elementos" in response.spoken_response

            # Verify family controls were considered
            call_args = mock_kids_service.fetch_all_content.call_args
            assert call_args[1]['age_max'] == 6  # Age 6, within family control limit

    async def test_chat_intent_default_fallback(self):
        """Test that unrecognized queries fall back to CHAT."""
        router = IntentRouter(
            language="en",
            platform="web",
            user_id="test_user_chat"
        )

        with patch('app.services.voice.intent_router.VoiceContext.from_request') as mock_context, \
             patch('app.services.voice.intent_handlers.WizardChatService') as mock_chat_service:

            # Mock context
            mock_ctx = MagicMock()
            mock_ctx.user_id = "test_user_chat"
            mock_ctx.language = "en"
            mock_ctx.platform = "web"
            mock_ctx.conversation_id = "conv-chat"
            mock_context.return_value = mock_ctx

            # Mock chat service
            mock_instance = mock_chat_service.return_value
            mock_instance.process_chat = AsyncMock(return_value={
                "spoken_response": "I can help you with that",
                "action": {"type": "chat", "payload": {"message": "hello"}}
            })

            # Execute
            response = await router.process_and_route("tell me about this platform")

            # Verify
            assert response.intent == "CHAT"
            assert response.confidence == 0.5  # Default confidence for CHAT
            assert "help" in response.spoken_response

    async def test_multi_language_conversation_continuity(self):
        """Test conversation ID is maintained across requests."""
        router = IntentRouter(
            language="he",
            platform="web",
            user_id="test_user_multi",
            conversation_id="my-conv-123"
        )

        # First request
        with patch('app.services.voice.intent_router.VoiceContext.from_request') as mock_context:
            mock_ctx = MagicMock()
            mock_ctx.user_id = "test_user_multi"
            mock_ctx.language = "he"
            mock_ctx.conversation_id = "my-conv-123"
            mock_context.return_value = mock_ctx

            response1 = await router.process_and_route("בית")
            assert response1.conversation_id == "my-conv-123"

            # Second request - same router
            response2 = await router.process_and_route("נגן")
            assert response2.conversation_id == "my-conv-123"
            assert response1.conversation_id == response2.conversation_id


@pytest.mark.asyncio
class TestErrorHandling:
    """Test error handling in various scenarios."""

    async def test_search_failure_graceful_degradation(self):
        """Test that search failures return graceful error messages."""
        router = IntentRouter(language="en", user_id="test_user_error")

        with patch('app.services.voice.intent_router.VoiceContext.from_request') as mock_context, \
             patch('app.services.voice.intent_handlers.UnifiedSearchService') as mock_search:

            mock_ctx = MagicMock()
            mock_ctx.user_id = "test_user_error"
            mock_ctx.language = "en"
            mock_ctx.conversation_id = "conv-error"
            mock_ctx.subscription_tier = "basic"
            mock_context.return_value = mock_ctx

            # Mock search failure
            mock_instance = mock_search.return_value
            mock_instance.search = AsyncMock(side_effect=Exception("Database error"))

            response = await router.process_and_route("search for comedy")

            # Verify graceful error
            assert response.intent == "SEARCH"
            assert "Sorry" in response.spoken_response or "couldn't" in response.spoken_response

    async def test_kids_empty_results(self):
        """Test kids handler with no results."""
        router = IntentRouter(language="he", user_id="test_user_empty")

        with patch('app.services.voice.intent_router.VoiceContext.from_request') as mock_context, \
             patch('app.services.voice.intent_handlers.kids_content_service') as mock_kids:

            mock_ctx = MagicMock()
            mock_ctx.user_id = "test_user_empty"
            mock_ctx.language = "he"
            mock_ctx.conversation_id = "conv-empty"
            mock_ctx.family_controls = None
            mock_context.return_value = mock_ctx

            # Mock empty results
            mock_response = MagicMock()
            mock_response.items = []
            mock_kids.fetch_all_content = AsyncMock(return_value=mock_response)

            response = await router.process_and_route("ילדים")

            # Verify appropriate message
            assert response.intent == "KIDS"
            assert "לא מצאתי" in response.spoken_response


@pytest.mark.asyncio
class TestPlatformSupport:
    """Test platform-specific features."""

    async def test_web_platform(self):
        """Test web platform support."""
        router = IntentRouter(
            language="en",
            platform="web",
            user_id="test_web"
        )
        assert router.platform == "web"

    async def test_ios_platform(self):
        """Test iOS platform support."""
        router = IntentRouter(
            language="en",
            platform="ios",
            user_id="test_ios"
        )
        assert router.platform == "ios"

    async def test_tvos_platform(self):
        """Test tvOS platform support."""
        router = IntentRouter(
            language="en",
            platform="tvos",
            user_id="test_tvos"
        )
        assert router.platform == "tvos"

    async def test_android_platform(self):
        """Test Android platform support."""
        router = IntentRouter(
            language="en",
            platform="android",
            user_id="test_android"
        )
        assert router.platform == "android"
