"""
RSS feed fetcher for B2B BYOC source sync.

Parses RSS/Atom feeds for video enclosures and media links.
"""

from typing import List
from xml.etree import ElementTree

import httpx

from app.core.logging_config import get_logger
from app.models.b2b_content_source import B2BContentSource

logger = get_logger(__name__)


async def fetch_rss_feed(
    source: B2BContentSource,
) -> List[tuple[str, str]]:
    """Parse an RSS feed for video enclosures or media links."""
    try:
        async with httpx.AsyncClient(
            timeout=30.0, follow_redirects=True,
        ) as client:
            resp = await client.get(source.source_url)
            if resp.status_code != 200:
                return []
            xml_text = resp.text
    except Exception:
        logger.warning(
            "RSS feed fetch failed",
            extra={"url": source.source_url},
        )
        return []

    results: List[tuple[str, str]] = []
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
