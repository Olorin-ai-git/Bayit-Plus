"""
REST API endpoints for live dubbing configuration and status.

Provides endpoints for:
- Checking dubbing availability for channels
- Getting available voices for dubbing
- Updating channel dubbing configuration (admin)
"""

import json
import logging
from typing import Any, Dict, List, Optional

from beanie import PydanticObjectId
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field

from app.core.security import get_current_admin_user, get_current_user
from app.core.config import settings
from app.core.rate_limiter import limiter, RATE_LIMITS
from app.models.content import LiveChannel
from app.models.live_dubbing import LiveDubbingSession
from app.models.user import User

router = APIRouter()
logger = logging.getLogger(__name__)


class DubbingVoice(BaseModel):
    """Voice option for dubbing."""

    id: str
    name: str
    language: str
    description: Optional[str] = None


class DubbingAvailabilityResponse(BaseModel):
    """Response for dubbing availability check."""

    available: bool
    source_language: Optional[str] = None
    supported_target_languages: List[str] = Field(default_factory=list)
    default_voice_id: Optional[str] = None
    default_sync_delay_ms: int = 600
    available_voices: List[DubbingVoice] = Field(default_factory=list)
    error: Optional[str] = None


class ChannelDubbingConfigUpdate(BaseModel):
    """Request to update channel dubbing configuration."""

    supports_live_dubbing: Optional[bool] = None
    dubbing_source_language: Optional[str] = None
    available_dubbing_languages: Optional[List[str]] = None
    default_dubbing_voice_id: Optional[str] = None
    dubbing_sync_delay_ms: Optional[int] = None


class DubbingSessionStats(BaseModel):
    """Statistics for dubbing sessions."""

    total_sessions: int
    active_sessions: int
    total_audio_seconds: float
    avg_latency_ms: float


def get_available_voices() -> List[DubbingVoice]:
    """Get list of available ElevenLabs voices for dubbing."""
    try:
        voices_json = settings.ELEVENLABS_DUBBING_VOICES
        if not voices_json:
            return []

        voices_data = json.loads(voices_json)
        return [
            DubbingVoice(
                id=v["id"],
                name=v["name"],
                language=v.get("lang", "multilingual"),
                description=v.get("desc"),
            )
            for v in voices_data
        ]
    except (json.JSONDecodeError, KeyError) as e:
        logger.error(f"Error parsing dubbing voices config: {e}")
        return []


@router.get(
    "/live/{channel_id}/dubbing/availability",
    response_model=DubbingAvailabilityResponse,
)
async def get_dubbing_availability(
    channel_id: str,
    current_user: User = Depends(get_current_user),
) -> DubbingAvailabilityResponse:
    """
    Check if live dubbing is available for a channel.

    Returns availability status, supported languages, and available voices.
    Requires authentication (Premium/Family subscription for actual usage).
    """
    # Check if feature is enabled globally
    if not settings.olorin.dubbing.live_dubbing_enabled:
        return DubbingAvailabilityResponse(
            available=False,
            error="Live dubbing is currently disabled",
        )

    try:
        channel = await LiveChannel.get(PydanticObjectId(channel_id))
        if not channel:
            return DubbingAvailabilityResponse(
                available=False,
                error="Channel not found",
            )

        if not channel.supports_live_dubbing:
            return DubbingAvailabilityResponse(
                available=False,
                error="This channel does not support live dubbing",
            )

        # Channel supports dubbing - return available=True
        # Frontend will handle premium subscription check and show upgrade prompt
        return DubbingAvailabilityResponse(
            available=True,
            source_language=channel.dubbing_source_language or "he",
            supported_target_languages=channel.available_dubbing_languages or ["en", "es", "ar", "ru", "fr", "de"],
            default_voice_id=channel.default_dubbing_voice_id,
            default_sync_delay_ms=channel.dubbing_sync_delay_ms or 600,
            available_voices=get_available_voices(),
            error=None,
        )

    except Exception as e:
        logger.error(f"Error checking dubbing availability: {str(e)}")
        return DubbingAvailabilityResponse(
            available=False,
            error="Internal error",
        )


@router.get("/live/dubbing/voices", response_model=List[DubbingVoice])
async def get_dubbing_voices(
    current_user: User = Depends(get_current_user),
) -> List[DubbingVoice]:
    """
    Get list of available voices for dubbing.

    Returns all configured ElevenLabs voices that can be used for dubbing.
    """
    return get_available_voices()


