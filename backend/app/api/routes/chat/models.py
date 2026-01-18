"""
Chat API Models - Pydantic request/response models

All Pydantic models for the chat API endpoints.
"""

from typing import Optional
from pydantic import BaseModel


class ChatRequest(BaseModel):
    """Request model for chat messages."""
    message: str
    conversation_id: Optional[str] = None
    context: Optional[dict] = None
    mode: Optional[str] = 'voice_only'
    language: Optional[str] = None


class ChatResponse(BaseModel):
    """Response model for chat messages."""
    message: str
    conversation_id: str
    recommendations: Optional[list] = None
    language: str = "he"

    # Voice-first enhancements
    spoken_response: Optional[str] = None
    action: Optional[dict] = None
    content_ids: Optional[list] = None
    visual_action: Optional[str] = None
    confidence: Optional[float] = None


class TranscriptionResponse(BaseModel):
    """Response model for audio transcription."""
    text: str
    language: str = "he"


class TTSRequest(BaseModel):
    """Request model for text-to-speech."""
    text: str
    voice_id: Optional[str] = None
    language: str = "he"
    model_id: str = "eleven_turbo_v2"


class HebronicsRequest(BaseModel):
    """Request model for Hebronics processing."""
    text: str


class HebronicsResponse(BaseModel):
    """Response model for Hebronics processing."""
    original: str
    normalized: str
    intent: Optional[str] = None
    keywords: list = []
    content_type: Optional[str] = None
    genre: Optional[str] = None
    english_terms: list = []


class ContentItemRequest(BaseModel):
    """Single content item to resolve."""
    name: str
    type: str = "any"


class ResolveContentRequest(BaseModel):
    """Request to resolve multiple content items by name."""
    items: list[ContentItemRequest]
    language: str = "he"


class ResolvedContentItem(BaseModel):
    """Resolved content item with stream info."""
    id: str
    name: str
    type: str
    thumbnail: Optional[str] = None
    stream_url: Optional[str] = None
    matched_name: str
    confidence: float = 1.0


class ResolveContentResponse(BaseModel):
    """Response with resolved content items."""
    items: list[ResolvedContentItem]
    unresolved: list[str] = []
    total_requested: int
    total_resolved: int


class VoiceSearchRequest(BaseModel):
    """Request model for voice search."""
    transcript: str
    language: str = "he"


class VoiceSearchResponse(BaseModel):
    """Response model for voice search."""
    original_transcript: str
    normalized_query: str
    intent: Optional[str] = None
    keywords: list = []
    content_type: Optional[str] = None
    genre: Optional[str] = None
    search_results: list = []


class ElevenLabsWebhookEvent(BaseModel):
    """ElevenLabs webhook event payload."""
    event_type: str
    request_id: Optional[str] = None
    transcription_id: Optional[str] = None
    status: Optional[str] = None
    text: Optional[str] = None
    language_code: Optional[str] = None
    audio_duration: Optional[float] = None
    error: Optional[str] = None
    metadata: Optional[dict] = None


class WebhookResponse(BaseModel):
    """Response for webhook acknowledgment."""
    received: bool = True
    event_type: str
    message: str


class TranscriptionStatusResponse(BaseModel):
    """Response for transcription status check."""
    transcription_id: str
    status: str
    text: Optional[str] = None
    language_code: Optional[str] = None
    audio_duration: Optional[float] = None
    error: Optional[str] = None
    processed: Optional[dict] = None


class SFXRequest(BaseModel):
    """Request for sound effect generation."""
    gesture: str
    custom_description: Optional[str] = None
    duration_seconds: Optional[float] = None


class SFXResponse(BaseModel):
    """Response metadata for SFX."""
    gesture: str
    description: str
    cached: bool
