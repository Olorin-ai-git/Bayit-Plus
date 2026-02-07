"""
Intent Router Service
Routes voice intents to appropriate handlers and generates responses
"""

from typing import Optional, Dict, Any
import uuid

from app.core.logging_config import get_logger
from .models import VoiceResponse, VoiceAction, VoiceGesture, VoiceIntent
from .context import VoiceContext
from .intent_keywords import (
    KIDS_KEYWORDS,
    NAVIGATION_KEYWORDS,
    SEARCH_KEYWORDS,
    PLAYBACK_KEYWORDS,
    SCROLL_KEYWORDS,
    CONTROL_KEYWORDS,
    CONTENT_QUERY_KEYWORDS,
    DISPLAY_CHANNELS_KEYWORDS,
    WEB_SEARCH_KEYWORDS,
    is_play_content_request,
    clean_play_prefix,
)
from .playlist_keywords import is_playlist_request
from .channel_keywords import is_channel_request, normalize_number_words
from .podcast_radio_keywords import is_podcast_request, is_radio_request, is_audiobook_request
from .intent_handlers import (
    handle_chat,
    handle_search,
    handle_kids,
    handle_play_content,
    handle_playlist,
    handle_navigation,
    handle_playback,
    handle_scroll,
    handle_control,
    get_intent_gesture,
)

logger = get_logger(__name__)


