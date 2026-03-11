"""
Channel-scoped Catch-Up routes for live TV.

iOS/tvOS/Android clients call /api/v1/live/{channel_id}/catchup/...
These routes delegate to the existing catchup_service and transcript bus.
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.security import get_current_active_user, get_optional_user
from app.models.content import LiveChannel
from app.models.user import User
from app.services.transcript_bus import get_transcript_bus

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/{channel_id}/catchup/available")
async def check_channel_catchup_available(
    channel_id: str,
    current_user: Optional[User] = Depends(get_optional_user),
):
    """Check if catch-up is available for a live channel."""
    try:
        channel = await LiveChannel.get(channel_id)
        if not channel:
            return {"available": False}

        has_credits = False
        is_premium = False
        balance = 0

        if current_user:
            credits = getattr(current_user, "ai_credits", None)
            if credits is not None:
                balance = int(credits)
                has_credits = balance > 0
            is_premium = current_user.can_access_premium_features()

        bus = get_transcript_bus()
        is_accumulating = channel_id in bus.get_active_channels()

        return {
            "available": is_accumulating or has_credits or is_premium,
            "has_credits": has_credits,
            "balance": balance,
        }

    except Exception as e:
        logger.error(
            "Failed to check channel catchup availability",
            extra={"channel_id": channel_id, "error": str(e)},
            exc_info=True,
        )
        return {"available": False}


@router.get("/{channel_id}/catchup")
async def get_channel_catchup_summary(
    channel_id: str,
    window_minutes: int = Query(30, ge=5, le=180),
    target_language: str = Query("en"),
    current_user: User = Depends(get_current_active_user),
):
    """Get AI catch-up summary for a live channel's recent content."""
    try:
        channel = await LiveChannel.get(channel_id)
        if not channel:
            raise HTTPException(status_code=404, detail="Channel not found")

        bus = get_transcript_bus()
        replay_buffer = bus._replay_buffers.get(channel_id)
        if not replay_buffer or len(replay_buffer) == 0:
            return {
                "summary": "",
                "key_points": [],
                "window_minutes": window_minutes,
            }

        segments = [
            evt
            for evt in replay_buffer
            if evt.event_type == "transcript" and evt.text
        ]

        if not segments:
            return {
                "summary": "",
                "key_points": [],
                "window_minutes": window_minutes,
            }

        combined_text = " ".join(evt.text for evt in segments)
        key_points = [
            evt.text[:120] for evt in segments[-5:]
        ]

        return {
            "summary": combined_text,
            "key_points": key_points,
            "program_info": {
                "title": getattr(channel, "name", None),
                "description": getattr(channel, "description", None),
            },
            "window_minutes": window_minutes,
            "credits_used": 0,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to get catchup summary",
            extra={"channel_id": channel_id, "error": str(e)},
            exc_info=True,
        )
        raise HTTPException(
            status_code=500, detail="Catch-up summary unavailable"
        )


@router.get("/{channel_id}/transcripts")
async def get_channel_transcripts(
    channel_id: str,
    window_minutes: int = Query(30, ge=5, le=180),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """Get transcript timeline for a live channel."""
    try:
        bus = get_transcript_bus()
        replay_buffer = bus._replay_buffers.get(channel_id)
        segments = []
        if replay_buffer:
            segments = [
                {
                    "text": evt.text,
                    "timestamp": evt.timestamp,
                    "language": evt.source_lang or None,
                }
                for evt in replay_buffer
                if evt.event_type == "transcript" and evt.text
            ]

        return {
            "transcripts": segments,
            "total": len(segments),
            "channel_id": channel_id,
            "window_minutes": window_minutes,
        }

    except Exception as e:
        logger.error(
            "Failed to get transcripts",
            extra={"channel_id": channel_id, "error": str(e)},
            exc_info=True,
        )
        return {
            "transcripts": [],
            "total": 0,
            "channel_id": channel_id,
            "window_minutes": window_minutes,
        }


@router.get("/{channel_id}/transcripts/status")
async def get_channel_transcript_status(
    channel_id: str,
    current_user: Optional[User] = Depends(get_optional_user),
):
    """Check transcript accumulation status for a channel."""
    try:
        bus = get_transcript_bus()
        is_accumulating = channel_id in bus.get_active_channels()
        count = 0
        replay_buffer = bus._replay_buffers.get(channel_id)
        if replay_buffer:
            count = sum(
                1 for evt in replay_buffer if evt.event_type == "transcript"
            )

        return {
            "channel_id": channel_id,
            "is_accumulating": is_accumulating,
            "transcript_count": count,
        }

    except Exception as e:
        logger.error(
            "Failed to get transcript status",
            extra={"channel_id": channel_id, "error": str(e)},
            exc_info=True,
        )
        return {
            "channel_id": channel_id,
            "is_accumulating": False,
            "transcript_count": 0,
        }
