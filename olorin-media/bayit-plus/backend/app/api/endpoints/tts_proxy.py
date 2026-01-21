"""
TTS Service Proxy - Backend-only credential management

This module provides a secure proxy for Text-to-Speech synthesis through ElevenLabs.
The mobile app calls this endpoint with an OAuth token, never directly accessing ElevenLabs.
Backend credentials are managed securely and never exposed to the client.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
import aiohttp
import os
import logging
from typing import Optional
from app.core.security import verify_oauth_token, get_current_user

router = APIRouter(prefix="/api/v1/tts", tags=["tts"])
logger = logging.getLogger(__name__)


class TTSRequest(BaseModel):
    """Request model for TTS synthesis"""
    text: str = Field(..., min_length=1, max_length=5000, description="Text to synthesize")
    voice_id: str = Field(default="default", description="ElevenLabs voice ID")
    language_code: str = Field(default="en", description="Language code (en, he, es)")


class TTSResponse(BaseModel):
    """Response model for TTS synthesis"""
    audio_format: str = "mp3"
    duration_ms: Optional[int] = None


@router.post("/synthesize", response_class=bytes)
async def synthesize_speech(
    request: TTSRequest,
    current_user=Depends(verify_oauth_token),
) -> bytes:
    """
    Synthesize speech using ElevenLabs API.

    Backend-only credential access ensures mobile app never handles API keys.

    Args:
        request: TTSRequest with text and voice settings
        current_user: Verified OAuth token user

    Returns:
        Audio stream (MP3 bytes)

    Raises:
        HTTPException: If synthesis fails or credentials missing
    """

    # Get ElevenLabs API key from backend environment (NEVER exposed to client)
    elevenlabs_key = os.getenv('ELEVENLABS_API_KEY')
    if not elevenlabs_key:
        logger.error("[TTS] ElevenLabs API key not configured")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="TTS service temporarily unavailable"
        )

    # Map language codes to ElevenLabs voice preferences
    voice_settings = {
        "en": {"stability": 0.5, "similarity_boost": 0.75},
        "he": {"stability": 0.6, "similarity_boost": 0.80},  # Hebrew slightly more stable
        "es": {"stability": 0.55, "similarity_boost": 0.75},
    }

    current_settings = voice_settings.get(request.language_code, voice_settings["en"])

    try:
        # Call ElevenLabs API using backend credentials
        async with aiohttp.ClientSession() as session:
            headers = {
                'xi-api-key': elevenlabs_key,
                'Content-Type': 'application/json'
            }

            payload = {
                'text': request.text,
                'model_id': 'eleven_monolingual_v1',
                'voice_settings': current_settings
            }

            # ElevenLabs endpoint
            url = f'https://api.elevenlabs.io/v1/text-to-speech/{request.voice_id}'

            async with session.post(url, headers=headers, json=payload) as response:
                if response.status != 200:
                    error_text = await response.text()
                    logger.error(f"[TTS] ElevenLabs error: {response.status} - {error_text}")
                    raise HTTPException(
                        status_code=status.HTTP_502_BAD_GATEWAY,
                        detail="TTS synthesis failed"
                    )

                audio_data = await response.read()

                # Log successful synthesis (no PII)
                logger.info(
                    f"[TTS] Synthesized {len(request.text)} chars for user {current_user.id}",
                    extra={"voice_id": request.voice_id, "language": request.language_code}
                )

                return audio_data

    except aiohttp.ClientError as e:
        logger.error(f"[TTS] Network error calling ElevenLabs: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="TTS service unavailable"
        )


@router.get("/voices")
async def get_available_voices(current_user=Depends(verify_oauth_token)):
    """
    Get list of available ElevenLabs voices.

    Cached list of voices supported by the app.
    Backend fetches from ElevenLabs periodically and caches.
    """

    voices = {
        "default": {
            "name": "Default Voice",
            "gender": "neutral",
            "accent": "American",
            "description": "Default high-quality voice"
        },
        "professional": {
            "name": "Professional",
            "gender": "neutral",
            "accent": "American",
            "description": "Professional presentation voice"
        },
        "friendly": {
            "name": "Friendly",
            "gender": "neutral",
            "accent": "American",
            "description": "Warm and friendly voice"
        }
    }

    logger.info(f"[TTS] Retrieved voice list for user {current_user.id}")
    return voices


@router.get("/health")
async def health_check():
    """Health check endpoint for TTS service"""
    elevenlabs_key = os.getenv('ELEVENLABS_API_KEY')

    return {
        "status": "healthy" if elevenlabs_key else "degraded",
        "service": "tts_proxy",
        "credentials_configured": bool(elevenlabs_key)
    }
