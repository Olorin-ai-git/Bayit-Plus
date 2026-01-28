"""
RSS Feed Parser.

Handles parsing of RSS and Atom feeds from various news sources.
"""

import logging
import urllib.parse
from datetime import datetime
from email.utils import parsedate_to_datetime
from typing import List, Optional

import httpx
from bs4 import BeautifulSoup

from app.services.news_scraper.constants import (MAX_SEARCH_RESULTS,
                                                 MIN_RSS_TITLE_LENGTH,
                                                 REQUEST_TIMEOUT_SECONDS,
                                                 RSS_HEADERS)
from app.services.news_scraper.models import HeadlineItem, clean_cdata

logger = logging.getLogger(__name__)

# Generic/useless image patterns to filter out (logos, defaults, etc.)
GENERIC_IMAGE_PATTERNS = [
    "lh3.googleusercontent.com/J6_coFbogxhRI9iM864NL_liGXvsQp2AupsKei7z0cNNfDvGUmWUy20nuUhkREQyrpY4bEeIBuc",  # Google News logo
    "logo",
    "icon",
    "avatar",
    "default",
    "placeholder",
]


def _is_generic_image(image_url: str) -> bool:
    """Check if image URL is a generic logo/icon that should be filtered out."""
    if not image_url:
        return True
    image_lower = image_url.lower()
    return any(pattern.lower() in image_lower for pattern in GENERIC_IMAGE_PATTERNS)


async def _fetch_og_image(url: str) -> Optional[str]:
    """Fetch Open Graph image from article URL as fallback.

    For Google News URLs, follows the redirect to get the actual article URL first.
    """
    try:
        async with httpx.AsyncClient(timeout=5, follow_redirects=True) as client:
            # Follow redirects to get final URL (important for Google News)
            response = await client.get(url, headers=RSS_HEADERS)
            if response.status_code != 200:
                return None

            # Log if we were redirected (helps debug Google News redirects)
            final_url = str(response.url)
            if final_url != url:
                logger.info(f"Followed redirect: {url[:80]}... -> {final_url[:80]}...")

            soup = BeautifulSoup(response.text, "html.parser")

            # Try Open Graph image
            og_image = soup.find("meta", property="og:image")
            if og_image and og_image.get("content"):
                img_url = og_image.get("content")
                # Filter out generic images from OG too
                if not _is_generic_image(img_url):
                    return img_url

            # Try Twitter card image
            twitter_image = soup.find("meta", attrs={"name": "twitter:image"})
            if twitter_image and twitter_image.get("content"):
                img_url = twitter_image.get("content")
                if not _is_generic_image(img_url):
                    return img_url

            # Try first large image in article
            for img in soup.find_all("img"):
                src = img.get("src")
                if src and not any(x in src.lower() for x in ["logo", "icon", "avatar", "pixel", "1x1"]):
                    # Check if image has reasonable dimensions
                    width = img.get("width", "0")
                    height = img.get("height", "0")
                    try:
                        if int(width) >= 300 or int(height) >= 300:
                            if not _is_generic_image(src):
                                return src
                    except (ValueError, TypeError):
                        pass

            return None
    except Exception as e:
        logger.debug(f"Error fetching OG image from {url}: {e}")
        return None


