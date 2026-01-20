"""
Chat TTS Endpoints - Text-to-speech conversion

Endpoints for text-to-speech conversion using ElevenLabs APIs.
"""

import httpx
from app.core.config import settings
from app.core.security import get_current_active_user
from app.models.user import User
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse

from .models import TTSRequest

router = APIRouter()

# ElevenLabs TTS API endpoint
ELEVENLABS_TTS_URL = "https://api.elevenlabs.io/v1/text-to-speech"

# TTS constraints
TTS_MAX_TEXT_LENGTH = 5000


@router.post("/text-to-speech")
async def text_to_speech(
    request: TTSRequest,
    current_user: User = Depends(get_current_active_user),
) -> StreamingResponse:
    """Convert text to speech using ElevenLabs Text-to-Speech API."""
    print(
        f"[TTS] Text-to-speech request: language='{request.language}', "
        f"text='{request.text[:100]}'..."
    )

    if not request.text or not request.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")

    if len(request.text) > TTS_MAX_TEXT_LENGTH:
        raise HTTPException(
            status_code=400,
            detail=f"Text is too long (max {TTS_MAX_TEXT_LENGTH} characters)",
        )

    voice_id = request.voice_id or settings.ELEVENLABS_DEFAULT_VOICE_ID
    print(f"[TTS] Using voice_id='{voice_id}', language='{request.language}'")

    try:
        tts_url = f"{ELEVENLABS_TTS_URL}/{voice_id}/stream"

        # Use eleven_v3 model for Hebrew and Spanish for better quality
        model_to_use = request.model_id
        if request.language in ["he", "es"]:
            model_to_use = "eleven_v3"
            print(f"[TTS] Using eleven_v3 model for {request.language} text")

        request_body = {
            "text": request.text,
            "model_id": model_to_use,
            "voice_settings": {"stability": 0.5, "similarity_boost": 0.75},
        }

        async with httpx.AsyncClient() as http_client:
            response = await http_client.post(
                tts_url,
                headers={
                    "xi-api-key": settings.ELEVENLABS_API_KEY,
                    "Content-Type": "application/json",
                },
                json=request_body,
                timeout=60.0,
            )

            if response.status_code != 200:
                error_detail = response.text or "Unknown error"
                print(f"[TTS] ElevenLabs API error: {error_detail}")
                raise HTTPException(
                    status_code=500,
                    detail=f"ElevenLabs TTS error: {error_detail}",
                )

            return StreamingResponse(
                iter([response.content]),
                media_type="audio/mpeg",
                headers={
                    "Content-Disposition": 'inline; filename="tts.mp3"',
                    "Cache-Control": "no-store",
                },
            )

    except httpx.TimeoutException:
        raise HTTPException(
            status_code=504, detail="TTS service timed out. Please try again."
        )
    except httpx.RequestError as e:
        raise HTTPException(status_code=500, detail=f"TTS service error: {str(e)}")
