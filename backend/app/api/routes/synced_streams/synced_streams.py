"""
Synced Streams API - Perfect Video-Audio Synchronization

Provides endpoints for creating perfectly synchronized live streams
with dubbing and subtitles. Video is delayed to match processing latency.
"""

import logging
import uuid
from typing import Optional, Set

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field, field_validator, constr

from app.core.rate_limiter import limiter
from app.core.security import get_current_user
from app.models.user import User
from app.services.buffered_channel_service import (
    buffered_channel_service,
    SyncedStreamInfo,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/synced-streams", tags=["synced-streams"])

# Allowed language codes (ISO 639-1) - whitelist for security
ALLOWED_LANGUAGES: Set[str] = {'en', 'es', 'he', 'fr', 'de', 'ar', 'zh', 'ja', 'ko', 'ru'}


class SyncedStreamRequest(BaseModel):
    """Request for a synced stream with comprehensive input validation."""
    channel_id: constr(min_length=1, max_length=100, pattern=r'^[a-zA-Z0-9_-]+$') = Field(
        ...,
        description="Live channel ID (alphanumeric, dash, underscore only)",
        examples=["channel-123", "news_live"]
    )
    target_lang: Optional[constr(min_length=2, max_length=5, pattern=r'^[a-z]{2}(-[A-Z]{2})?$')] = Field(
        None,
        description="ISO 639-1 language code (e.g., 'en', 'es', 'he')",
        examples=["en", "es", "he", "en-US"]
    )
    enable_dubbing: bool = Field(False, description="Enable live dubbing")
    enable_subtitles: bool = Field(False, description="Enable live subtitles")

    @field_validator('target_lang')
    @classmethod
    def validate_language_code(cls, v: Optional[str]) -> Optional[str]:
        """Validate language code against whitelist."""
        if v:
            base_lang = v.split('-')[0]
            if base_lang not in ALLOWED_LANGUAGES:
                raise ValueError(
                    f'Unsupported language code: {v}. '
                    f'Allowed: {", ".join(sorted(ALLOWED_LANGUAGES))}'
                )
        return v


class LatencyUpdateRequest(BaseModel):
    """Request for updating latency measurements with validation."""
    channel_id: constr(min_length=1, max_length=100, pattern=r'^[a-zA-Z0-9_-]+$') = Field(
        ..., description="Channel ID"
    )
    target_lang: constr(min_length=2, max_length=5, pattern=r'^[a-z]{2}(-[A-Z]{2})?$') = Field(
        ..., description="Target language code"
    )
    measured_dubbing_ms: Optional[int] = Field(None, ge=0, le=30000, description="Dubbing latency (0-30000ms)")
    measured_subtitle_ms: Optional[int] = Field(None, ge=0, le=30000, description="Subtitle latency (0-30000ms)")

    @field_validator('measured_dubbing_ms', 'measured_subtitle_ms')
    @classmethod
    def validate_latency_range(cls, v: Optional[int]) -> Optional[int]:
        """Validate latency is in reasonable range."""
        if v is not None and (v < 0 or v > 30000):
            raise ValueError('Latency must be between 0 and 30000 ms (0-30 seconds)')
        return v


class SyncedStreamResponse(BaseModel):
    """Response with synced stream information."""
    channel_id: str
    video_url: str
    video_delay_ms: int
    dubbing_websocket_url: Optional[str] = None
    subtitle_websocket_url: Optional[str] = None
    sync_guaranteed: bool = True
    mode: str  # "server-side" or "client-side"
    message: str = "Video delayed to match processing for perfect sync"


@router.post("/create", response_model=SyncedStreamResponse)
@limiter.limit("30/minute")  # Limit synced stream creation to prevent abuse
async def create_synced_stream(
    request_data: SyncedStreamRequest,
    http_request: Request,
    current_user: User = Depends(get_current_user),
) -> SyncedStreamResponse:
    """
    Create a perfectly synchronized live stream with dubbing/subtitles.

    The video stream is delayed to match the dubbing/subtitle processing
    latency, guaranteeing perfect synchronization.

    **Architecture:**
    - Server-side (default): HLS manifest delayed at backend
    - Client-side (fallback): Client delays video playback

    **Benefits:**
    - Perfect lip-sync for dubbing
    - Perfect timing for subtitles
    - No manual sync adjustment needed
    - Professional broadcast quality

    **Latency:**
    - Dubbing: ~800-900ms delay (video matches audio)
    - Subtitles: ~400-500ms delay (video matches text)
    - User sees video slightly behind "live" but sync is perfect
    """
    try:
        # Validate that at least one feature is enabled
        if not request_data.enable_dubbing and not request_data.enable_subtitles:
            raise HTTPException(
                status_code=400,
                detail="Must enable at least dubbing or subtitles"
            )

        # Validate target language if features enabled
        if (request_data.enable_dubbing or request_data.enable_subtitles) and not request_data.target_lang:
            raise HTTPException(
                status_code=400,
                detail="target_lang required when dubbing or subtitles enabled"
            )

        # Create synced stream
        stream_info = await buffered_channel_service.create_synced_stream(
            channel_id=request_data.channel_id,
            user_id=str(current_user.id),
            target_lang=request_data.target_lang,
            enable_dubbing=request_data.enable_dubbing,
            enable_subtitles=request_data.enable_subtitles,
        )

        return SyncedStreamResponse(
            channel_id=stream_info.channel_id,
            video_url=stream_info.video_url,
            video_delay_ms=stream_info.video_delay_ms,
            dubbing_websocket_url=stream_info.dubbing_websocket_url,
            subtitle_websocket_url=stream_info.subtitle_websocket_url,
            sync_guaranteed=stream_info.sync_guaranteed,
            mode=stream_info.mode,
        )

    except HTTPException:
        raise
    except Exception as e:
        # Generate correlation ID for support
        correlation_id = str(uuid.uuid4())
        logger.error(
            "Synced stream creation failed",
            extra={
                "correlation_id": correlation_id,
                "user_id": str(current_user.id),
                "channel_id": request_data.channel_id,
                "error": str(e),
            },
            exc_info=True
        )
        raise HTTPException(
            status_code=500,
            detail={
                "error": "An error occurred while creating the synced stream",
                "correlation_id": correlation_id,
                "message": "Please contact support if the issue persists"
            }
        )


@router.post("/update-latency")
@limiter.limit("60/minute")  # Allow frequent latency updates during active streaming
async def update_latency_measurement(
    request_data: LatencyUpdateRequest,
    http_request: Request,
    current_user: User = Depends(get_current_user),
) -> dict:
    """
    Update latency measurements for a channel.

    Called by the client after measuring actual dubbing/subtitle latency.
    Helps improve delay estimates for future streams.
    """
    try:
        await buffered_channel_service.update_latency_profile(
            channel_id=request_data.channel_id,
            target_lang=request_data.target_lang,
            measured_dubbing_ms=request_data.measured_dubbing_ms,
            measured_subtitle_ms=request_data.measured_subtitle_ms,
        )

        return {
            "success": True,
            "message": "Latency profile updated",
            "channel_id": request_data.channel_id,
            "target_lang": request_data.target_lang,
        }

    except Exception as e:
        correlation_id = str(uuid.uuid4())
        logger.error(
            "Latency update failed",
            extra={
                "correlation_id": correlation_id,
                "user_id": str(current_user.id),
                "channel_id": request_data.channel_id,
                "error": str(e),
            },
            exc_info=True
        )
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Failed to update latency measurements",
                "correlation_id": correlation_id
            }
        )


