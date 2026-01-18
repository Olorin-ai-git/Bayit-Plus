"""
Israeli News Scraper Service.
Fetches current headlines from major Israeli news sources.
Uses NewsAPI for reliability and real-time updates.
"""
import asyncio
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from dataclasses import dataclass, field
from bs4 import BeautifulSoup
import httpx
import hashlib
import re
from app.core.config import settings


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
    Scrape headlines from Ynet RSS feed (ynet.co.il)
    More reliable than HTML scraping.
    """
    headlines = []

    try:
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            # Try Ynet RSS feed first
            rss_url = "https://www.ynet.co.il/Integration/StoryRss2.xml"
            response = await client.get(rss_url, headers=HEADERS)
            response.raise_for_status()

            soup = BeautifulSoup(response.text, "html.parser")
            items = soup.find_all("item")[:20]

            for item in items:
                title_elem = item.find("title")
                guid_elem = item.find("guid")

                if not title_elem:
                    continue

                title = title_elem.get_text(strip=True)

                # Get link from guid (which has the URL)
                href = ""
                if guid_elem:
                    href = guid_elem.get_text(strip=True)

                # Clean up HTML-encoded CDATA markers
                title = title.replace("&lt;![CDATA[", "").replace("]]&gt;", "").strip()
                href = href.replace("&lt;![CDATA[", "").replace("]]&gt;", "").replace("<![CDATA[", "").replace("]]>", "").strip()

                if not title or len(title) < 10 or not href:
                    continue

                # Ensure valid URL
                if not href.startswith("http"):
                    continue

                # Extract category from URL
                category = None
                if "/news/" in href or "/breaking/" in href:
                    category = "news"
                elif "/sport/" in href:
                    category = "sports"
                elif "/entertainment/" in href or "/celebs/" in href:
                    category = "entertainment"
                elif "/economy/" in href or "/money/" in href:
                    category = "economy"
                elif "/digital/" in href or "/tech/" in href:
                    category = "tech"

                headlines.append(
                    HeadlineItem(
                        title=title,
                        url=href,
                        source="ynet",
                        category=category,
                    )
                )
    except Exception as e:
        print(f"Error scraping Ynet RSS: {e}")
        # Fallback to HTML scraping if RSS fails
        try:
            async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
                response = await client.get("https://www.ynet.co.il/", headers=HEADERS)
                response.raise_for_status()
                soup = BeautifulSoup(response.text, "html.parser")

                # Look for recent news articles by date in URL
                for link in soup.find_all("a", href=True)[:50]:
                    href = link.get("href", "")
                    title = link.get_text(strip=True)

                    if not title or len(title) < 12:
                        continue
                    if "/articles/" not in href or not any(year in href for year in ["2024", "2025"]):
                        continue

                    if href.startswith("/"):
                        href = f"https://www.ynet.co.il{href}"
                    elif not href.startswith("http"):
                        continue

                    headlines.append(
                        HeadlineItem(
                            title=title,
                            url=href,
                            source="ynet",
                        )
                    )

                    if len(headlines) >= 20:
                        break
        except Exception as e2:
            print(f"Error in Ynet fallback: {e2}")

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

            # Modern Walla headline selectors
            headline_selectors = [
                "a[href*='news/item']",  # Article links
                "h2 a",  # Main headlines
                "h3 a",  # Secondary headlines
                "article h2 a",  # Article containers
                "[class*='headline'] a",  # Headline classes
                "a[class*='article']",  # Article classes
            ]

            seen_urls = set()

            for selector in headline_selectors:
                try:
                    elements = soup.select(selector)
                    for elem in elements[:20]:
                        title = elem.get_text(strip=True)
                        href = elem.get("href", "")

                        if not title or len(title) < 8:
                            continue

                        if href.startswith("/"):
                            href = f"https://news.walla.co.il{href}"
                        elif not href.startswith("http"):
                            continue

                        if href in seen_urls or "walla.co.il" not in href:
                            continue
                        seen_urls.add(href)

                        # Category detection
                        category = None
                        if "/item/" in href or "/break/" in href:
                            category = "news"
                        elif "/sports/" in href:
                            category = "sports"
                        elif "/biztech/" in href or "/tech/" in href:
                            category = "tech"
                        elif "/gallery/" in href:
                            category = "entertainment"

                        headlines.append(
                            HeadlineItem(
                                title=title,
                                url=href,
                                source="walla",
                                category=category,
                            )
                        )

                        if len(headlines) >= 25:
                            break
                except:
                    continue

                if len(headlines) >= 25:
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
    url = "https://www.mako.co.il/"

    try:
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            response = await client.get(url, headers=HEADERS)
            response.raise_for_status()

            soup = BeautifulSoup(response.text, "html.parser")

            # Modern Mako headline selectors
            headline_selectors = [
                "a[href*='/news/']",  # News links
                "h2 a",  # Main headlines
                "h3 a",  # Secondary headlines
                "article a",  # Article containers
                "[class*='headline'] a",  # Headline divs
                "a[class*='title']",  # Title links
            ]

            seen_urls = set()

            for selector in headline_selectors:
                try:
                    elements = soup.select(selector)
                    for elem in elements[:20]:
                        title = elem.get_text(strip=True)
                        href = elem.get("href", "")

                        if not title or len(title) < 8:
                            continue

                        if href.startswith("/"):
                            href = f"https://www.mako.co.il{href}"
                        elif not href.startswith("http"):
                            continue

                        if href in seen_urls or "mako.co.il" not in href:
                            continue
                        seen_urls.add(href)

                        # Category from URL path
                        category = None
                        if "/news/" in href:
                            category = "news"
                        elif "/politics/" in href or "/military/" in href:
                            category = "politics"
                        elif "/sports/" in href:
                            category = "sports"
                        elif "/entertainment/" in href or "/celebs/" in href:
                            category = "entertainment"
                        elif "/money/" in href:
                            category = "economy"
                        elif "/covid/" in href or "/health/" in href:
                            category = "health"

                        headlines.append(
                            HeadlineItem(
                                title=title,
                                url=href,
                                source="mako",
                                category=category,
                            )
                        )

                        if len(headlines) >= 25:
                            break
                except:
                    continue

                if len(headlines) >= 25:
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


async def search_news_for_location(
    location: str,
    language: str = "he",
    max_results: int = 10,
) -> List[HeadlineItem]:
    """
    Search for location-specific news using DuckDuckGo.
    Provides fresh, targeted results when RSS/HTML scraping doesn't find matches.

    Args:
        location: Location to search for (e.g., "Jerusalem", "Tel Aviv", "ירושלים")
        language: Language code for search ("he" for Hebrew, "en" for English)
        max_results: Maximum number of results to return

    Returns:
        List of HeadlineItem with fresh news about the location
    """
    headlines = []

    # Search queries in both Hebrew and English for better coverage
    queries = []
    if location.lower() in ["jerusalem", "ירושלים"]:
        queries = [
            "ירושלים חדשות היום",
            "Jerusalem news today",
            "כותל המערבי חדשות",
        ]
    elif location.lower() in ["tel aviv", "תל אביב"]:
        queries = [
            "תל אביב חדשות היום",
            "Tel Aviv news today",
            "חיי לילה תל אביב",
        ]
    else:
        queries = [f"{location} חדשות", f"{location} news"]

    seen_urls = set()

    for query in queries:
        if len(headlines) >= max_results:
            break

        try:
            # Use DuckDuckGo HTML search (no API key needed)
            search_url = f"https://html.duckduckgo.com/html/?q={query}"

            async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
                response = await client.get(search_url, headers={
                    **HEADERS,
                    "Accept": "text/html",
                })

                if response.status_code != 200:
                    continue

                soup = BeautifulSoup(response.text, "html.parser")

                # DuckDuckGo HTML results structure
                results = soup.select(".result__a")

                for result in results:
                    if len(headlines) >= max_results:
                        break

                    title = result.get_text(strip=True)
                    href = result.get("href", "")

                    # Skip if no title or URL
                    if not title or len(title) < 10 or not href:
                        continue

                    # DuckDuckGo uses redirect URLs, extract actual URL
                    if "uddg=" in href:
                        import urllib.parse
                        parsed = urllib.parse.parse_qs(urllib.parse.urlparse(href).query)
                        if "uddg" in parsed:
                            href = parsed["uddg"][0]

                    # Skip duplicate URLs
                    if href in seen_urls:
                        continue
                    seen_urls.add(href)

                    # Skip non-news URLs
                    skip_domains = ["facebook.com", "twitter.com", "instagram.com", "youtube.com", "wikipedia.org"]
                    if any(domain in href.lower() for domain in skip_domains):
                        continue

                    # Get snippet/summary from sibling element
                    summary = None
                    snippet_elem = result.find_next_sibling("a", class_="result__snippet")
                    if snippet_elem:
                        summary = snippet_elem.get_text(strip=True)

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
            print(f"Error searching for {query}: {e}")
            continue

    return headlines


async def scrape_jerusalem_news() -> List[HeadlineItem]:
    """
    Scrape Jerusalem-specific news using web search.
    Returns fresh headlines about Jerusalem from multiple sources.
    """
    return await search_news_for_location("Jerusalem", "he", max_results=15)


async def scrape_tel_aviv_news() -> List[HeadlineItem]:
    """
    Scrape Tel Aviv-specific news using web search.
    Returns fresh headlines about Tel Aviv from multiple sources.
    """
    return await search_news_for_location("Tel Aviv", "he", max_results=15)


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
