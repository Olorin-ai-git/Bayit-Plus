"""
Voice Service Pydantic Models
Type-safe request and response models for voice interactions
"""

from typing import Optional, Dict, Any
from enum import Enum
from pydantic import BaseModel, Field


class VoiceIntent(str, Enum):
    """Voice intent types"""
    CHAT = "CHAT"
    SEARCH = "SEARCH"
    NAVIGATION = "NAVIGATION"
    PLAYBACK = "PLAYBACK"
    SCROLL = "SCROLL"
    CONTROL = "CONTROL"


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
