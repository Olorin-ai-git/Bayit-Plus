"""Intent Router - routes voice intents to handlers with embedding fallback and multi-turn context."""

import time
from typing import Optional, Dict, Any
import uuid

from app.core.logging_config import get_logger
from .models import VoiceResponse, VoiceAction, VoiceGesture, VoiceIntent, TurnContext, ConversationTurns
from .context import VoiceContext
from .embedding_cache import embedding_classifier
from .intent_keywords import (
    KIDS_KEYWORDS, NAVIGATION_KEYWORDS, SEARCH_KEYWORDS, PLAYBACK_KEYWORDS,
    SCROLL_KEYWORDS, CONTROL_KEYWORDS, CONTENT_QUERY_KEYWORDS,
    DISPLAY_CHANNELS_KEYWORDS, WEB_SEARCH_KEYWORDS,
    is_play_content_request, clean_play_prefix,
)
from .playlist_keywords import is_playlist_request
from .channel_keywords import is_channel_request, normalize_number_words
from .podcast_radio_keywords import is_podcast_request, is_radio_request, is_audiobook_request
from .intent_handlers import (
    handle_chat, handle_search, handle_kids, handle_play_content,
    handle_playlist, handle_navigation, handle_playback, handle_scroll,
    handle_control, get_intent_gesture,
)

logger = get_logger(__name__)

_ENTITY_KEYS = ("title", "name", "channel", "destination", "query")


