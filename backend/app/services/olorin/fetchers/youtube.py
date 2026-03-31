"""
YouTube fetchers for B2B BYOC source sync.

Handles both channel and playlist source types via the YouTube Data API v3.
"""

from typing import List
from urllib.parse import parse_qs, urlparse

import httpx

from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.b2b_content_source import B2BContentSource

logger = get_logger(__name__)

YT_API_BASE = "https://www.googleapis.com/youtube/v3"


async def fetch_youtube_channel(
    source: B2BContentSource,
) -> List[tuple[str, str]]:
    """Fetch recent videos from a YouTube channel."""
    api_key = settings.YOUTUBE_API_KEY
    if not api_key:
        logger.warning("YOUTUBE_API_KEY not configured")
        return []

    channel_id = await _resolve_youtube_channel_id(
        source.source_url, api_key,
    )
    if not channel_id:
        return []

    params = {
        "key": api_key,
        "channelId": channel_id,
        "part": "snippet",
        "type": "video",
        "order": "date",
        "maxResults": 25,
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(f"{YT_API_BASE}/search", params=params)
        if resp.status_code != 200:
            logger.warning(
                "YouTube search API error",
                extra={"status": resp.status_code},
            )
            return []
        data = resp.json()

    results = []
    for item in data.get("items", []):
        video_id = item.get("id", {}).get("videoId")
        title = item.get("snippet", {}).get("title", "")
        if video_id:
            results.append((
                f"https://www.youtube.com/watch?v={video_id}",
                title,
            ))
    return results


async def _resolve_youtube_channel_id(
    url: str, api_key: str,
) -> str:
    """Resolve a YouTube channel URL to a channel ID."""
    parsed = urlparse(url)
    path = parsed.path.strip("/")

    # Direct channel ID: youtube.com/channel/UCxxxxxx
    if path.startswith("channel/"):
        return path.split("/")[1]

    # Handle @username format: youtube.com/@handle
    handle = None
    if path.startswith("@"):
        handle = path
    elif "/" in path and path.split("/")[0] == "c":
        handle = path.split("/")[1]

    if handle:
        params = {
            "key": api_key,
            "forHandle": handle.lstrip("@"),
            "part": "id",
        }
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                f"{YT_API_BASE}/channels", params=params,
            )
            if resp.status_code == 200:
                items = resp.json().get("items", [])
                if items:
                    return items[0]["id"]

    return ""


async def fetch_youtube_playlist(
    source: B2BContentSource,
) -> List[tuple[str, str]]:
    """Fetch videos from a YouTube playlist."""
    api_key = settings.YOUTUBE_API_KEY
    if not api_key:
        return []

    parsed = urlparse(source.source_url)
    qs = parse_qs(parsed.query)
    playlist_id = qs.get("list", [""])[0]
    if not playlist_id:
        return []

    params = {
        "key": api_key,
        "playlistId": playlist_id,
        "part": "snippet",
        "maxResults": 50,
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(
            f"{YT_API_BASE}/playlistItems", params=params,
        )
        if resp.status_code != 200:
            return []
        data = resp.json()

    results = []
    for item in data.get("items", []):
        vid = item.get("snippet", {}).get("resourceId", {}).get("videoId")
        title = item.get("snippet", {}).get("title", "")
        if vid:
            results.append((
                f"https://www.youtube.com/watch?v={vid}",
                title,
            ))
    return results
