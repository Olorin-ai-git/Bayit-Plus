"""
User Dubbing and Subtitle Session Routes

B2C endpoints for Chrome extension with JWT authentication
Supports both audio dubbing and live subtitles
"""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from app.api.dependencies.olorin_tier import require_dubbing, is_demo_portal_request

from datetime import timedelta

from app.core.config import settings
from app.core.logging_config import get_logger
from app.core.security import get_current_active_user
from app.models.dubbing.session import (
    CreateSessionRequest,
    QuotaCheckResponse,
    SessionResponse,
    SessionStatusResponse,
    UsageSyncRequest,
    UsageSyncResponse,
)
from app.models.user import User
from app.services.dubbing.user_dubbing_service import UserDubbingService
from app.services.dubbing.user_quota_service import UserQuotaService
from app.services.voice_management_service import VoiceManagementService

logger = get_logger(__name__)
router = APIRouter()


@router.post("/sessions", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
async def create_dubbing_session(
    http_request: Request,
    request: CreateSessionRequest,
    current_user: User = Depends(get_current_active_user),
):
    """
    Create new dubbing/subtitle session

    **Features**:
    - Audio dubbing (Hebrew → English/Spanish)
    - Live subtitles (real-time translation)
    - Combined mode (dubbing + subtitles)

    **Quota**:
    - Free tier: 5 minutes per day
    - Premium: Unlimited

    **Returns**:
    - session_id: Unique session identifier
    - websocket_url: WebSocket URL for real-time communication
    - quota_remaining_minutes: Remaining quota for today
    - session_type: Enabled features (audio_dubbing, live_subtitles)
    """
    try:
        if not is_demo_portal_request(http_request):
            require_dubbing(current_user)

        # Create dubbing service
        dubbing_service = UserDubbingService(user=current_user)

        # Create session
        session, websocket_url = await dubbing_service.create_session(request)

        # Get remaining quota
        quota_service = UserQuotaService()
        usage_data = await quota_service.get_usage_data(str(current_user.id))

        return SessionResponse(
            session_id=session.session_id,
            websocket_url=websocket_url,
            quota_remaining_minutes=usage_data["daily_minutes_remaining"],
            session_type=session.session_type,
            expires_at=session.created_at + timedelta(minutes=settings.MAX_SESSION_DURATION_MINUTES),
        )

    except ValueError as e:
        logger.warning(
            f"Invalid request for user {current_user.id}: {e}",
            extra={"error": str(e)},
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        logger.error(
            f"Error creating session for user {current_user.id}: {e}",
            exc_info=True,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create dubbing session",
        )


@router.get("/sessions/{session_id}", response_model=SessionStatusResponse)
async def get_session_status(
    session_id: str,
    current_user: User = Depends(get_current_active_user),
):
    """
    Get session status and statistics

    **Returns**:
    - status: active, completed, failed, expired
    - duration_seconds: Session duration
    - audio_chunks_processed: Number of audio chunks processed
    - subtitles_generated: Number of subtitles generated
    - websocket_connected: WebSocket connection status
    """
    try:
        dubbing_service = UserDubbingService(user=current_user)
        session = await dubbing_service.get_session(session_id)

        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Session {session_id} not found",
            )

        return SessionStatusResponse(
            session_id=session.session_id,
            status=session.status,
            duration_seconds=session.duration_seconds,
            audio_chunks_processed=session.audio_chunks_processed,
            subtitles_generated=session.subtitles_generated,
            websocket_connected=session.websocket_connected,
            created_at=session.created_at,
            updated_at=session.updated_at,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            f"Error getting session {session_id} for user {current_user.id}: {e}",
            exc_info=True,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get session status",
        )


@router.delete("/sessions/{session_id}", status_code=status.HTTP_200_OK)
async def end_dubbing_session(
    session_id: str,
    current_user: User = Depends(get_current_active_user),
):
    """
    End dubbing/subtitle session and calculate final usage

    **Returns**:
    - session_id: Session identifier
    - duration_seconds: Actual session duration
    - quota_used_minutes: Minutes deducted from quota
    """
    try:
        dubbing_service = UserDubbingService(user=current_user)
        session = await dubbing_service.get_session(session_id)

        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Session {session_id} not found",
            )

        # Calculate actual duration
        if session.start_time and session.end_time:
            duration_seconds = (session.end_time - session.start_time).total_seconds()
        else:
            duration_seconds = session.duration_seconds

        # End session
        updated_session = await dubbing_service.end_session(
            session_id, duration_seconds
        )

        return {
            "session_id": session_id,
            "duration_seconds": duration_seconds,
            "quota_used_minutes": duration_seconds / 60.0,
            "status": "completed",
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            f"Error ending session {session_id} for user {current_user.id}: {e}",
            exc_info=True,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to end dubbing session",
        )