def _extract_image_from_rss(item: BeautifulSoup) -> str | None:
    """Extract image URL from RSS item using multiple strategies. Filters out generic logos."""
    try:
        # Strategy 1: <enclosure> tag (most common in RSS 2.0)
        enclosure = item.find("enclosure")
        if enclosure and enclosure.get("type", "").startswith("image/"):
            img_url = enclosure.get("url")
            if img_url and not _is_generic_image(img_url):
                return img_url

        # Strategy 2: Media RSS namespace (media:content, media:thumbnail)
        media_content = item.find("media:content", {"medium": "image"})
        if media_content and media_content.get("url"):
            img_url = media_content.get("url")
            if not _is_generic_image(img_url):
                return img_url

        media_thumbnail = item.find("media:thumbnail")
        if media_thumbnail and media_thumbnail.get("url"):
            img_url = media_thumbnail.get("url")
            if not _is_generic_image(img_url):
                return img_url

        # Strategy 3: Google News specific - extract from description HTML
        # Google News often includes images in <table> tags within description
        description = item.find("description")
        if description:
            desc_html = description.get_text()
            desc_soup = BeautifulSoup(desc_html, "html.parser")

            # Google News specific: Look for images in table cells
            for td in desc_soup.find_all("td"):
                img = td.find("img")
                if img and img.get("src"):
                    img_url = img.get("src")
                    # Filter out tracking pixels, tiny images, and generic logos
                    if (not any(x in img_url.lower() for x in ["pixel", "tracking", "beacon", "1x1"])
                        and len(img_url) > 20
                        and not _is_generic_image(img_url)):
                        return img_url

            # Fallback: any img tag in description
            img = desc_soup.find("img")
            if img and img.get("src"):
                img_url = img.get("src")
                if (not any(x in img_url.lower() for x in ["pixel", "tracking", "beacon", "1x1"])
                    and len(img_url) > 20
                    and not _is_generic_image(img_url)):
                    return img_url

        # Strategy 4: Look for images in content:encoded
        content_encoded = item.find("content:encoded")
        if content_encoded:
            content_html = content_encoded.get_text()
            content_soup = BeautifulSoup(content_html, "html.parser")
            img = content_soup.find("img")
            if img and img.get("src"):
                img_url = img.get("src")
                if not _is_generic_image(img_url):
                    return img_url

        return None
    except Exception as e:
        logger.debug(f"Error extracting image from RSS item: {e}")
        return None


async def _parse_rss_item(item: BeautifulSoup, source_name: str) -> HeadlineItem | None:
    """Parse a single RSS item element including images with Open Graph fallback."""
    title_elem = item.find("title")
    link_elem = item.find("link")
    pubdate_elem = item.find("pubDate")
    source_elem = item.find("source")
    description_elem = item.find("description")

    if not title_elem or not link_elem:
        return None

    title = clean_cdata(title_elem.get_text(strip=True))
    url = clean_cdata(link_elem.get_text(strip=True))

    if len(title) < MIN_RSS_TITLE_LENGTH:
        return None

    actual_source = source_name
    if source_elem:
        actual_source = clean_cdata(source_elem.get_text(strip=True))

    pub_date = None
    if pubdate_elem:
        try:
            pub_date = parsedate_to_datetime(pubdate_elem.get_text(strip=True))
        except Exception:
            pub_date = datetime.utcnow()

    # Extract summary from description
    summary = None
    if description_elem:
        desc_text = clean_cdata(description_elem.get_text(strip=True))
        # Remove HTML tags for summary
        desc_soup = BeautifulSoup(desc_text, "html.parser")
        summary = desc_soup.get_text(strip=True)[:500]  # Limit to 500 chars

    # Extract image URL from RSS with Open Graph fallback
    image_url = _extract_image_from_rss(item)
    logger.info(f"Extracted image from RSS: {image_url} for article: {title[:50]}")

    # Filter out generic/useless images (Google News logo, etc.)
    if image_url and _is_generic_image(image_url):
        logger.info(f"Filtering out generic image: {image_url}")
        image_url = None

    # If no useful image found in RSS, try fetching Open Graph image from article
    if not image_url and url:
        logger.info(f"No useful RSS image, attempting OG fetch for: {url}")
        try:
            image_url = await _fetch_og_image(url)
            if image_url:
                logger.info(f"Successfully fetched valid OG image: {image_url[:80]}...")
            else:
                logger.info(f"OG fetch returned no valid image (likely all generic)")
        except Exception as e:
            logger.warning(f"Failed to fetch OG image for {url}: {e}")

    return HeadlineItem(
        title=title,
        url=url,
        source=actual_source,
        category="news",
        summary=summary,
        image_url=image_url,
        published_at=pub_date,
    )