@router.put(
    "/admin/live/{channel_id}/dubbing/config",
    response_model=Dict[str, Any],
)
@limiter.limit(RATE_LIMITS["dubbing_config_update"])
async def update_channel_dubbing_config(
    request: Request,
    channel_id: str,
    config: ChannelDubbingConfigUpdate,
    admin_user: User = Depends(get_current_admin_user),
) -> Dict[str, Any]:
    """
    Update dubbing configuration for a live channel.

    Admin only endpoint for configuring channel dubbing settings.
    """
    try:
        channel = await LiveChannel.get(PydanticObjectId(channel_id))
        if not channel:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Channel not found",
            )

        # Capture before state for audit logging
        before_state = {
            "supports_live_dubbing": channel.supports_live_dubbing,
            "dubbing_source_language": channel.dubbing_source_language,
            "available_dubbing_languages": channel.available_dubbing_languages,
            "default_dubbing_voice_id": channel.default_dubbing_voice_id,
            "dubbing_sync_delay_ms": channel.dubbing_sync_delay_ms,
        }

        # Update fields if provided
        if config.supports_live_dubbing is not None:
            channel.supports_live_dubbing = config.supports_live_dubbing

        if config.dubbing_source_language is not None:
            channel.dubbing_source_language = config.dubbing_source_language

        if config.available_dubbing_languages is not None:
            channel.available_dubbing_languages = config.available_dubbing_languages

        if config.default_dubbing_voice_id is not None:
            channel.default_dubbing_voice_id = config.default_dubbing_voice_id

        if config.dubbing_sync_delay_ms is not None:
            channel.dubbing_sync_delay_ms = config.dubbing_sync_delay_ms

        await channel.save()

        # Capture after state for audit logging
        after_state = {
            "supports_live_dubbing": channel.supports_live_dubbing,
            "dubbing_source_language": channel.dubbing_source_language,
            "available_dubbing_languages": channel.available_dubbing_languages,
            "default_dubbing_voice_id": channel.default_dubbing_voice_id,
            "dubbing_sync_delay_ms": channel.dubbing_sync_delay_ms,
        }

        # Structured audit logging
        logger.info(
            "Dubbing configuration updated",
            extra={
                "action": "dubbing_config_update",
                "resource_type": "live_channel",
                "resource_id": channel_id,
                "channel_name": channel.name,
                "admin_user_id": str(admin_user.id),
                "admin_email": admin_user.email,
                "before_state": before_state,
                "after_state": after_state,
                "ip_address": request.client.host if request.client else None,
                "user_agent": request.headers.get("user-agent"),
            },
        )

        return {
            "success": True,
            "channel_id": channel_id,
            "config": {
                "supports_live_dubbing": channel.supports_live_dubbing,
                "dubbing_source_language": channel.dubbing_source_language,
                "available_dubbing_languages": channel.available_dubbing_languages,
                "default_dubbing_voice_id": channel.default_dubbing_voice_id,
                "dubbing_sync_delay_ms": channel.dubbing_sync_delay_ms,
            },
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating channel dubbing config: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update dubbing configuration",
        )


@router.get(
    "/admin/live/dubbing/stats",
    response_model=DubbingSessionStats,
)
@limiter.limit(RATE_LIMITS["dubbing_stats"])
async def get_dubbing_stats(
    request: Request,
    admin_user: User = Depends(get_current_admin_user),
) -> DubbingSessionStats:
    """
    Get dubbing session statistics.

    Admin only endpoint for monitoring dubbing usage.
    """
    try:
        # Count total and active sessions
        total_sessions = await LiveDubbingSession.count()
        active_sessions = await LiveDubbingSession.find(
            LiveDubbingSession.status == "active"
        ).count()

        # Calculate aggregate metrics
        pipeline = [
            {"$match": {"status": {"$in": ["completed", "active"]}}},
            {
                "$group": {
                    "_id": None,
                    "total_audio_seconds": {
                        "$sum": "$metrics.audio_seconds_processed"
                    },
                    "avg_latency_ms": {"$avg": "$metrics.avg_total_latency_ms"},
                }
            },
        ]

        result = await LiveDubbingSession.aggregate(pipeline).to_list(length=1)

        if result:
            total_audio = result[0].get("total_audio_seconds", 0.0)
            avg_latency = result[0].get("avg_latency_ms", 0.0)
        else:
            total_audio = 0.0
            avg_latency = 0.0

        return DubbingSessionStats(
            total_sessions=total_sessions,
            active_sessions=active_sessions,
            total_audio_seconds=total_audio,
            avg_latency_ms=avg_latency or 0.0,
        )

    except Exception as e:
        logger.error(f"Error getting dubbing stats: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get dubbing statistics",
        )