@router.post("/quota/check", response_model=QuotaCheckResponse)
async def check_quota(
    current_user: User = Depends(get_current_active_user),
):
    """
    Check if user has available quota

    **Returns**:
    - has_quota: True if quota available
    - minutes_used: Minutes used today
    - minutes_total: Total daily quota
    - minutes_remaining: Minutes remaining today
    - is_premium: Premium status (unlimited quota)
    - reset_at: When quota resets (midnight UTC)
    """
    try:
        quota_service = UserQuotaService()
        usage_data = await quota_service.get_usage_data(str(current_user.id))

        return QuotaCheckResponse(
            has_quota=usage_data["daily_minutes_remaining"] > 0
            or usage_data["is_premium"],
            minutes_used=usage_data["daily_minutes_used"],
            minutes_total=usage_data["daily_minutes_total"],
            minutes_remaining=usage_data["daily_minutes_remaining"],
            is_premium=usage_data["is_premium"],
            reset_at=usage_data["reset_at"],
        )

    except Exception as e:
        logger.error(
            f"Error checking quota for user {current_user.id}: {e}",
            exc_info=True,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to check quota",
        )


@router.post("/usage/sync", response_model=UsageSyncResponse)
async def sync_usage(
    request: UsageSyncRequest,
    current_user: User = Depends(get_current_active_user),
):
    """
    Sync usage data between extension and server

    Server is source of truth. Extension syncs every 10 seconds.

    **Returns**:
    - daily_minutes_used: Server-side usage (source of truth)
    - quota_remaining: Minutes remaining
    - is_premium: Premium status
    """
    try:
        quota_service = UserQuotaService()
        usage_data = await quota_service.sync_usage(
            str(current_user.id), request.daily_minutes_used
        )

        return UsageSyncResponse(
            daily_minutes_used=usage_data["daily_minutes_used"],
            quota_remaining=usage_data["daily_minutes_remaining"],
            is_premium=usage_data["is_premium"],
        )

    except Exception as e:
        logger.error(
            f"Error syncing usage for user {current_user.id}: {e}",
            exc_info=True,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to sync usage",
        )


@router.get("/voices")
async def list_available_voices(
    current_user: User = Depends(get_current_active_user),
):
    """
    List available voices for dubbing from ElevenLabs API

    **Returns**:
    - voices: List of available voices
        - id: Voice identifier (ElevenLabs voice_id)
        - name: Voice name
        - language: Voice language code
        - gender: male/female (if available)
        - preview_url: Preview audio URL
    """
    try:
        # Fetch voices from ElevenLabs API via VoiceManagementService
        elevenlabs_voices = await VoiceManagementService.fetch_elevenlabs_voices()

        if not elevenlabs_voices:
            logger.warning("No voices returned from ElevenLabs API")
            return {"voices": []}

        # Transform ElevenLabs voice format to match our endpoint schema
        voices = []
        for voice in elevenlabs_voices:
            # Extract language code from labels if available
            labels = voice.get("labels", {})
            language = labels.get("language", "en")  # Default to English

            # Determine gender from labels or voice metadata
            gender = labels.get("gender", "neutral")

            voices.append({
                "id": voice.get("voice_id"),
                "name": voice.get("name", "Unknown Voice"),
                "language": language,
                "gender": gender,
                "preview_url": voice.get("preview_url"),
            })

        logger.info(
            f"Retrieved {len(voices)} voices from ElevenLabs",
            extra={"voice_count": len(voices)}
        )

        return {"voices": voices}

    except Exception as e:
        logger.error(
            "Failed to fetch voices from ElevenLabs",
            extra={"error": str(e)}
        )
        # Return empty list on error to gracefully handle failures
        return {"voices": []}
