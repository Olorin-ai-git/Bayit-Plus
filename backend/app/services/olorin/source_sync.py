"""
B2B Source Sync Service

Fetches new videos from connected sources (YouTube channels, playlists,
RSS feeds) and auto-submits them to the orchestrated ingest pipeline.
"""

from datetime import datetime, timezone
from typing import List
from xml.etree import ElementTree

import httpx

from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.b2b_content_source import B2BContentSource
from app.models.content import Content
from app.models.integration_partner import IntegrationPartner

logger = get_logger(__name__)

YT_API_BASE = "https://www.googleapis.com/youtube/v3"


async def sync_source(
    source: B2BContentSource,
    partner: IntegrationPartner,
) -> int:
    """
    Sync a content source. Returns count of new videos ingested.

    Dispatches to the appropriate fetcher based on source_type,
    creates Content documents, and submits to the ingest pipeline.
    """
    fetcher = _FETCHERS.get(source.source_type)
    if not fetcher:
        logger.warning(
            "Unknown source type",
            extra={"source_type": source.source_type},
        )
        return 0

    video_urls = await fetcher(source)
    existing = set(source.content_ids)
    new_count = 0

    for url, title in video_urls:
        content = Content(
            title=title or "Untitled",
            description=f"Auto-synced from {source.name}",
            stream_url=url,
        )
        await content.insert()
        content_id = str(content.id)

        if content_id not in existing:
            source.content_ids.append(content_id)

        if source.auto_process:
            await _submit_to_pipeline(
                content, partner, source.capabilities, url,
            )

        new_count += 1

    return new_count


async def _submit_to_pipeline(
    content: Content,
    partner: IntegrationPartner,
    capabilities: List[str],
    video_url: str,
) -> None:
    """Submit a video to the orchestrated ingest pipeline."""
    from app.services.olorin.ingest_orchestrator import (
        create_ingest_job,
        run_pipeline,
    )

    job = await create_ingest_job(
        partner=partner,
        content=content,
        video_url=video_url,
        capabilities=capabilities,
    )

    import asyncio
    asyncio.create_task(run_pipeline(job))

    logger.info(
        "Auto-submitted to pipeline",
        extra={
            "content_id": str(content.id),
            "job_id": job.job_id,
            "capabilities": capabilities,
        },
    )


# ---------------------------------------------------------------------------
# Source-type fetchers — each returns list of (url, title) tuples
# ---------------------------------------------------------------------------

async def _fetch_youtube_channel(
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
    from urllib.parse import urlparse

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


async def _fetch_youtube_playlist(
    source: B2BContentSource,
) -> List[tuple[str, str]]:
    """Fetch videos from a YouTube playlist."""
    api_key = settings.YOUTUBE_API_KEY
    if not api_key:
        return []

    from urllib.parse import parse_qs, urlparse
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


async def _fetch_rss_feed(
    source: B2BContentSource,
) -> List[tuple[str, str]]:
    """Parse an RSS feed for video enclosures or media links."""
    async with httpx.AsyncClient(
        timeout=30.0, follow_redirects=True,
    ) as client:
        resp = await client.get(source.source_url)
        if resp.status_code != 200:
            return []
        xml_text = resp.text

    results = []
    try:
        root = ElementTree.fromstring(xml_text)
        ns = {
            "media": "http://search.yahoo.com/mrss/",
            "atom": "http://www.w3.org/2005/Atom",
        }

        for item in root.iter("item"):
            title_el = item.find("title")
            title = title_el.text if title_el is not None else ""

            # Check <enclosure> for video
            enclosure = item.find("enclosure")
            if enclosure is not None:
                enc_type = enclosure.get("type", "")
                if "video" in enc_type:
                    results.append((enclosure.get("url", ""), title))
                    continue

            # Check <media:content>
            media = item.find("media:content", ns)
            if media is not None:
                results.append((media.get("url", ""), title))
                continue

            # Fallback: <link> element
            link_el = item.find("link")
            if link_el is not None and link_el.text:
                url = link_el.text.strip()
                if any(url.endswith(ext) for ext in (
                    ".mp4", ".webm", ".mov",
                )):
                    results.append((url, title))

    except ElementTree.ParseError:
        logger.warning(
            "RSS parse failed",
            extra={"url": source.source_url},
        )

    return results


async def _fetch_manual(
    source: B2BContentSource,
) -> List[tuple[str, str]]:
    """Manual sources have no auto-fetch — return empty."""
    return []


_FETCHERS = {
    "youtube_channel": _fetch_youtube_channel,
    "playlist": _fetch_youtube_playlist,
    "rss": _fetch_rss_feed,
    "manual": _fetch_manual,
}
