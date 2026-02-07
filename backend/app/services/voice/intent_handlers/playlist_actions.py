"""
Playlist Actions
Clear, play, and review sub-handlers for playlist voice commands.
"""

from datetime import datetime
from typing import Any, Dict

from app.core.logging_config import get_logger
from app.models.playlist import UserPlaylist
from ..context import VoiceContext
from ..playlist_responses import (
    PLAYLIST_CLEARED_RESPONSES,
    PLAYLIST_EMPTY_RESPONSES,
    PLAYLIST_PLAYING_RESPONSES,
    PLAYLIST_REVIEW_RESPONSES,
)
from .playlist_content_finder import build_player_path

logger = get_logger(__name__)


async def handle_playlist_clear(context: VoiceContext) -> Dict[str, Any]:
    """Clear all items from the user's playlist."""
    playlist = await UserPlaylist.find_one(UserPlaylist.user_id == context.user_id)

    if playlist:
        playlist.items = []
        playlist.updated_at = datetime.utcnow()
        await playlist.save()

    logger.info(
        "Playlist cleared",
        extra={"user_id": context.user_id},
    )

    spoken = PLAYLIST_CLEARED_RESPONSES.get(
        context.language, PLAYLIST_CLEARED_RESPONSES["en"]
    )
    return {
        "spoken_response": spoken,
        "action": {
            "type": "playlist",
            "payload": {"sub_action": "clear", "items": []},
        },
    }


async def handle_playlist_play(context: VoiceContext) -> Dict[str, Any]:
    """Play the first item in the user's playlist and queue the rest."""
    playlist = await UserPlaylist.find_one(UserPlaylist.user_id == context.user_id)

    if not playlist or not playlist.items:
        spoken = PLAYLIST_EMPTY_RESPONSES.get(
            context.language, PLAYLIST_EMPTY_RESPONSES["en"]
        )
        return {
            "spoken_response": spoken,
            "action": {"type": "playlist", "payload": {"sub_action": "play", "items": []}},
        }

    first_item = playlist.items[0]
    remaining = playlist.items[1:]
    is_series = first_item.content_type.value == "vod" and "series" in first_item.title.lower()
    path = build_player_path(first_item.content_id, first_item.content_type.value, is_series)

    logger.info(
        "Playlist playback started",
        extra={
            "user_id": context.user_id,
            "content_id": first_item.content_id,
            "title": first_item.title,
            "queue_size": len(remaining),
        },
    )

    spoken = PLAYLIST_PLAYING_RESPONSES.get(
        context.language, PLAYLIST_PLAYING_RESPONSES["en"]
    )
    return {
        "spoken_response": spoken,
        "action": {
            "type": "navigate",
            "payload": {
                "path": path,
                "queue": [item.model_dump(mode="json") for item in remaining],
            },
        },
    }


async def handle_playlist_review(context: VoiceContext) -> Dict[str, Any]:
    """Return the user's playlist items with a spoken summary."""
    playlist = await UserPlaylist.find_one(UserPlaylist.user_id == context.user_id)

    if not playlist or not playlist.items:
        spoken = PLAYLIST_EMPTY_RESPONSES.get(
            context.language, PLAYLIST_EMPTY_RESPONSES["en"]
        )
        return {
            "spoken_response": spoken,
            "action": {"type": "playlist", "payload": {"sub_action": "review", "items": []}},
        }

    item_count = len(playlist.items)
    spoken = PLAYLIST_REVIEW_RESPONSES.get(
        context.language, PLAYLIST_REVIEW_RESPONSES["en"]
    ).format(item_count)

    logger.info(
        "Playlist reviewed",
        extra={"user_id": context.user_id, "item_count": item_count},
    )

    return {
        "spoken_response": spoken,
        "action": {
            "type": "playlist",
            "payload": {
                "sub_action": "review",
                "items": [item.model_dump(mode="json") for item in playlist.items],
            },
        },
    }
