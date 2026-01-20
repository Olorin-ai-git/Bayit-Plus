"""
RSS Feed Parser.

Handles parsing of RSS and Atom feeds from various news sources.
"""

import logging
import urllib.parse
from datetime import datetime
from email.utils import parsedate_to_datetime
from typing import List

import httpx
from bs4 import BeautifulSoup

from app.services.news_scraper.constants import (
    MAX_SEARCH_RESULTS,
    MIN_RSS_TITLE_LENGTH,
    REQUEST_TIMEOUT_SECONDS,
    RSS_HEADERS,
)
from app.services.news_scraper.models import HeadlineItem, clean_cdata

logger = logging.getLogger(__name__)


def _parse_rss_item(item: BeautifulSoup, source_name: str) -> HeadlineItem | None:
    """Parse a single RSS item element."""
    title_elem = item.find("title")
    link_elem = item.find("link")
    pubdate_elem = item.find("pubDate")
    source_elem = item.find("source")

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

    return HeadlineItem(
        title=title,
        url=url,
        source=actual_source,
        category="news",
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
                headline = _parse_rss_item(item, source_name)
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
    rss_url = f"https://news.google.com/rss/search?q={encoded_query}&hl=he&gl=IL&ceid=IL:he"

    try:
        async with httpx.AsyncClient(
            timeout=REQUEST_TIMEOUT_SECONDS + 2, follow_redirects=True
        ) as client:
            response = await client.get(rss_url, headers=RSS_HEADERS)

            if response.status_code != 200:
                return headlines

            soup = BeautifulSoup(response.text, "lxml-xml")
            for item in soup.find_all("item")[:max_results]:
                headline = _parse_rss_item(item, "Google News")
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
