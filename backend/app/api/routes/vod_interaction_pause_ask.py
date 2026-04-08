"""
Pause & Ask API Route

Transcription endpoint for Pause & Ask voice input. The synchronous
pause-ask exchange has been replaced by the unified job endpoints at
/api/v1/pause-ask/jobs.
"""

from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, status
from pydantic import BaseModel

from app.core.config import settings
from app.services.zeh_ani.enhanced_asr_service import EnhancedASRService
from app.core.logging_config import get_logger
from app.core.rate_limiter import RATE_LIMITS, limiter
from app.core.security import get_current_user
from app.models.user import User
from app.models.vod_interaction import VODInteractionSession

logger = get_logger(__name__)

router = APIRouter(
    prefix="/vod-interactions",
    tags=["VOD Interactions - Pause & Ask"],
)


class TranscriptionResponseModel(BaseModel):
    """Response model for audio transcription."""

    transcript: str


@router.post(
    "/sessions/{session_id}/transcribe",
    response_model=TranscriptionResponseModel,
    status_code=status.HTTP_200_OK,
)
@limiter.limit(RATE_LIMITS.get("vod_interaction_transcribe", "20/minute"))
async def transcribe_audio(
    request: Request,
    session_id: str,
    audio: UploadFile,
    current_user: User = Depends(get_current_user),
):
    """
    Transcribe recorded audio to text for Pause & Ask voice input.

    Accepts WAV audio via multipart upload, transcribes using the
    enhanced ASR service, and returns the text transcript.
    """
    if not settings.VOD_INTERACTION_PAUSE_ASK_ENABLED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Pause & Ask feature is disabled",
        )

    session = await VODInteractionSession.get(session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found",
        )
    if session.user_id != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Session does not belong to this user",
        )
    if session.status != "active":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Session is not active: {session.status}",
        )

    try:
        audio_data = await audio.read()
        if not audio_data:
            return TranscriptionResponseModel(transcript="")

        asr_service = EnhancedASRService()
        result = await asr_service.transcribe_child_speech(
            audio_data=audio_data,
        )
        transcript = result.get("text", "")

        logger.info(
            "Audio transcribed for Pause & Ask",
            extra={
                "session_id": session_id,
                "transcript_length": len(transcript),
            },
        )

        return TranscriptionResponseModel(transcript=transcript)

    except Exception as exc:
        logger.error(
            "Audio transcription failed",
            extra={"session_id": session_id, "error": str(exc)},
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Audio transcription failed",
        )
