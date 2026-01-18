"""
Chat API Module

Modularized chat API service for voice assistant, transcription, TTS,
and content resolution.

Package structure:
- router.py - FastAPI endpoint handlers
- services.py - Business logic and service functions
- models.py - Pydantic request/response models
- helpers.py - Utility functions
- prompts.py - System prompts for different languages
"""

from .router import router
from .models import (
    ChatRequest,
    ChatResponse,
    TranscriptionResponse,
    TTSRequest,
    HebronicsRequest,
    HebronicsResponse,
    ContentItemRequest,
    ResolveContentRequest,
    ResolvedContentItem,
    ResolveContentResponse,
    VoiceSearchRequest,
    VoiceSearchResponse,
    ElevenLabsWebhookEvent,
    WebhookResponse,
    TranscriptionStatusResponse,
    SFXRequest,
    SFXResponse,
)

__all__ = [
    # Router
    "router",
    # Models
    "ChatRequest",
    "ChatResponse",
    "TranscriptionResponse",
    "TTSRequest",
    "HebronicsRequest",
    "HebronicsResponse",
    "ContentItemRequest",
    "ResolveContentRequest",
    "ResolvedContentItem",
    "ResolveContentResponse",
    "VoiceSearchRequest",
    "VoiceSearchResponse",
    "ElevenLabsWebhookEvent",
    "WebhookResponse",
    "TranscriptionStatusResponse",
    "SFXRequest",
    "SFXResponse",
]