class IntentRouter:
    """Routes voice intents to appropriate handlers."""

    def __init__(
        self,
        language: str = "en",
        platform: str = "web",
        user_id: Optional[str] = None,
        conversation_id: Optional[str] = None
    ):
        self.language = language
        self.platform = platform
        self.user_id = user_id
        self.conversation_id = conversation_id or self._generate_conversation_id()

    def _generate_conversation_id(self) -> str:
        """Generate unique conversation ID."""
        return f"conv-{uuid.uuid4().hex[:12]}"

    async def process_and_route(
        self, transcript: str, trigger_type: str = "manual"
    ) -> VoiceResponse:
        """Process transcript, classify intent, and route to appropriate handler."""
        # Classify intent
        self._play_content_query = None
        intent, confidence = self._classify_intent(transcript)

        logger.info(
            "Intent classified",
            extra={
                "user_id": self.user_id,
                "intent": intent.value,
                "confidence": confidence,
                "language": self.language
            }
        )

        # Build voice context
        context = await VoiceContext.from_request(
            user_id=self.user_id,
            language=self.language,
            platform=self.platform,
            conversation_id=self.conversation_id,
            load_user=True,
            load_family_controls=(intent == VoiceIntent.KIDS)
        )

        # Route to handler
        response_data = await self._route_intent(intent, transcript, context)

        # Add gesture based on intent
        gesture_data = get_intent_gesture(intent.value)

        # Build VoiceResponse
        action_data = response_data.get("action")
        return VoiceResponse(
            intent=intent.value,
            spoken_response=response_data.get("spoken_response", ""),
            action=VoiceAction(**action_data) if action_data else None,
            conversation_id=self.conversation_id,
            confidence=confidence,
            gesture=VoiceGesture(**gesture_data) if gesture_data else None,
        )

    def _classify_intent(self, transcript: str) -> tuple[VoiceIntent, float]:
        """Classify intent from transcript using multi-language command patterns."""

        transcript_lower = transcript.lower().strip()

        # Playlist management - checked first because "play my playlist" compounds
        # must not be intercepted by the simpler play-content prefix check
        if is_playlist_request(transcript_lower, self.language):
            return VoiceIntent.PLAYLIST, 0.92

        # "play [content]" - handles movies, channels, podcasts, radio
        if is_play_content_request(transcript_lower):
            self._play_content_query = clean_play_prefix(transcript)
            return VoiceIntent.PLAYBACK, 0.9

        # Bare channel references: "channel 13", "channel thirteen"
        if is_channel_request(transcript_lower):
            self._play_content_query = normalize_number_words(transcript.strip().rstrip(".,!?;:"))
            return VoiceIntent.PLAYBACK, 0.9
        # Bare podcast/radio/audiobook: "podcast Kan", "radio Galatz", "audiobook Harry Potter"
        if (is_podcast_request(transcript_lower) or is_radio_request(transcript_lower)
                or is_audiobook_request(transcript_lower)):
            self._play_content_query = transcript.strip().rstrip(".,!?;:")
            return VoiceIntent.PLAYBACK, 0.9

        # Kids content patterns (3 languages)
        kids_keywords = KIDS_KEYWORDS.get(self.language, KIDS_KEYWORDS["en"])
        if any(kw in transcript_lower for kw in kids_keywords):
            return VoiceIntent.KIDS, 0.9
        # Search patterns - checked BEFORE navigation because NAVIGATION_KEYWORDS
        # includes category words (movies, audiobooks, etc.) that also appear in
        # search queries like "do you have Harry Potter audiobooks?"
        if any(kw in transcript_lower for kw in SEARCH_KEYWORDS):
            return VoiceIntent.SEARCH, 0.8
        # Navigation patterns
        if any(kw in transcript_lower for kw in NAVIGATION_KEYWORDS):
            return VoiceIntent.NAVIGATION, 0.95
        # Bare playback control (play, pause, stop, resume)
        if any(kw in transcript_lower for kw in PLAYBACK_KEYWORDS):
            return VoiceIntent.PLAYBACK, 0.9
        # Scroll patterns
        if any(kw in transcript_lower for kw in SCROLL_KEYWORDS):
            return VoiceIntent.SCROLL, 0.85

        # Control patterns
        if any(kw in transcript_lower for kw in CONTROL_KEYWORDS):
            return VoiceIntent.CONTROL, 0.9

        # Content query patterns (3 languages)
        cq_keywords = CONTENT_QUERY_KEYWORDS.get(self.language, CONTENT_QUERY_KEYWORDS["en"])
        if any(kw in transcript_lower for kw in cq_keywords):
            return VoiceIntent.CONTENT_QUERY, 0.85

        # Display channels patterns (3 languages)
        dc_keywords = DISPLAY_CHANNELS_KEYWORDS.get(self.language, DISPLAY_CHANNELS_KEYWORDS["en"])
        if any(kw in transcript_lower for kw in dc_keywords):
            return VoiceIntent.DISPLAY_CHANNELS, 0.9

        # Web search patterns (3 languages)
        ws_keywords = WEB_SEARCH_KEYWORDS.get(self.language, WEB_SEARCH_KEYWORDS["en"])
        if any(kw in transcript_lower for kw in ws_keywords):
            return VoiceIntent.WEB_SEARCH, 0.85

        # Default to CHAT for natural language
        return VoiceIntent.CHAT, 0.5

    async def _route_intent(
        self, intent: VoiceIntent, transcript: str, context: VoiceContext
    ) -> Dict[str, Any]:
        """Route intent to appropriate handler."""
        # "play [content]" → search for content and navigate to player
        if intent == VoiceIntent.PLAYBACK and self._play_content_query:
            return await handle_play_content(self._play_content_query, context)
        # Handlers that require context
        context_handlers = {
            VoiceIntent.CHAT: handle_chat,
            VoiceIntent.SEARCH: handle_search,
            VoiceIntent.KIDS: handle_kids,
            VoiceIntent.PLAYLIST: handle_playlist,
            VoiceIntent.CONTENT_QUERY: handle_search,
            VoiceIntent.WEB_SEARCH: handle_search,
        }
        # Handlers that only need transcript
        simple_handlers = {
            VoiceIntent.NAVIGATION: handle_navigation,
            VoiceIntent.PLAYBACK: handle_playback,
            VoiceIntent.SCROLL: handle_scroll,
            VoiceIntent.CONTROL: handle_control,
            VoiceIntent.DISPLAY_CHANNELS: handle_navigation,
        }
        if intent in context_handlers:
            return await context_handlers[intent](transcript, context)
        if intent in simple_handlers:
            return await simple_handlers[intent](transcript, language=self.language)
        return await handle_chat(transcript, context)
