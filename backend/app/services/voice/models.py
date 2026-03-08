"""
Voice Service Pydantic Models
Type-safe request and response models for voice interactions
"""

import re
from typing import Optional, Dict, Any, List
from enum import Enum
from pydantic import BaseModel, Field, PrivateAttr


class VoiceIntent(str, Enum):
    """Voice intent types"""
    CHAT = "CHAT"
    SEARCH = "SEARCH"
    NAVIGATION = "NAVIGATION"
    PLAYBACK = "PLAYBACK"
    SCROLL = "SCROLL"
    CONTROL = "CONTROL"
    KIDS = "KIDS"
    CONTENT_QUERY = "CONTENT_QUERY"
    DISPLAY_CHANNELS = "DISPLAY_CHANNELS"
    WEB_SEARCH = "WEB_SEARCH"
    PLAYLIST = "PLAYLIST"


class VoiceAction(BaseModel):
    """Voice action payload"""
    type: str = Field(..., description="Action type (navigate, search, playback, etc.)")
    payload: Dict[str, Any] = Field(..., description="Action-specific payload")


class VoiceGesture(BaseModel):
    """Wizard gesture state"""
    gesture: str = Field(..., description="Gesture name (browsing, conjuring, etc.)")
    duration: Optional[int] = Field(None, description="Gesture duration in milliseconds")


class VoiceResponse(BaseModel):
    """Unified voice response model"""
    intent: str = Field(..., description="Classified intent type")
    spoken_response: str = Field(..., description="Text-to-speech response")
    action: Optional[VoiceAction] = Field(None, description="Action to execute")
    conversation_id: str = Field(..., description="Conversation identifier")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Intent classification confidence")
    gesture: Optional[VoiceGesture] = Field(None, description="Wizard gesture")


class UnifiedVoiceRequest(BaseModel):
    """Unified voice request model"""
    transcript: str = Field(..., min_length=1, description="Voice input text")
    language: str = Field("en", description="Language code (en, he, es, etc.)")
    conversation_id: Optional[str] = Field(None, description="Existing conversation ID")
    platform: str = Field("web", description="Platform (web, ios, android, tvos)")
    trigger_type: str = Field("manual", description="Trigger type (manual, wake-word)")


class TurnContext(BaseModel):
    """Single conversation turn for multi-turn context."""
    transcript: str = Field(..., description="User transcript")
    intent: str = Field(..., description="Classified intent type")
    action_type: Optional[str] = Field(None, description="Action type if any")
    entity: Optional[str] = Field(None, description="Resolved entity (channel, title)")
    timestamp: float = Field(..., description="Unix timestamp of turn")


# Patterns for reference resolution across English, Hebrew, and Spanish
_PATTERNS_OTHER: re.Pattern = re.compile(
    r"\b(the other one|the other|האחר|השני|el otro|la otra)\b", re.IGNORECASE
)
_PATTERNS_CHANNEL: re.Pattern = re.compile(
    r"\b(that channel|that show|that movie|הערוץ ההוא|התוכנית ההיא"
    r"|הסרט ההוא|ese canal|esa serie|esa película)\b",
    re.IGNORECASE,
)
_PATTERNS_PRONOUN: re.Pattern = re.compile(
    r"\b(^it$|^this$|^that$|^זה$|^זאת$|^eso$|^esto$)\b", re.IGNORECASE
)
_PATTERNS_PREVIOUS: re.Pattern = re.compile(
    r"\b(back|previous|the last one|הקודם|הקודמת|el anterior|la anterior)\b",
    re.IGNORECASE,
)

_CHANNEL_ACTION_TYPES = frozenset({"channel", "live", "tune"})
_SHOW_ACTION_TYPES = frozenset({"show", "series", "movie", "vod", "episode"})


class ConversationTurns(BaseModel):
    """Sliding window of recent conversation turns."""
    turns: List[TurnContext] = Field(default_factory=list)
    _max_turns: int = PrivateAttr(default=5)

    def add_turn(self, turn: TurnContext) -> None:
        """Append turn, trim to max window size (FIFO)."""
        self.turns.append(turn)
        if len(self.turns) > self._max_turns:
            self.turns = self.turns[-self._max_turns:]

    def get_context_summary(self) -> str:
        """Return single-line summary of all turns."""
        if not self.turns:
            return ""
        parts = []
        for idx, turn in enumerate(self.turns, start=1):
            entity_str = f" '{turn.entity}'" if turn.entity else ""
            parts.append(f"[Turn {idx}: {turn.intent}{entity_str}]")
        return " ".join(parts)

    def _find_entity_by_action_types(
        self, action_types: frozenset[str]
    ) -> Optional[str]:
        """Scan turns in reverse for most recent entity matching action types."""
        for turn in reversed(self.turns):
            if turn.entity and turn.action_type in action_types:
                return turn.entity
        return None

    def _find_most_recent_entity(self) -> Optional[str]:
        """Return the most recent entity of any type."""
        for turn in reversed(self.turns):
            if turn.entity:
                return turn.entity
        return None

    def resolve_reference(self, transcript: str) -> Optional[str]:
        """Resolve anaphoric references using conversation history."""
        if not self.turns:
            return None

        text = transcript.strip()

        if _PATTERNS_OTHER.search(text):
            if len(self.turns) >= 2:
                return self.turns[-2].entity
            return None

        if _PATTERNS_CHANNEL.search(text):
            entity = self._find_entity_by_action_types(_CHANNEL_ACTION_TYPES)
            if entity:
                return entity
            entity = self._find_entity_by_action_types(_SHOW_ACTION_TYPES)
            if entity:
                return entity
            return self._find_most_recent_entity()

        if _PATTERNS_PREVIOUS.search(text):
            if len(self.turns) >= 2:
                return self.turns[-2].entity
            if len(self.turns) == 1:
                return self.turns[0].entity
            return None

        if _PATTERNS_PRONOUN.search(text):
            return self._find_most_recent_entity()

        return None
