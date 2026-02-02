"""
Test intent router
"""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from app.services.voice.intent_router import IntentRouter, KIDS_KEYWORDS
from app.services.voice.models import VoiceIntent


class TestIntentClassification:
    """Test intent classification."""

    def test_kids_intent_hebrew(self):
        """Test kids intent classification with Hebrew keywords."""
        router = IntentRouter(language="he", user_id="test_user")
        intent, confidence = router._classify_intent("תוכן לילדים")
        assert intent == VoiceIntent.KIDS
        assert confidence >= 0.9

    def test_kids_intent_english(self):
        """Test kids intent classification with English keywords."""
        router = IntentRouter(language="en", user_id="test_user")
        intent, confidence = router._classify_intent("kids cartoons")
        assert intent == VoiceIntent.KIDS
        assert confidence >= 0.9

    def test_kids_intent_spanish(self):
        """Test kids intent classification with Spanish keywords."""
        router = IntentRouter(language="es", user_id="test_user")
        intent, confidence = router._classify_intent("para niños")
        assert intent == VoiceIntent.KIDS
        assert confidence >= 0.9

    def test_search_intent(self):
        """Test search intent classification."""
        router = IntentRouter(language="en", user_id="test_user")
        intent, confidence = router._classify_intent("search for comedy")
        assert intent == VoiceIntent.SEARCH
        assert confidence >= 0.8

    def test_navigation_intent(self):
        """Test navigation intent classification."""
        router = IntentRouter(language="he", user_id="test_user")
        intent, confidence = router._classify_intent("בית")
        assert intent == VoiceIntent.NAVIGATION
        assert confidence >= 0.95

    def test_playback_intent(self):
        """Test playback intent classification."""
        router = IntentRouter(language="en", user_id="test_user")
        intent, confidence = router._classify_intent("play")
        assert intent == VoiceIntent.PLAYBACK
        assert confidence >= 0.9

    def test_chat_intent_default(self):
        """Test that unrecognized input defaults to CHAT."""
        router = IntentRouter(language="en", user_id="test_user")
        intent, confidence = router._classify_intent("tell me about this movie")
        assert intent == VoiceIntent.CHAT
        assert confidence == 0.5

    def test_kids_keywords_all_languages(self):
        """Test that kids keywords exist for all languages."""
        assert "he" in KIDS_KEYWORDS
        assert "en" in KIDS_KEYWORDS
        assert "es" in KIDS_KEYWORDS

        # Verify each language has keywords
        assert len(KIDS_KEYWORDS["he"]) >= 5
        assert len(KIDS_KEYWORDS["en"]) >= 5
        assert len(KIDS_KEYWORDS["es"]) >= 5


class TestConversationId:
    """Test conversation ID generation."""

    def test_conversation_id_auto_generated(self):
        """Test that conversation ID is auto-generated if not provided."""
        router = IntentRouter(language="en", user_id="test_user")
        assert router.conversation_id is not None
        assert router.conversation_id.startswith("conv-")
        assert len(router.conversation_id) > 10

    def test_conversation_id_preserved(self):
        """Test that provided conversation ID is preserved."""
        router = IntentRouter(
            language="en",
            user_id="test_user",
            conversation_id="custom-conv-id"
        )
        assert router.conversation_id == "custom-conv-id"


class TestIntentRouting:
    """Test intent routing to handlers."""

    @pytest.mark.asyncio
    async def test_route_kids_intent_loads_family_controls(self):
        """Test that KIDS intent loads family controls."""
        router = IntentRouter(language="en", user_id="test_user")

        with patch('app.services.voice.intent_router.VoiceContext.from_request') as mock_context, \
             patch('app.services.voice.intent_router.handle_kids') as mock_handler:

            mock_context.return_value = MagicMock(
                user_id="test_user",
                language="en",
                platform="web",
                conversation_id="conv-123",
                family_controls=None
            )
            mock_handler.return_value = {
                "spoken_response": "Found content",
                "action": None
            }

            await router.process_and_route("kids content")

            # Verify family_controls loading was requested
            mock_context.assert_called_once()
            call_kwargs = mock_context.call_args[1]
            assert call_kwargs['load_family_controls'] is True

    @pytest.mark.asyncio
    async def test_route_chat_intent_no_family_controls(self):
        """Test that CHAT intent doesn't load family controls."""
        router = IntentRouter(language="en", user_id="test_user")

        with patch('app.services.voice.intent_router.VoiceContext.from_request') as mock_context, \
             patch('app.services.voice.intent_router.handle_chat') as mock_handler:

            mock_context.return_value = MagicMock(
                user_id="test_user",
                language="en",
                platform="web",
                conversation_id="conv-123"
            )
            mock_handler.return_value = {
                "spoken_response": "Response",
                "action": None
            }

            await router.process_and_route("hello")

            # Verify family_controls loading was NOT requested
            mock_context.assert_called_once()
            call_kwargs = mock_context.call_args[1]
            assert call_kwargs['load_family_controls'] is False
