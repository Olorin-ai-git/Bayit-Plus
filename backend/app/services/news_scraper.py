"""
Israeli News Scraper Service.
Scrapes headlines and trending topics from major Israeli news sites.
"""
import asyncio
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from dataclasses import dataclass, field
from bs4 import BeautifulSoup
import httpx
import hashlib
import re


@dataclass
class HeadlineItem:
    """A single news headline"""
    title: str
    url: str
    source: str  # ynet, walla, mako
    category: Optional[str] = None
    image_url: Optional[str] = None
    summary: Optional[str] = None
    published_at: Optional[datetime] = None
    scraped_at: datetime = field(default_factory=datetime.utcnow)

    @property
    def id(self) -> str:
        """Generate unique ID from URL"""
        return hashlib.md5(self.url.encode()).hexdigest()[:12]


@dataclass
class ScrapedNews:
    """Collection of scraped news from all sources"""
    headlines: List[HeadlineItem]
    sources: List[str]
    scraped_at: datetime = field(default_factory=datetime.utcnow)
    error_sources: List[str] = field(default_factory=list)


# Common headers for requests
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7",
}


async def scrape_ynet() -> List[HeadlineItem]:
    """
    Scrape headlines from Ynet (ynet.co.il)
    Israel's most popular news site.
    """
    headlines = []
    url = "https://www.ynet.co.il/"

    try:
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            response = await client.get(url, headers=HEADERS)
            response.raise_for_status()

            soup = BeautifulSoup(response.text, "html.parser")

            # Main headlines - look for headline elements
            # Ynet uses various class patterns for headlines
            headline_selectors = [
                "div.slotTitle a",
                "h2.title a",
                "a.smallheader",
                "div.TopStoryComponenta a.title",
                "div.slotView a.slotTitle",
            ]

            seen_urls = set()

            for selector in headline_selectors:
                elements = soup.select(selector)
                for elem in elements[:15]:  # Limit per selector
                    title = elem.get_text(strip=True)
                    href = elem.get("href", "")

                    if not title or len(title) < 10:
                        continue

                    # Build full URL
                    if href.startswith("/"):
                        href = f"https://www.ynet.co.il{href}"
                    elif not href.startswith("http"):
                        continue

                    if href in seen_urls:
                        continue
                    seen_urls.add(href)

                    # Try to extract category from URL
                    category = None
                    if "/news/" in href:
                        category = "news"
                    elif "/sport/" in href:
                        category = "sports"
                    elif "/entertainment/" in href:
                        category = "entertainment"
                    elif "/economy/" in href:
                        category = "economy"
                    elif "/digital/" in href:
                        category = "tech"

                    headlines.append(
                        HeadlineItem(
                            title=title,
                            url=href,
                            source="ynet",
                            category=category,
                        )
                    )

                    if len(headlines) >= 20:
                        break

    except Exception as e:
        print(f"Error scraping Ynet: {e}")

    return headlines


async def scrape_walla() -> List[HeadlineItem]:
    """
    Scrape headlines from Walla News (news.walla.co.il)
    """
    headlines = []
    url = "https://news.walla.co.il/"

    try:
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            response = await client.get(url, headers=HEADERS)
            response.raise_for_status()

            soup = BeautifulSoup(response.text, "html.parser")

            # Walla headline selectors
            headline_selectors = [
                "h3.title a",
                "a.title",
                "div.fc-item-title a",
                "article h2 a",
            ]

            seen_urls = set()

            for selector in headline_selectors:
                elements = soup.select(selector)
                for elem in elements[:15]:
                    title = elem.get_text(strip=True)
                    href = elem.get("href", "")

                    if not title or len(title) < 10:
                        continue

                    if href.startswith("/"):
                        href = f"https://news.walla.co.il{href}"
                    elif not href.startswith("http"):
                        continue

                    if href in seen_urls:
                        continue
                    seen_urls.add(href)

                    # Category detection
                    category = None
                    if "/break/" in href or "/item/" in href:
                        category = "breaking"
                    elif "/sports/" in href:
                        category = "sports"
                    elif "/biztech/" in href:
                        category = "tech"

                    headlines.append(
                        HeadlineItem(
                            title=title,
                            url=href,
                            source="walla",
                            category=category,
                        )
                    )

                    if len(headlines) >= 20:
                        break

    except Exception as e:
        print(f"Error scraping Walla: {e}")

    return headlines


