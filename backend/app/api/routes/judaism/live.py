"""
Live shiurim endpoints for Judaism section.

Handles:
- GET /live - Get currently live Torah classes and prayers
"""

from fastapi import APIRouter

from app.models.content import LiveChannel
from app.api.routes.judaism.constants import (
    LIVE_CHANNEL_NAME_REGEX,
    LIVE_CHANNEL_CATEGORY_REGEX,
)

router = APIRouter()


@router.get("/live")
async def get_live_shiurim() -> dict:
    """Get currently live Torah classes and prayers."""
    # Get channels that are religious/Jewish content
    channels = await LiveChannel.find({
        "is_active": True,
        "$or": [
            {"name": {"$regex": LIVE_CHANNEL_NAME_REGEX, "$options": "i"}},
            {"category": {"$regex": LIVE_CHANNEL_CATEGORY_REGEX, "$options": "i"}},
        ],
    }).to_list()

    return {
        "live": [
            {
                "id": str(ch.id),
                "name": ch.name,
                "description": ch.description,
                "thumbnail": ch.thumbnail,
                "is_live": True,
                "current_program": ch.current_show,
            }
            for ch in channels
        ]
    }
