"""
User Dubbing and Subtitle Session Routes

B2C endpoints for Chrome extension with JWT authentication
Supports both audio dubbing and live subtitles
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import settings
from app.core.logging_config import get_logger
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

logger = get_logger(__name__)
router = APIRouter()
security = HTTPBearer()


# Dependency: Get current user from JWT token
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> User:
    """
    Get current user from JWT token

    Args:
        credentials: HTTP Bearer credentials

    Returns:
        User object

    Raises:
        HTTPException: If authentication fails
    """
    try:
        token = credentials.credentials

        # Import here to avoid circular dependency
        from app.core.security import decode_access_token

        # Decode JWT token
        payload = decode_access_token(token)
        if not payload:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )

        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Get user from database
        user = await User.get(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
                headers={"WWW-Authenticate": "Bearer"},
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is disabled",
            )

        return user

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error authenticating user: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


@router.post("/sessions", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
async def create_dubbing_session(
    request: CreateSessionRequest,
    current_user: User = Depends(get_current_user),
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
            expires_at=session.created_at,  # TODO: Add expiry logic
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
    current_user: User = Depends(get_current_user),
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
    current_user: User = Depends(get_current_user),
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
    current_user: User = Depends(get_current_user),
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
    current_user: User = Depends(get_current_user),
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
    current_user: User = Depends(get_current_user),
):
    """
    List available voices for dubbing

    **Returns**:
    - voices: List of available voices
        - id: Voice identifier
        - name: Voice name
        - language: Voice language
        - gender: male/female
        - preview_url: Preview audio URL (optional)
    """
    # TODO: Integrate with ElevenLabs service to get available voices
    return {
        "voices": [
            {
                "id": "voice_en_male_1",
                "name": "David (English)",
                "language": "en",
                "gender": "male",
                "preview_url": None,
            },
            {
                "id": "voice_en_female_1",
                "name": "Sarah (English)",
                "language": "en",
                "gender": "female",
                "preview_url": None,
            },
            {
                "id": "voice_es_male_1",
                "name": "Carlos (Spanish)",
                "language": "es",
                "gender": "male",
                "preview_url": None,
            },
            {
                "id": "voice_es_female_1",
                "name": "Maria (Spanish)",
                "language": "es",
                "gender": "female",
                "preview_url": None,
            },
        ]
    }