@router.get("/latency-profile")
@limiter.limit("30/minute")  # Limit latency profile queries
async def get_latency_profile(
    http_request: Request,
    channel_id: constr(min_length=1, max_length=100, pattern=r'^[a-zA-Z0-9_-]+$') = Query(..., description="Channel ID"),
    target_lang: constr(min_length=2, max_length=5, pattern=r'^[a-z]{2}(-[A-Z]{2})?$') = Query(..., description="Target language"),
    current_user: User = Depends(get_current_user),
) -> dict:
    """
    Get current latency profile for a channel/language pair.

    Useful for debugging and monitoring.
    """
    from app.core.config import settings

    profile = await buffered_channel_service.get_latency_profile(
        channel_id, target_lang
    )

    if not profile:
        return {
            "exists": False,
            "message": "No latency profile found for this channel/language"
        }

    return {
        "exists": True,
        "channel_id": profile.channel_id,
        "target_lang": profile.target_lang,
        "avg_dubbing_latency_ms": profile.avg_dubbing_latency_ms,
        "avg_subtitle_latency_ms": profile.avg_subtitle_latency_ms,
        "recommended_delay_ms": profile.recommended_delay_ms(settings.VIDEO_BUFFER_SAFETY_MS),
        "measured_at": profile.measured_at.isoformat(),
        "sample_count": profile.sample_count,
    }
