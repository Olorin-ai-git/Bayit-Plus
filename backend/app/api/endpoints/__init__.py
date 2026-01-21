"""
API Endpoint Proxies - Backend-only credential management

This package contains secure proxy endpoints for third-party service calls.
All third-party API credentials are managed exclusively in the backend.
Mobile app never directly accesses third-party services.

Includes:
- TTS (Text-to-Speech) via ElevenLabs
- Wake Word Detection via Picovoice
- Analytics Tracking
- Voice Command Processing (user commands)
"""

from app.api.endpoints.tts_proxy import router as tts_router
from app.api.endpoints.wake_word_proxy import router as wake_word_router
from app.api.endpoints.analytics_proxy import router as analytics_router
from app.api.endpoints.voice_proxy import router as voice_router

__all__ = ["tts_router", "wake_word_router", "analytics_router", "voice_router"]
