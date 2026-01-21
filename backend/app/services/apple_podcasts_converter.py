"""
Apple Podcasts to RSS Feed Converter
Converts Apple Podcasts URLs to RSS feed URLs using the iTunes API.
"""

import logging
import re
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
}


def extract_podcast_id_from_apple_url(apple_url: str) -> Optional[str]:
    """
    Extract podcast ID from Apple Podcasts URL.

    Examples:
        https://podcasts.apple.com/us/podcast/title/id1643491580
        https://podcasts.apple.com/podcast/title/id1643491580

    Args:
        apple_url: Apple Podcasts URL

    Returns:
        Podcast ID or None if not found
    """
    # Match pattern: id followed by digits
    match = re.search(r"/id(\d+)", apple_url)
    if match:
        return match.group(1)
    return None


async def get_rss_from_podcast_id(podcast_id: str) -> Optional[str]:
    """
    Get RSS feed URL from Apple podcast ID using iTunes API.

    Args:
        podcast_id: Apple Podcasts ID (just the number)

    Returns:
        RSS feed URL or None if not found
    """
    try:
        # Use iTunes Search API to lookup the podcast
        itunes_url = f"https://itunes.apple.com/lookup?id={podcast_id}&entity=podcast"

        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(itunes_url, headers=HEADERS)
            response.raise_for_status()

            data = response.json()

            if data.get("resultCount", 0) == 0:
                logger.warning(f"Podcast not found in iTunes: {podcast_id}")
                return None

            podcast = data["results"][0]
            rss_url = podcast.get("feedUrl")

            if rss_url:
                logger.info(f"✅ Found RSS feed for podcast {podcast_id}")
                logger.info(f"   Podcast: {podcast.get('trackName', 'Unknown')}")
                logger.info(f"   RSS: {rss_url}")
                return rss_url
            else:
                logger.warning(
                    f"No RSS feed found in iTunes response for: {podcast_id}"
                )
                return None

    except Exception as e:
        logger.error(f"Failed to get RSS from iTunes API: {str(e)}")
        return None


async def convert_apple_podcasts_to_rss(apple_url: str) -> Optional[dict]:
    """
    Convert Apple Podcasts URL to RSS feed information.

    Args:
        apple_url: Apple Podcasts URL

    Returns:
        Dictionary with podcast info including RSS URL, or None if conversion failed
    """
    # Extract podcast ID
    podcast_id = extract_podcast_id_from_apple_url(apple_url)

    if not podcast_id:
        logger.error(f"Could not extract podcast ID from URL: {apple_url}")
        return None

    logger.info(f"📱 Apple Podcasts URL detected")
    logger.info(f"   ID: {podcast_id}")
    logger.info(f"   URL: {apple_url}")

    # Get RSS feed from iTunes API
    rss_url = await get_rss_from_podcast_id(podcast_id)

    if not rss_url:
        return None

    return {
        "apple_url": apple_url,
        "podcast_id": podcast_id,
        "rss_url": rss_url,
    }
