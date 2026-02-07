"""
Playlist API Helpers
Shared utilities and request schemas for playlist REST API endpoints.
"""

import re
from typing import Optional

from pydantic import BaseModel, field_validator

from app.models.content import Content, LiveChannel, PodcastEpisode, RadioStation
from app.models.playlist import CONTENT_ID_PATTERN, ContentType, PlaylistItem


class PlaylistAddRequest(BaseModel):
    """Request body for adding an item to the playlist."""

    content_id: str
    content_type: ContentType

    @field_validator("content_id")
    @classmethod
    def validate_content_id(cls, v: str) -> str:
        if not re.match(CONTENT_ID_PATTERN, v):
            raise ValueError("Invalid content_id format")
        return v


class PlaylistReorderRequest(BaseModel):
    """Request body for reordering a playlist item."""

    content_id: str
    new_position: int

    @field_validator("content_id")
    @classmethod
    def validate_content_id(cls, v: str) -> str:
        if not re.match(CONTENT_ID_PATTERN, v):
            raise ValueError("Invalid content_id format")
        return v


class PlaylistToggleRequest(BaseModel):
    """Request body for toggling playlist membership."""

    content_type: str = "vod"


async def get_content_metadata(
    content_id: str, content_type: ContentType
) -> Optional[dict]:
    """Fetch content metadata for playlist enrichment."""
    if content_type == ContentType.VOD:
        content = await Content.get(content_id)
        if content:
            return {
                "title": content.title,
                "thumbnail": content.thumbnail,
                "duration": content.duration,
            }
    elif content_type == ContentType.LIVE:
        channel = await LiveChannel.get(content_id)
        if channel:
            return {"title": channel.name, "thumbnail": channel.thumbnail}
    elif content_type == ContentType.PODCAST:
        episode = await PodcastEpisode.get(content_id)
        if episode:
            return {
                "title": episode.title,
                "thumbnail": episode.thumbnail,
                "duration": episode.duration,
            }
    elif content_type == ContentType.RADIO:
        station = await RadioStation.get(content_id)
        if station:
            return {"title": station.name, "thumbnail": station.thumbnail}
    return None


def enrich_playlist_item(item: PlaylistItem) -> dict:
    """Enrich a playlist item with serialized data."""
    return {
        "content_id": item.content_id,
        "content_type": item.content_type.value,
        "title": item.title,
        "thumbnail": item.thumbnail,
        "duration": item.duration,
        "position": item.position,
        "added_at": item.added_at.isoformat(),
    }
