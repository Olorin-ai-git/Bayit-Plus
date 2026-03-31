"""
IPTV M3U playlist fetcher for B2B BYOC source sync.

Parses M3U/M3U8 playlists, extracting channel titles from #EXTINF
directives and their associated stream URLs.
"""

import re
from typing import List

import httpx

from app.core.logging_config import get_logger
from app.models.b2b_content_source import B2BContentSource

logger = get_logger(__name__)

_EXTINF_RE = re.compile(r"#EXTINF:\s*-?\d+(?:\s+[^,]*)?,\s*(.+)")


async def fetch_iptv(
    source: B2BContentSource,
) -> List[tuple[str, str]]:
    """Parse an M3U/M3U8 playlist and return stream entries.

    Each ``#EXTINF:`` line provides the title; the following
    non-comment, non-empty line is the stream URL.

    Returns list of ``(stream_url, title)`` tuples.
    """
    try:
        async with httpx.AsyncClient(
            timeout=30.0, follow_redirects=True,
        ) as client:
            resp = await client.get(source.source_url)
            if resp.status_code != 200:
                logger.warning(
                    "IPTV playlist fetch returned non-200",
                    extra={
                        "url": source.source_url,
                        "status": resp.status_code,
                    },
                )
                return []
            body = resp.text
    except Exception:
        logger.warning(
            "IPTV playlist fetch failed",
            extra={"url": source.source_url},
        )
        return []

    results: List[tuple[str, str]] = []
    lines = body.splitlines()
    pending_title = ""

    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue

        match = _EXTINF_RE.match(stripped)
        if match:
            pending_title = match.group(1).strip()
            continue

        if stripped.startswith("#"):
            continue

        # Non-comment, non-empty line after #EXTINF is the stream URL
        if pending_title:
            results.append((stripped, pending_title))
            pending_title = ""

    logger.info(
        "IPTV fetch complete",
        extra={
            "url": source.source_url,
            "channel_count": len(results),
        },
    )
    return results
