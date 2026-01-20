"""
Chat Audio Endpoints - Speech-to-text transcription

Endpoints for audio transcription using ElevenLabs Speech-to-Text API.
"""

from typing import Optional

import httpx
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form

from app.core.config import settings
from app.core.security import get_current_active_user
from app.models.user import User

from .models import TranscriptionResponse, TranscriptionStatusResponse
from .services import pending_transcriptions


router = APIRouter()

# ElevenLabs STT API endpoint
ELEVENLABS_STT_URL = "https://api.elevenlabs.io/v1/speech-to-text"

# Allowed audio content types
ALLOWED_AUDIO_TYPES = [
    "audio/webm",
    "audio/wav",
    "audio/mp3",
    "audio/mpeg",
    "audio/ogg",
    "audio/m4a"
]


@router.post("/transcribe", response_model=TranscriptionResponse)
async def transcribe_audio(
    audio: UploadFile = File(...),
    language: Optional[str] = Form(None),
    current_user: User = Depends(get_current_active_user),
) -> TranscriptionResponse:
    """Transcribe audio using ElevenLabs Speech-to-Text with language hint."""
    if audio.content_type and audio.content_type not in ALLOWED_AUDIO_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported audio format. Allowed: {', '.join(ALLOWED_AUDIO_TYPES)}",
        )

    try:
        content = await audio.read()

        language_code = (language or "he").lower()
        print(f"[STT] Received language parameter from client: {language}")
        print(f"[STT] Transcribing audio with language hint: {language_code}")

        request_data = {
            "model_id": "scribe_v2",
            "language_code": language_code,
        }

        print(f"[STT] Request data being sent to ElevenLabs: {request_data}")

        async with httpx.AsyncClient() as http_client:
            response = await http_client.post(
                ELEVENLABS_STT_URL,
                headers={
                    "xi-api-key": settings.ELEVENLABS_API_KEY,
                },
                files={
                    "file": (
                        audio.filename or "recording.webm",
                        content,
                        audio.content_type
                    ),
                },
                data=request_data,
                timeout=60.0,
            )

            if response.status_code != 200:
                error_detail = response.text
                print(f"[STT] ElevenLabs API error {response.status_code}: {error_detail}")
                raise HTTPException(
                    status_code=500,
                    detail=f"ElevenLabs API error: {error_detail}",
                )

            result = response.json()
            transcribed_text = result.get("text", "").strip()
            detected_language = language_code.lower()

            print(f"[STT] ElevenLabs response language: {result.get('language')}")
            print(f"[STT] Using language hint as authoritative: {detected_language}")
            print(
                f"[STT] Transcription result: text='{transcribed_text}', "
                f"final_language='{detected_language}'"
            )
            print(f"[STT] Full API response: {result}")

            if not transcribed_text:
                raise HTTPException(
                    status_code=400,
                    detail="Could not transcribe audio. Please try again.",
                )

            return TranscriptionResponse(
                text=transcribed_text,
                language=detected_language
            )

    except httpx.TimeoutException:
        raise HTTPException(
            status_code=504,
            detail="Transcription timed out. Please try again."
        )
    except httpx.RequestError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Transcription service error: {str(e)}"
        )


@router.get("/transcription/{transcription_id}", response_model=TranscriptionStatusResponse)
async def get_transcription_status(
    transcription_id: str,
    current_user: User = Depends(get_current_active_user),
) -> TranscriptionStatusResponse:
    """Check the status of a pending transcription."""
    if transcription_id not in pending_transcriptions:
        raise HTTPException(
            status_code=404,
            detail="Transcription not found"
        )

    data = pending_transcriptions[transcription_id]

    return TranscriptionStatusResponse(
        transcription_id=transcription_id,
        status=data.get("status", "unknown"),
        text=data.get("text"),
        language_code=data.get("language_code"),
        audio_duration=data.get("audio_duration"),
        error=data.get("error"),
        processed=data.get("processed")
    )