async def parse_rss_feed(
    url: str,
    source_name: str,
    timeout: float = REQUEST_TIMEOUT_SECONDS,
) -> List[HeadlineItem]:
    """Parse a generic RSS feed and return headlines."""
    headlines: List[HeadlineItem] = []

    try:
        async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
            response = await client.get(url, headers=RSS_HEADERS)
            response.raise_for_status()

            soup = BeautifulSoup(response.text, "lxml-xml")
            for item in soup.find_all("item")[:MAX_SEARCH_RESULTS]:
                headline = await _parse_rss_item(item, source_name)
                if headline:
                    headlines.append(headline)
    except Exception as e:
        logger.error(f"Error parsing RSS feed {url}: {e}")

    return headlines


async def search_google_news_rss(
    query: str,
    max_results: int = MAX_SEARCH_RESULTS,
) -> List[HeadlineItem]:
    """Search Google News RSS for fresh news content."""
    headlines: List[HeadlineItem] = []
    encoded_query = urllib.parse.quote(query)
    rss_url = (
        f"https://news.google.com/rss/search?q={encoded_query}&hl=he&gl=IL&ceid=IL:he"
    )

    try:
        async with httpx.AsyncClient(
            timeout=REQUEST_TIMEOUT_SECONDS + 2, follow_redirects=True
        ) as client:
            response = await client.get(rss_url, headers=RSS_HEADERS)

            if response.status_code != 200:
                return headlines

            soup = BeautifulSoup(response.text, "lxml-xml")
            for item in soup.find_all("item")[:max_results]:
                headline = await _parse_rss_item(item, "Google News")
                if headline:
                    headlines.append(headline)
    except Exception as e:
        logger.error(f"Error fetching Google News RSS for '{query}': {e}")

    return headlines


async def search_duckduckgo(
    query: str,
    max_results: int = MAX_SEARCH_RESULTS,
) -> List[HeadlineItem]:
    """Search DuckDuckGo HTML for news content (fallback when Google News fails)."""
    headlines: List[HeadlineItem] = []

    try:
        search_url = f"https://html.duckduckgo.com/html/?q={urllib.parse.quote(query)}"

        async with httpx.AsyncClient(
            timeout=REQUEST_TIMEOUT_SECONDS, follow_redirects=True
        ) as client:
            response = await client.get(
                search_url, headers={**RSS_HEADERS, "Accept": "text/html"}
            )

            if response.status_code != 200:
                return headlines

            soup = BeautifulSoup(response.text, "html.parser")
            seen_urls: set[str] = set()
            skip_domains = [
                "facebook.com",
                "twitter.com",
                "instagram.com",
                "youtube.com",
                "wikipedia.org",
                "tiktok.com",
            ]

            for result in soup.select(".result__a"):
                if len(headlines) >= max_results:
                    break

                title = clean_cdata(result.get_text(strip=True))
                href = clean_cdata(result.get("href", ""))

                if not title or len(title) < MIN_RSS_TITLE_LENGTH or not href:
                    continue

                if "uddg=" in href:
                    parsed = urllib.parse.parse_qs(urllib.parse.urlparse(href).query)
                    if "uddg" in parsed:
                        href = parsed["uddg"][0]

                if href in seen_urls:
                    continue
                seen_urls.add(href)

                if any(domain in href.lower() for domain in skip_domains):
                    continue

                summary = None
                snippet = result.find_next_sibling("a", class_="result__snippet")
                if snippet:
                    summary = clean_cdata(snippet.get_text(strip=True))

                headlines.append(
                    HeadlineItem(
                        title=title,
                        url=href,
                        source="web_search",
                        category="news",
                        summary=summary,
                    )
                )
    except Exception as e:
        logger.error(f"Error searching DuckDuckGo for '{query}': {e}")

    return headlines
