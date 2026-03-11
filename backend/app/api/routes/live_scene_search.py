"""
Channel-scoped Scene Search routes for live TV.

iOS/tvOS/Android clients call POST /api/v1/live/{channel_id}/scene-search
This proxies to the existing scene search service with channel context.
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field

from app.core.security import get_optional_user
from app.models.content import LiveChannel
from app.models.user import User
from app.services.feature_flags import is_feature_enabled
from app.services.transcript_bus import get_transcript_bus

router = APIRouter()
logger = logging.getLogger(__name__)


class ChannelSceneSearchRequest(BaseModel):
    """Request body for channel-scoped scene search."""

    query: str = Field(..., min_length=2, max_length=500)


@router.post("/{channel_id}/scene-search")
async def search_channel_scenes(
    channel_id: str,
    body: ChannelSceneSearchRequest,
    request: Request,
    current_user: Optional[User] = Depends(get_optional_user),
):
    """Search for scenes within a live channel's transcript history."""
    try:
        if not await is_feature_enabled("scene_search"):
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Scene search is currently unavailable",
            )

        channel = await LiveChannel.get(channel_id)
        if not channel:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Channel not found",
            )

        bus = get_transcript_bus()
        replay_buffer = bus._replay_buffers.get(channel_id)

        results = []
        if replay_buffer:
            query_lower = body.query.lower()
            for evt in replay_buffer:
                if evt.event_type != "transcript" or not evt.text:
                    continue
                text = evt.text
                translated = evt.text_translated or ""
                if query_lower in text.lower() or query_lower in translated.lower():
                    results.append({
                        "id": f"{channel_id}_{evt.timestamp}",
                        "title": text[:80],
                        "description": text,
                        "timestamp": evt.timestamp,
                        "confidence": 0.8,
                    })

        return {
            "results": results,
            "query": body.query,
            "channel_id": channel_id,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Channel scene search failed",
            extra={"channel_id": channel_id, "error": str(e)},
            exc_info=True,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Search service temporarily unavailable",
        )