async def scrape_mako() -> List[HeadlineItem]:
    """
    Scrape headlines from Mako (mako.co.il)
    Keshet's news portal.
    """
    headlines = []
    url = "https://www.mako.co.il/news"

    try:
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            response = await client.get(url, headers=HEADERS)
            response.raise_for_status()

            soup = BeautifulSoup(response.text, "html.parser")

            # Mako headline selectors
            headline_selectors = [
                "h3 a",
                "h2.title a",
                "div.headline a",
                "a.article-title",
            ]

            seen_urls = set()

            for selector in headline_selectors:
                elements = soup.select(selector)
                for elem in elements[:15]:
                    title = elem.get_text(strip=True)
                    href = elem.get("href", "")

                    if not title or len(title) < 10:
                        continue

                    if href.startswith("/"):
                        href = f"https://www.mako.co.il{href}"
                    elif not href.startswith("http"):
                        continue

                    if href in seen_urls:
                        continue
                    seen_urls.add(href)

                    # Category from URL path
                    category = None
                    if "/politics/" in href or "/military/" in href:
                        category = "politics"
                    elif "/sports/" in href:
                        category = "sports"
                    elif "/entertainment/" in href:
                        category = "entertainment"
                    elif "/money/" in href:
                        category = "economy"

                    headlines.append(
                        HeadlineItem(
                            title=title,
                            url=href,
                            source="mako",
                            category=category,
                        )
                    )

                    if len(headlines) >= 20:
                        break

    except Exception as e:
        print(f"Error scraping Mako: {e}")

    return headlines


async def scrape_all_sources() -> ScrapedNews:
    """
    Scrape all news sources concurrently.
    Returns aggregated headlines from all sources.
    """
    sources = ["ynet", "walla", "mako"]
    error_sources = []

    # Run all scrapers concurrently
    results = await asyncio.gather(
        scrape_ynet(),
        scrape_walla(),
        scrape_mako(),
        return_exceptions=True
    )

    all_headlines = []

    for i, result in enumerate(results):
        if isinstance(result, Exception):
            error_sources.append(sources[i])
            print(f"Error from {sources[i]}: {result}")
        elif isinstance(result, list):
            all_headlines.extend(result)

    # Sort by scraped_at (most recent first)
    all_headlines.sort(key=lambda x: x.scraped_at, reverse=True)

    return ScrapedNews(
        headlines=all_headlines,
        sources=[s for s in sources if s not in error_sources],
        error_sources=error_sources,
    )


def headlines_to_dict(headlines: List[HeadlineItem]) -> List[Dict[str, Any]]:
    """Convert headlines to dictionary format for API response"""
    return [
        {
            "id": h.id,
            "title": h.title,
            "url": h.url,
            "source": h.source,
            "category": h.category,
            "image_url": h.image_url,
            "summary": h.summary,
            "scraped_at": h.scraped_at.isoformat(),
        }
        for h in headlines
    ]


# Simple in-memory cache
_cache: Dict[str, Any] = {}
_cache_ttl = timedelta(minutes=30)


async def get_cached_headlines() -> ScrapedNews:
    """
    Get headlines with caching.
    Headlines are cached for 30 minutes.
    """
    cache_key = "headlines"
    now = datetime.utcnow()

    if cache_key in _cache:
        cached_data, cached_at = _cache[cache_key]
        if now - cached_at < _cache_ttl:
            return cached_data

    # Fetch fresh data
    news = await scrape_all_sources()
    _cache[cache_key] = (news, now)

    return news


def clear_cache():
    """Clear the headlines cache"""
    global _cache
    _cache = {}