class IntentRouter:
    """Routes voice intents to appropriate handlers."""

    def __init__(
        self,
        language: str = "en",
        platform: str = "web",
        user_id: Optional[str] = None,
        conversation_id: Optional[str] = None,
        turns: Optional[list] = None,
    ):
        self.language = language
        self.platform = platform
        self.user_id = user_id
        self.conversation_id = conversation_id or f"conv-{uuid.uuid4().hex[:12]}"
        self.context = ConversationTurns(turns=turns or [])

    async def process_and_route(
        self, transcript: str, trigger_type: str = "manual"
    ) -> VoiceResponse:
        """Process transcript, classify intent, and route to appropriate handler."""
        self._play_content_query = None
        resolved_entity = self.context.resolve_reference(transcript)
        if resolved_entity:
            logger.info("Resolved reference", extra={"entity": resolved_entity, "transcript": transcript})

        intent, confidence = await self._classify_intent(transcript)
        logger.info(
            "Intent classified",
            extra={"user_id": self.user_id, "intent": intent.value,
                   "confidence": confidence, "language": self.language},
        )

        voice_ctx = await VoiceContext.from_request(
            user_id=self.user_id, language=self.language, platform=self.platform,
            conversation_id=self.conversation_id, load_user=True,
            load_family_controls=(intent == VoiceIntent.KIDS),
        )
        response_data = await self._route_intent(intent, transcript, voice_ctx)

        # Record turn for multi-turn context
        action = response_data.get("action")
        self.context.add_turn(TurnContext(
            transcript=transcript, intent=intent.value,
            action_type=action.get("type") if action else None,
            entity=self._extract_entity(response_data), timestamp=time.time(),
        ))

        gesture_data = get_intent_gesture(intent.value)
        return VoiceResponse(
            intent=intent.value,
            spoken_response=response_data.get("spoken_response", ""),
            action=VoiceAction(**action) if action else None,
            conversation_id=self.conversation_id,
            confidence=confidence,
            gesture=VoiceGesture(**gesture_data) if gesture_data else None,
        )

    async def _classify_intent(self, transcript: str) -> tuple[VoiceIntent, float]:
        """Classify intent from transcript using keyword patterns then embedding fallback."""
        transcript_lower = transcript.lower().strip()

        # Playlist - checked first to avoid "play my playlist" hitting play-content
        if is_playlist_request(transcript_lower, self.language):
            return VoiceIntent.PLAYLIST, 0.92
        # "play [content]" - movies, channels, podcasts, radio
        if is_play_content_request(transcript_lower):
            self._play_content_query = clean_play_prefix(transcript)
            return VoiceIntent.PLAYBACK, 0.9
        # Bare channel references: "channel 13", "channel thirteen"
        if is_channel_request(transcript_lower):
            self._play_content_query = normalize_number_words(transcript.strip().rstrip(".,!?;:"))
            return VoiceIntent.PLAYBACK, 0.9
        # Bare podcast/radio/audiobook
        if (is_podcast_request(transcript_lower) or is_radio_request(transcript_lower)
                or is_audiobook_request(transcript_lower)):
            self._play_content_query = transcript.strip().rstrip(".,!?;:")
            return VoiceIntent.PLAYBACK, 0.9

        # Keyword-based classification (ordered by priority)
        kids_kw = KIDS_KEYWORDS.get(self.language, KIDS_KEYWORDS["en"])
        if any(kw in transcript_lower for kw in kids_kw):
            return VoiceIntent.KIDS, 0.9
        # Search before navigation - category words overlap
        if any(kw in transcript_lower for kw in SEARCH_KEYWORDS):
            return VoiceIntent.SEARCH, 0.8
        if any(kw in transcript_lower for kw in NAVIGATION_KEYWORDS):
            return VoiceIntent.NAVIGATION, 0.95
        if any(kw in transcript_lower for kw in PLAYBACK_KEYWORDS):
            return VoiceIntent.PLAYBACK, 0.9
        if any(kw in transcript_lower for kw in SCROLL_KEYWORDS):
            return VoiceIntent.SCROLL, 0.85
        if any(kw in transcript_lower for kw in CONTROL_KEYWORDS):
            return VoiceIntent.CONTROL, 0.9

        cq_kw = CONTENT_QUERY_KEYWORDS.get(self.language, CONTENT_QUERY_KEYWORDS["en"])
        if any(kw in transcript_lower for kw in cq_kw):
            return VoiceIntent.CONTENT_QUERY, 0.85
        dc_kw = DISPLAY_CHANNELS_KEYWORDS.get(self.language, DISPLAY_CHANNELS_KEYWORDS["en"])
        if any(kw in transcript_lower for kw in dc_kw):
            return VoiceIntent.DISPLAY_CHANNELS, 0.9
        ws_kw = WEB_SEARCH_KEYWORDS.get(self.language, WEB_SEARCH_KEYWORDS["en"])
        if any(kw in transcript_lower for kw in ws_kw):
            return VoiceIntent.WEB_SEARCH, 0.85

        # Embedding classifier fallback
        if embedding_classifier.is_initialized:
            try:
                transcript_emb = await embedding_classifier.embed_transcript(transcript)
                emb_result = embedding_classifier.classify(transcript_emb)
                if emb_result:
                    logger.info(
                        "Embedding classifier matched",
                        extra={"intent": emb_result[0].value, "similarity": emb_result[1]},
                    )
                    return emb_result
            except Exception as exc:
                logger.warning("Embedding classification failed", extra={"error": str(exc)})

        return VoiceIntent.CHAT, 0.5

    def _extract_entity(self, response_data: dict) -> Optional[str]:
        """Extract the primary entity from a response for context tracking."""
        action = response_data.get("action")
        if not action:
            return None
        payload = action.get("payload", {})
        for key in _ENTITY_KEYS:
            if key in payload:
                return str(payload[key])
        return None

    async def _route_intent(
        self, intent: VoiceIntent, transcript: str, context: VoiceContext
    ) -> Dict[str, Any]:
        """Route intent to appropriate handler."""
        if intent == VoiceIntent.PLAYBACK and self._play_content_query:
            return await handle_play_content(self._play_content_query, context)
        context_handlers = {
            VoiceIntent.CHAT: handle_chat, VoiceIntent.SEARCH: handle_search,
            VoiceIntent.KIDS: handle_kids, VoiceIntent.PLAYLIST: handle_playlist,
            VoiceIntent.CONTENT_QUERY: handle_search, VoiceIntent.WEB_SEARCH: handle_search,
        }
        simple_handlers = {
            VoiceIntent.NAVIGATION: handle_navigation, VoiceIntent.PLAYBACK: handle_playback,
            VoiceIntent.SCROLL: handle_scroll, VoiceIntent.CONTROL: handle_control,
            VoiceIntent.DISPLAY_CHANNELS: handle_navigation,
        }
        if intent in context_handlers:
            return await context_handlers[intent](transcript, context)
        if intent in simple_handlers:
            return await simple_handlers[intent](transcript, language=self.language)
        return await handle_chat(transcript, context)
