"""
Source-Specific Scrapers.

Individual scraper implementations for Israeli news sources (Ynet, Walla, Mako).
"""

import logging
from typing import List

import httpx
from bs4 import BeautifulSoup

from app.services.news_scraper.constants import (HEADERS, MIN_TITLE_LENGTH,
                                                 REQUEST_TIMEOUT_SECONDS)
from app.services.news_scraper.html_scraper import scrape_headlines_from_html
from app.services.news_scraper.models import HeadlineItem, clean_cdata

logger = logging.getLogger(__name__)


def _extract_ynet_category(href: str) -> str | None:
    """Extract category from Ynet URL path."""
    if "/news/" in href or "/breaking/" in href:
        return "news"
    if "/sport/" in href:
        return "sports"
    if "/entertainment/" in href or "/celebs/" in href:
        return "entertainment"
    if "/economy/" in href or "/money/" in href:
        return "economy"
    if "/digital/" in href or "/tech/" in href:
        return "tech"
    return None


async def scrape_ynet() -> List[HeadlineItem]:
    """Scrape headlines from Ynet RSS feed (ynet.co.il)."""
    headlines: List[HeadlineItem] = []

    try:
        async with httpx.AsyncClient(
            timeout=REQUEST_TIMEOUT_SECONDS + 5, follow_redirects=True
        ) as client:
            rss_url = "https://www.ynet.co.il/Integration/StoryRss2.xml"
            response = await client.get(rss_url, headers=HEADERS)
            response.raise_for_status()

            soup = BeautifulSoup(response.text, "html.parser")
            for item in soup.find_all("item")[:20]:
                title_elem = item.find("title")
                guid_elem = item.find("guid")

                if not title_elem:
                    continue

                title = clean_cdata(title_elem.get_text(strip=True))
                href = clean_cdata(guid_elem.get_text(strip=True)) if guid_elem else ""

                if not title or len(title) < MIN_TITLE_LENGTH + 2 or not href:
                    continue
                if not href.startswith("http"):
                    continue

                headlines.append(
                    HeadlineItem(
                        title=title,
                        url=href,
                        source="ynet",
                        category=_extract_ynet_category(href),
                    )
                )
    except Exception as e:
        logger.warning(f"Error scraping Ynet RSS: {e}")
        headlines = await _scrape_ynet_html_fallback()

    return headlines


async def _scrape_ynet_html_fallback() -> List[HeadlineItem]:
    """Fallback HTML scraper for Ynet when RSS fails."""
    headlines: List[HeadlineItem] = []

    try:
        async with httpx.AsyncClient(
            timeout=REQUEST_TIMEOUT_SECONDS + 5, follow_redirects=True
        ) as client:
            response = await client.get("https://www.ynet.co.il/", headers=HEADERS)
            response.raise_for_status()
            soup = BeautifulSoup(response.text, "html.parser")

            for link in soup.find_all("a", href=True)[:50]:
                href = clean_cdata(link.get("href", ""))
                title = clean_cdata(link.get_text(strip=True))

                if not title or len(title) < MIN_TITLE_LENGTH + 4:
                    continue
                if "/articles/" not in href:
                    continue
                if not any(year in href for year in ["2024", "2025", "2026"]):
                    continue

                if href.startswith("/"):
                    href = f"https://www.ynet.co.il{href}"
                elif not href.startswith("http"):
                    continue

                headlines.append(HeadlineItem(title=title, url=href, source="ynet"))
                if len(headlines) >= 20:
                    break
    except Exception as e:
        logger.error(f"Error in Ynet fallback: {e}")

    return headlines


def _extract_walla_category(href: str) -> str | None:
    """Extract category from Walla URL path."""
    if "/item/" in href or "/break/" in href:
        return "news"
    if "/sports/" in href:
        return "sports"
    if "/biztech/" in href or "/tech/" in href:
        return "tech"
    if "/gallery/" in href:
        return "entertainment"
    return None


async def scrape_walla() -> List[HeadlineItem]:
    """Scrape headlines from Walla News (news.walla.co.il)."""
    selectors = [
        "a[href*='news/item']",
        "h2 a",
        "h3 a",
        "article h2 a",
        "[class*='headline'] a",
        "a[class*='article']",
    ]
    return await scrape_headlines_from_html(
        url="https://news.walla.co.il/",
        source_name="walla",
        selectors=selectors,
        url_filter="walla.co.il",
        base_url="https://news.walla.co.il",
        category_extractor=_extract_walla_category,
    )


def _extract_mako_category(href: str) -> str | None:
    """Extract category from Mako URL path."""
    if "/news/" in href:
        return "news"
    if "/politics/" in href or "/military/" in href:
        return "politics"
    if "/sports/" in href:
        return "sports"
    if "/entertainment/" in href or "/celebs/" in href:
        return "entertainment"
    if "/money/" in href:
        return "economy"
    if "/covid/" in href or "/health/" in href:
        return "health"
    return None


async def scrape_mako() -> List[HeadlineItem]:
    """Scrape headlines from Mako (mako.co.il), Keshet's news portal."""
    selectors = [
        "a[href*='/news/']",
        "h2 a",
        "h3 a",
        "article a",
        "[class*='headline'] a",
        "a[class*='title']",
    ]
    return await scrape_headlines_from_html(
        url="https://www.mako.co.il/",
        source_name="mako",
        selectors=selectors,
        url_filter="mako.co.il",
        base_url="https://www.mako.co.il",
        category_extractor=_extract_mako_category,
    )
