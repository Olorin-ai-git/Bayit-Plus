"""
Intent Router Service
Routes voice intents to appropriate handlers and generates responses

Handlers:
- CHAT: Natural language chat via Claude API
- SEARCH: Content search
- NAVIGATION: Page routing
- PLAYBACK: Content playback control
- SCROLL: UI scrolling
- CONTROL: System controls
"""

from typing import Optional, Dict, Any
import uuid

from .models import VoiceResponse, VoiceAction, VoiceGesture, VoiceIntent
from .intent_handlers import (
    handle_chat,
    handle_search,
    handle_navigation,
    handle_playback,
    handle_scroll,
    handle_control,
    get_intent_gesture,
)


class IntentRouter:
    """Routes voice intents to appropriate handlers"""

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
        """Generate unique conversation ID"""
        return f"conv-{uuid.uuid4().hex[:12]}"

    async def process_and_route(
        self,
        transcript: str,
        trigger_type: str = "manual"
    ) -> VoiceResponse:
        """
        Process transcript and route to appropriate handler

        Args:
            transcript: Voice input text
            trigger_type: 'manual' or 'wake-word'

        Returns:
            Unified voice response with intent, action, and gesture
        """

        # Classify intent (using Hebrew command patterns from frontend)
        intent, confidence = self._classify_intent(transcript)

        # Route to handler
        response_data = await self._route_intent(intent, transcript)

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
        """
        Classify intent from transcript
        Uses Hebrew command patterns similar to voiceCommandProcessor.ts

        Returns:
            (intent, confidence_score)
        """

        transcript_lower = transcript.lower().strip()

        # Navigation patterns
        navigation_keywords = [
            'בית', 'חזור הביתה', 'עמוד ראשי',
            'ערוצים', 'שידור חי', 'טלוויזיה',
            'סרטים', 'סדרות', 'תוכן', 'וידאו',
            'רדיו', 'פודקאסטים', 'מועדפים'
        ]
        if any(kw in transcript_lower for kw in navigation_keywords):
            return VoiceIntent.NAVIGATION, 0.95

        # Search patterns
        search_keywords = [
            'חפש', 'מצא', 'איפה', 'הצג',
            'אקשן', 'קומדיה', 'דרמה', 'דוקומנטרים'
        ]
        if any(kw in transcript_lower for kw in search_keywords):
            return VoiceIntent.SEARCH, 0.8

        # Playback patterns
        playback_keywords = [
            'נגן', 'הפעל', 'התחל', 'השהה', 'עצור', 'המשך'
        ]
        if any(kw in transcript_lower for kw in playback_keywords):
            return VoiceIntent.PLAYBACK, 0.9

        # Scroll patterns
        scroll_keywords = [
            'גלול', 'למטה', 'למעלה', 'עוד', 'הבא', 'הקודם'
        ]
        if any(kw in transcript_lower for kw in scroll_keywords):
            return VoiceIntent.SCROLL, 0.85

        # Control patterns
        control_keywords = [
            'חזק', 'שקט', 'השתק', 'שפה', 'עזרה'
        ]
        if any(kw in transcript_lower for kw in control_keywords):
            return VoiceIntent.CONTROL, 0.9

        # Default to CHAT for natural language
        return VoiceIntent.CHAT, 0.5

    async def _route_intent(
        self,
        intent: VoiceIntent,
        transcript: str
    ) -> Dict[str, Any]:
        """Route intent to appropriate handler"""

        if intent == VoiceIntent.CHAT:
            return await handle_chat(transcript)
        elif intent == VoiceIntent.SEARCH:
            return await handle_search(transcript)
        elif intent == VoiceIntent.NAVIGATION:
            return await handle_navigation(transcript)
        elif intent == VoiceIntent.PLAYBACK:
            return await handle_playback(transcript)
        elif intent == VoiceIntent.SCROLL:
            return await handle_scroll(transcript)
        elif intent == VoiceIntent.CONTROL:
            return await handle_control(transcript)
        else:
            return await handle_chat(transcript)
