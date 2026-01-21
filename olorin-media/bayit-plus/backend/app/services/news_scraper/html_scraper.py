"""
HTML Scraping Utilities.

Common utilities for scraping headlines from HTML pages.
"""

import logging
from typing import Callable, List

import httpx
from bs4 import BeautifulSoup

from app.services.news_scraper.constants import (HEADERS,
                                                 MAX_HEADLINES_PER_SOURCE,
                                                 MIN_TITLE_LENGTH,
                                                 REQUEST_TIMEOUT_SECONDS)
from app.services.news_scraper.models import HeadlineItem, clean_cdata

logger = logging.getLogger(__name__)


async def scrape_headlines_from_html(
    url: str,
    source_name: str,
    selectors: List[str],
    url_filter: str,
    base_url: str,
    category_extractor: Callable[[str], str | None],
) -> List[HeadlineItem]:
    """
    Generic HTML scraper for news headlines.

    Args:
        url: The page URL to scrape
        source_name: Name of the source for attribution
        selectors: List of CSS selectors to try
        url_filter: String that must be in the URL to be valid
        base_url: Base URL for resolving relative links
        category_extractor: Function to extract category from URL

    Returns:
        List of HeadlineItem objects
    """
    headlines: List[HeadlineItem] = []

    try:
        async with httpx.AsyncClient(
            timeout=REQUEST_TIMEOUT_SECONDS + 5,
            follow_redirects=True,
        ) as client:
            response = await client.get(url, headers=HEADERS)
            response.raise_for_status()

            soup = BeautifulSoup(response.text, "html.parser")
            seen_urls: set[str] = set()

            for selector in selectors:
                try:
                    elements = soup.select(selector)
                    for elem in elements[:20]:
                        title = clean_cdata(elem.get_text(strip=True))
                        href = clean_cdata(elem.get("href", ""))

                        if not title or len(title) < MIN_TITLE_LENGTH:
                            continue

                        if href.startswith("/"):
                            href = f"{base_url}{href}"
                        elif not href.startswith("http"):
                            continue

                        if href in seen_urls or url_filter not in href:
                            continue
                        seen_urls.add(href)

                        category = category_extractor(href)

                        headlines.append(
                            HeadlineItem(
                                title=title,
                                url=href,
                                source=source_name,
                                category=category,
                            )
                        )

                        if len(headlines) >= MAX_HEADLINES_PER_SOURCE:
                            break
                except Exception:
                    continue

                if len(headlines) >= MAX_HEADLINES_PER_SOURCE:
                    break

    except Exception as e:
        logger.error(f"Error scraping {source_name}: {e}")

    return headlines
