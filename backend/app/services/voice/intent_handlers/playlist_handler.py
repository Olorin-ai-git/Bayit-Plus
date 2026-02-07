"""
Playlist Intent Handler
Main router for playlist voice commands with add/remove sub-handlers.
"""

from datetime import datetime
from typing import Any, Dict

from app.core.logging_config import get_logger
from app.models.playlist import MAX_PLAYLIST_ITEMS, ContentType, PlaylistItem, UserPlaylist
from ..context import VoiceContext
from ..error_messages import get_error_message
from ..playlist_keywords import detect_playlist_sub_action, extract_content_query
from ..playlist_responses import (
    PLAYLIST_ADDED_RESPONSES,
    PLAYLIST_ALREADY_EXISTS_RESPONSES,
    PLAYLIST_FULL_RESPONSES,
    PLAYLIST_NOT_FOUND_RESPONSES,
    PLAYLIST_REMOVED_RESPONSES,
)
from .playlist_actions import handle_playlist_clear, handle_playlist_play, handle_playlist_review
from .playlist_content_finder import find_content_for_playlist

logger = get_logger(__name__)


async def handle_playlist(
    transcript: str, context: VoiceContext
) -> Dict[str, Any]:
    """Route playlist voice command to appropriate sub-handler."""
    try:
        sub_action = detect_playlist_sub_action(transcript, context.language)

        logger.info(
            "Playlist sub-action detected",
            extra={
                "user_id": context.user_id,
                "sub_action": sub_action,
                "transcript": transcript,
            },
        )

        if sub_action == "add":
            return await _handle_add(transcript, context)
        if sub_action == "remove":
            return await _handle_remove(transcript, context)
        if sub_action == "clear":
            return await handle_playlist_clear(context)
        if sub_action == "play":
            return await handle_playlist_play(context)
        return await handle_playlist_review(context)

    except Exception as e:
        logger.error(
            "Playlist handler failed",
            extra={"transcript": transcript, "error": str(e)},
            exc_info=True,
        )
        return {
            "spoken_response": get_error_message("playlist_add_failed", context.language),
            "action": {"type": "playlist", "payload": {"sub_action": "error"}},
        }


async def _handle_add(transcript: str, context: VoiceContext) -> Dict[str, Any]:
    """Search for content and add it to the user's playlist."""
    content_query = extract_content_query(transcript, context.language)
    results = await find_content_for_playlist(content_query, context)

    if not results:
        not_found = PLAYLIST_NOT_FOUND_RESPONSES.get(
            context.language, PLAYLIST_NOT_FOUND_RESPONSES["en"]
        )
        return {
            "spoken_response": not_found,
            "action": {"type": "playlist", "payload": {"sub_action": "add", "items": []}},
        }

    top = results[0]
    content_id = top.get("id", "")
    title = top.get("title", content_query)
    content_type_str = top.get("content_type", "vod")
    thumbnail = top.get("thumbnail")
    duration = top.get("duration")

    playlist = await UserPlaylist.get_or_create(context.user_id)

    # Check duplicate by content_id
    if any(item.content_id == content_id for item in playlist.items):
        spoken = PLAYLIST_ALREADY_EXISTS_RESPONSES.get(
            context.language, PLAYLIST_ALREADY_EXISTS_RESPONSES["en"]
        ).format(title)
        return _build_playlist_response(spoken, "add", playlist.items)

    # Check size limit
    if len(playlist.items) >= MAX_PLAYLIST_ITEMS:
        spoken = PLAYLIST_FULL_RESPONSES.get(
            context.language, PLAYLIST_FULL_RESPONSES["en"]
        ).format(MAX_PLAYLIST_ITEMS)
        return _build_playlist_response(spoken, "add", playlist.items)

    try:
        parsed_type = ContentType(content_type_str)
    except ValueError:
        parsed_type = ContentType.VOD

    new_item = PlaylistItem(
        content_id=content_id,
        content_type=parsed_type,
        title=title,
        thumbnail=thumbnail,
        duration=duration,
        position=len(playlist.items),
    )
    playlist.items.append(new_item)
    playlist.updated_at = datetime.utcnow()
    await playlist.save()

    logger.info(
        "Playlist item added",
        extra={"user_id": context.user_id, "content_id": content_id, "title": title},
    )

    spoken = PLAYLIST_ADDED_RESPONSES.get(
        context.language, PLAYLIST_ADDED_RESPONSES["en"]
    ).format(title)
    return _build_playlist_response(spoken, "add", playlist.items)


async def _handle_remove(transcript: str, context: VoiceContext) -> Dict[str, Any]:
    """Remove content from the user's playlist by fuzzy title match."""
    content_query = extract_content_query(transcript, context.language).lower()
    playlist = await UserPlaylist.get_or_create(context.user_id)

    matched_item = None
    for item in playlist.items:
        if content_query in item.title.lower() or item.title.lower() in content_query:
            matched_item = item
            break

    if not matched_item:
        spoken = PLAYLIST_NOT_FOUND_RESPONSES.get(
            context.language, PLAYLIST_NOT_FOUND_RESPONSES["en"]
        )
        return _build_playlist_response(spoken, "remove", playlist.items)

    playlist.items = [i for i in playlist.items if i.content_id != matched_item.content_id]
    playlist.recalculate_positions()
    playlist.updated_at = datetime.utcnow()
    await playlist.save()

    logger.info(
        "Playlist item removed",
        extra={"user_id": context.user_id, "content_id": matched_item.content_id, "title": matched_item.title},
    )

    spoken = PLAYLIST_REMOVED_RESPONSES.get(
        context.language, PLAYLIST_REMOVED_RESPONSES["en"]
    ).format(matched_item.title)
    return _build_playlist_response(spoken, "remove", playlist.items)


def _build_playlist_response(
    spoken: str, sub_action: str, items: list
) -> Dict[str, Any]:
    """Build standard playlist action response."""
    return {
        "spoken_response": spoken,
        "action": {
            "type": "playlist",
            "payload": {
                "sub_action": sub_action,
                "items": [item.model_dump(mode="json") for item in items],
            },
        },
    }
