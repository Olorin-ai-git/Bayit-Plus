"""
Health check endpoints for Bayit+ Backend.

Provides health status for monitoring systems and load balancers.
"""

from fastapi import APIRouter

from app.core.config import settings

router = APIRouter(tags=["health"])


@router.get("/health")
async def health_check() -> dict:
    """
    Basic health check endpoint.

    Returns:
        Basic health status with app name.
    """
    return {"status": "healthy", "app": settings.APP_NAME}


@router.get("/health/live-translation")
async def live_translation_health_check() -> dict:
    """
    Health check for live translation services.

    Returns status of:
    - Speech-to-text provider (Google, Whisper, or ElevenLabs)
    - Translation provider (Google, OpenAI, or Claude)
    """
    from app.services.live_translation_service import (
        GOOGLE_AVAILABLE,
        OPENAI_AVAILABLE,
        ELEVENLABS_AVAILABLE,
        ANTHROPIC_AVAILABLE,
    )

    stt_provider = settings.SPEECH_TO_TEXT_PROVIDER
    translation_provider = settings.LIVE_TRANSLATION_PROVIDER

    # Check provider availability
    stt_available = False
    if stt_provider == "google":
        stt_available = GOOGLE_AVAILABLE
    elif stt_provider == "whisper":
        stt_available = OPENAI_AVAILABLE
    elif stt_provider == "elevenlabs":
        stt_available = ELEVENLABS_AVAILABLE

    translation_available = False
    if translation_provider == "google":
        translation_available = GOOGLE_AVAILABLE
    elif translation_provider == "openai":
        translation_available = OPENAI_AVAILABLE
    elif translation_provider == "claude":
        translation_available = ANTHROPIC_AVAILABLE

    healthy = stt_available and translation_available

    return {
        "status": "healthy" if healthy else "degraded",
        "stt_provider": stt_provider,
        "stt_available": stt_available,
        "translation_provider": translation_provider,
        "translation_available": translation_available,
        "providers": {
            "google_cloud": GOOGLE_AVAILABLE,
            "openai": OPENAI_AVAILABLE,
            "elevenlabs": ELEVENLABS_AVAILABLE,
            "anthropic": ANTHROPIC_AVAILABLE,
        },
    }
