"""
Plex Media Server fetcher for B2B BYOC source sync.

Connects to a partner's Plex server via its HTTP API to enumerate
movie and show libraries. The X-Plex-Token is extracted from the
source_url query string -- the full URL is never logged.
"""

from typing import List
from urllib.parse import parse_qs, urlparse

import httpx

from app.core.logging_config import get_logger
from app.models.b2b_content_source import B2BContentSource

logger = get_logger(__name__)


async def fetch_plex(
    source: B2BContentSource,
) -> List[tuple[str, str]]:
    """Fetch library items from a Plex Media Server.

    Expects ``source.source_url`` in the form:
        ``http(s)://<host>:<port>?X-Plex-Token=<token>``

    Returns list of ``(stream_url, title)`` tuples.
    """
    parsed = urlparse(source.source_url)
    qs = parse_qs(parsed.query)
    token_values = qs.get("X-Plex-Token", [])
    if not token_values:
        logger.warning(
            "Plex source missing X-Plex-Token",
            extra={"host": parsed.hostname},
        )
        return []

    token = token_values[0]
    base_url = f"{parsed.scheme}://{parsed.netloc}"
    headers = {"X-Plex-Token": token, "Accept": "application/json"}

    results: List[tuple[str, str]] = []
    async with httpx.AsyncClient(timeout=30.0) as client:
        sections_resp = await client.get(
            f"{base_url}/library/sections", headers=headers,
        )
        if sections_resp.status_code != 200:
            logger.warning(
                "Plex sections request failed",
                extra={
                    "host": parsed.hostname,
                    "status": sections_resp.status_code,
                },
            )
            return []

        container = sections_resp.json().get("MediaContainer", {})
        for directory in container.get("Directory", []):
            if directory.get("type") not in ("movie", "show"):
                continue

            key = directory.get("key")
            all_resp = await client.get(
                f"{base_url}/library/sections/{key}/all",
                headers=headers,
            )
            if all_resp.status_code != 200:
                continue

            items_container = all_resp.json().get("MediaContainer", {})
            for meta in items_container.get("Metadata", []):
                title = meta.get("title", "")
                rating_key = meta.get("ratingKey", "")
                if title and rating_key:
                    stream_url = (
                        f"{base_url}/library/metadata/{rating_key}"
                    )
                    results.append((stream_url, title))

    logger.info(
        "Plex fetch complete",
        extra={
            "host": parsed.hostname,
            "item_count": len(results),
        },
    )
    return results
