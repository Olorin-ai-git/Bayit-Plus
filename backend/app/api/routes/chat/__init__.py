"""
Chat API Module

Modularized chat API service for voice assistant, transcription, TTS,
and content resolution.

Package structure:
- router.py - Main router combining all endpoints (53 lines)
- messaging.py - Chat message and conversation endpoints (175 lines)
- content_resolution.py - Hebronics, content resolution, voice search (140 lines)
- audio.py - Speech-to-text transcription endpoints (145 lines)
- tts.py - Text-to-speech conversion endpoints (102 lines)
- sfx.py - Sound effect generation endpoints (117 lines)
- webhooks.py - External service webhook handlers (110 lines)
- services.py - Business logic and service functions
- models.py - Pydantic request/response models
- helpers.py - Utility functions
- prompts.py - System prompts for different languages

Endpoints (12 total):
- POST / - Send message to AI assistant
- GET /{conversation_id} - Get conversation history
- DELETE /{conversation_id} - Clear conversation
- POST /hebronics - Process Hebrew-English mixed input
- POST /resolve-content - Resolve content items by name
- POST /voice-search - Voice search with Hebronics support
- POST /transcribe - Transcribe audio to text
- GET /transcription/{id} - Get transcription status
- POST /text-to-speech - Convert text to speech
- POST /sound-effect/{gesture} - Get wizard gesture SFX
- POST /sound-effect - Generate custom SFX
- POST /webhook/elevenlabs - Handle ElevenLabs webhooks
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
