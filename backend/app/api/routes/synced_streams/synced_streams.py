"""
Synced Streams API - Perfect Video-Audio Synchronization

Provides endpoints for creating perfectly synchronized live streams
with dubbing and subtitles. Video is delayed to match processing latency.
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from app.core.security import get_current_user
from app.models.user import User
from app.services.buffered_channel_service import (
    buffered_channel_service,
    SyncedStreamInfo,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/synced-streams", tags=["synced-streams"])


class SyncedStreamRequest(BaseModel):
    """Request for a synced stream."""
    channel_id: str = Field(..., description="Live channel ID")
    target_lang: Optional[str] = Field(None, description="Target language code (e.g., 'en', 'es')")
    enable_dubbing: bool = Field(False, description="Enable live dubbing")
    enable_subtitles: bool = Field(False, description="Enable live subtitles")


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
async def create_synced_stream(
    request: SyncedStreamRequest,
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
        if not request.enable_dubbing and not request.enable_subtitles:
            raise HTTPException(
                status_code=400,
                detail="Must enable at least dubbing or subtitles"
            )

        # Validate target language if features enabled
        if (request.enable_dubbing or request.enable_subtitles) and not request.target_lang:
            raise HTTPException(
                status_code=400,
                detail="target_lang required when dubbing or subtitles enabled"
            )

        # Create synced stream
        stream_info = await buffered_channel_service.create_synced_stream(
            channel_id=request.channel_id,
            user_id=str(current_user.id),
            target_lang=request.target_lang,
            enable_dubbing=request.enable_dubbing,
            enable_subtitles=request.enable_subtitles,
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
        logger.error(f"Error creating synced stream: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create synced stream: {str(e)}"
        )


@router.post("/update-latency")
async def update_latency_measurement(
    channel_id: str = Query(..., description="Channel ID"),
    target_lang: str = Query(..., description="Target language"),
    measured_dubbing_ms: Optional[int] = Query(None, description="Measured dubbing latency"),
    measured_subtitle_ms: Optional[int] = Query(None, description="Measured subtitle latency"),
    current_user: User = Depends(get_current_user),
) -> dict:
    """
    Update latency measurements for a channel.

    Called by the client after measuring actual dubbing/subtitle latency.
    Helps improve delay estimates for future streams.
    """
    try:
        await buffered_channel_service.update_latency_profile(
            channel_id=channel_id,
            target_lang=target_lang,
            measured_dubbing_ms=measured_dubbing_ms,
            measured_subtitle_ms=measured_subtitle_ms,
        )

        return {
            "success": True,
            "message": "Latency profile updated",
            "channel_id": channel_id,
            "target_lang": target_lang,
        }

    except Exception as e:
        logger.error(f"Error updating latency: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update latency: {str(e)}"
        )


@router.get("/latency-profile")
async def get_latency_profile(
    channel_id: str = Query(..., description="Channel ID"),
    target_lang: str = Query(..., description="Target language"),
    current_user: User = Depends(get_current_user),
) -> dict:
    """
    Get current latency profile for a channel/language pair.

    Useful for debugging and monitoring.
    """
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
        "recommended_delay_ms": profile.recommended_delay_ms,
        "measured_at": profile.measured_at.isoformat(),
        "sample_count": profile.sample_count,
    }
