"""
Wake Word Detection Service Proxy - Backend-only credential management

This module provides a secure proxy for wake word detection through Picovoice.
The mobile app calls this endpoint with an OAuth token, never directly accessing Picovoice.
Backend credentials are managed securely and never exposed to the client.
"""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from pydantic import BaseModel, Field
import aiohttp
import os
import logging
from typing import Optional
from app.core.security import verify_oauth_token, get_current_user

router = APIRouter(prefix="/api/v1/wake-word", tags=["wake-word"])
logger = logging.getLogger(__name__)


class WakeWordRequest(BaseModel):
    """Request model for wake word detection"""
    language_code: str = Field(default="en", description="Language code (en, he, es)")
    sensitivity: float = Field(default=0.5, ge=0.0, le=1.0, description="Detection sensitivity (0.0-1.0)")


class WakeWordResponse(BaseModel):
    """Response model for wake word detection"""
    detected: bool = Field(description="Whether wake word was detected")
    confidence: float = Field(description="Detection confidence (0.0-1.0)")
    wake_word: Optional[str] = Field(default=None, description="Detected wake word phrase")


@router.post("/detect", response_model=WakeWordResponse)
async def detect_wake_word(
    file: UploadFile = File(...),
    language_code: str = "en",
    sensitivity: float = 0.5,
    current_user=Depends(verify_oauth_token),
) -> WakeWordResponse:
    """
    Detect wake word in audio stream using Picovoice API.

    Backend-only credential access ensures mobile app never handles access keys.

    Args:
        file: Audio file (WAV format recommended)
        language_code: Language code (en, he, es)
        sensitivity: Detection sensitivity (0.0-1.0)
        current_user: Verified OAuth token user

    Returns:
        WakeWordResponse with detection result and confidence

    Raises:
        HTTPException: If detection fails or credentials missing
    """

    # Get Picovoice access key from backend environment (NEVER exposed to client)
    picovoice_key = os.getenv('PICOVOICE_ACCESS_KEY')
    if not picovoice_key:
        logger.error("[WakeWord] Picovoice access key not configured")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Wake word detection service temporarily unavailable"
        )

    # Language code to Picovoice model mapping
    model_mappings = {
        "en": "en_US",
        "he": "he_IL",
        "es": "es_ES",
    }

    model_code = model_mappings.get(language_code, "en_US")

    try:
        # Read audio file
        audio_data = await file.read()
        if not audio_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Empty audio file"
            )

        # Call Picovoice Leopard (speech recognition) endpoint
        # Note: Wake word detection typically uses Porcupine, but here we simulate with Leopard
        async with aiohttp.ClientSession() as session:
            # Picovoice API endpoint for wake word/keyword spotting
            url = "https://api.picovoice.ai/v1/detect"

            headers = {
                "AccessKey": picovoice_key,
            }

            files = {
                "audio_file": ("audio.wav", audio_data, "audio/wav"),
                "language_model": (None, model_code),
                "sensitivity": (None, str(sensitivity)),
            }

            async with session.post(url, headers=headers, data=files) as response:
                if response.status != 200:
                    error_text = await response.text()
                    logger.error(f"[WakeWord] Picovoice error: {response.status} - {error_text}")
                    raise HTTPException(
                        status_code=status.HTTP_502_BAD_GATEWAY,
                        detail="Wake word detection failed"
                    )

                result = await response.json()

                # Parse Picovoice response
                detected = result.get("detected", False)
                confidence = result.get("confidence", 0.0)
                wake_word = result.get("keyword", None) if detected else None

                # Log successful detection (no PII)
                logger.info(
                    f"[WakeWord] Detection complete for user {current_user.id}: detected={detected}, confidence={confidence}",
                    extra={"language": language_code, "sensitivity": sensitivity}
                )

                return WakeWordResponse(
                    detected=detected,
                    confidence=confidence,
                    wake_word=wake_word
                )

    except aiohttp.ClientError as e:
        logger.error(f"[WakeWord] Network error calling Picovoice: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Wake word detection service unavailable"
        )
    except Exception as e:
        logger.error(f"[WakeWord] Unexpected error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Wake word detection processing error"
        )


@router.get("/models")
async def get_available_models(current_user=Depends(verify_oauth_token)):
    """
    Get list of available wake word detection models.

    Returns cached list of supported languages and models.
    """

    models = {
        "en_US": {
            "name": "English (US)",
            "language": "en",
            "description": "English wake word detection for US English"
        },
        "he_IL": {
            "name": "Hebrew (Israel)",
            "language": "he",
            "description": "Hebrew wake word detection for Israeli Hebrew"
        },
        "es_ES": {
            "name": "Spanish (Spain)",
            "language": "es",
            "description": "Spanish wake word detection for Spain Spanish"
        }
    }

    logger.info(f"[WakeWord] Retrieved model list for user {current_user.id}")
    return models


@router.get("/health")
async def health_check():
    """Health check endpoint for wake word detection service"""
    picovoice_key = os.getenv('PICOVOICE_ACCESS_KEY')

    return {
        "status": "healthy" if picovoice_key else "degraded",
        "service": "wake_word_proxy",
        "credentials_configured": bool(picovoice_key)
    }
