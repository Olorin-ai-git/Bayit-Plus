"""
Spotify Podcast URL to RSS Feed Converter.
Resolves Spotify podcast URLs to RSS feeds via Spotify oEmbed + iTunes search.
"""

import logging
import re
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

SPOTIFY_OEMBED_URL = "https://open.spotify.com/oembed"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
}


def extract_show_id_from_spotify_url(url: str) -> Optional[str]:
    """Extract show ID from a Spotify podcast URL.

    Supported formats:
        https://open.spotify.com/show/{id}
        https://open.spotify.com/show/{id}?si=...
    """
    match = re.search(r"open\.spotify\.com/show/([a-zA-Z0-9]+)", url)
    return match.group(1) if match else None


async def get_show_name_from_spotify(url: str) -> Optional[str]:
    """Get podcast show name from Spotify oEmbed API."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                SPOTIFY_OEMBED_URL,
                params={"url": url},
                headers=HEADERS,
            )
            response.raise_for_status()
            data = response.json()
            return data.get("title")
    except Exception as e:
        logger.error(
            "Failed to get show name from Spotify oEmbed",
            extra={"url": url, "error": str(e)},
        )
        return None


async def search_itunes_for_rss(show_name: str) -> Optional[str]:
    """Search iTunes API for a podcast by name, return best RSS match."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                "https://itunes.apple.com/search",
                params={
                    "term": show_name,
                    "media": "podcast",
                    "limit": 5,
                },
                headers=HEADERS,
            )
            response.raise_for_status()
            data = response.json()

            results = data.get("results", [])
            if not results:
                return None

            # Return the first result's feed URL
            return results[0].get("feedUrl")
    except Exception as e:
        logger.error(
            "iTunes search failed",
            extra={"show_name": show_name, "error": str(e)},
        )
        return None


async def resolve_spotify_to_rss(spotify_url: str) -> Optional[dict]:
    """Resolve a Spotify podcast URL to RSS feed information.

    Flow: Spotify URL -> oEmbed (get show name) -> iTunes search -> RSS URL

    Returns:
        Dict with spotify_url, show_name, rss_url or None if resolution failed.
    """
    show_id = extract_show_id_from_spotify_url(spotify_url)
    if not show_id:
        logger.warning(
            "Could not extract show ID from Spotify URL",
            extra={"url": spotify_url},
        )
        return None

    show_name = await get_show_name_from_spotify(spotify_url)
    if not show_name:
        logger.warning(
            "Could not resolve Spotify show name",
            extra={"url": spotify_url, "show_id": show_id},
        )
        return None

    rss_url = await search_itunes_for_rss(show_name)
    if not rss_url:
        logger.warning(
            "Could not find RSS feed for Spotify podcast via iTunes",
            extra={"show_name": show_name, "show_id": show_id},
        )
        return None

    logger.info(
        "Resolved Spotify podcast to RSS",
        extra={
            "show_name": show_name,
            "show_id": show_id,
            "rss_url": rss_url,
        },
    )

    return {
        "spotify_url": spotify_url,
        "show_name": show_name,
        "rss_url": rss_url,
    }
