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


def clean_cdata(text: str) -> str:
    """Remove CDATA markers from text (both HTML-encoded and raw)."""
    if not text:
        return text
    # Remove raw CDATA markers
    text = text.replace("<![CDATA[", "").replace("]]>", "")
    # Remove HTML-encoded CDATA markers
    text = text.replace("&lt;![CDATA[", "").replace("]]&gt;", "")
    return text.strip()


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

                title = clean_cdata(title_elem.get_text(strip=True))

                # Get link from guid (which has the URL)
                href = ""
                if guid_elem:
                    href = clean_cdata(guid_elem.get_text(strip=True))

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
                    href = clean_cdata(link.get("href", ""))
                    title = clean_cdata(link.get_text(strip=True))

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
                        title = clean_cdata(elem.get_text(strip=True))
                        href = clean_cdata(elem.get("href", ""))

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
                        title = clean_cdata(elem.get_text(strip=True))
                        href = clean_cdata(elem.get("href", ""))

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


async def search_google_news_rss(
    query: str,
    max_results: int = 10,
) -> List[HeadlineItem]:
    """
    Search Google News RSS for fresh news content.
    More reliable than HTML scraping.

    Args:
        query: Search query (Hebrew or English)
        max_results: Maximum number of results

    Returns:
        List of HeadlineItem from Google News
    """
    headlines = []
    import urllib.parse

    # URL encode the query for Google News RSS
    encoded_query = urllib.parse.quote(query)
    rss_url = f"https://news.google.com/rss/search?q={encoded_query}&hl=he&gl=IL&ceid=IL:he"

    try:
        async with httpx.AsyncClient(timeout=12.0, follow_redirects=True) as client:
            response = await client.get(rss_url, headers={
                **HEADERS,
                "Accept": "application/rss+xml,application/xml,text/xml",
            })

            if response.status_code != 200:
                return headlines

            soup = BeautifulSoup(response.text, "lxml-xml")
            items = soup.find_all("item")[:max_results]

            for item in items:
                title_elem = item.find("title")
                link_elem = item.find("link")
                pubdate_elem = item.find("pubDate")
                source_elem = item.find("source")

                if not title_elem or not link_elem:
                    continue

                title = clean_cdata(title_elem.get_text(strip=True))
                url = clean_cdata(link_elem.get_text(strip=True))

                # Skip if title too short
                if len(title) < 10:
                    continue

                # Extract source name
                source_name = "Google News"
                if source_elem:
                    source_name = clean_cdata(source_elem.get_text(strip=True))

                # Parse publication date
                pub_date = None
                if pubdate_elem:
                    try:
                        from email.utils import parsedate_to_datetime
                        pub_date = parsedate_to_datetime(pubdate_elem.get_text(strip=True))
                    except Exception:
                        pub_date = datetime.utcnow()

                headlines.append(
                    HeadlineItem(
                        title=title,
                        url=url,
                        source=source_name,
                        category="news",
                        published_at=pub_date,
                    )
                )

    except Exception as e:
        print(f"Error fetching Google News RSS for '{query}': {e}")

    return headlines


async def search_duckduckgo(
    query: str,
    max_results: int = 10,
) -> List[HeadlineItem]:
    """
    Search DuckDuckGo HTML for news content.
    Fallback when Google News doesn't work.

    Args:
        query: Search query
        max_results: Maximum number of results

    Returns:
        List of HeadlineItem from DuckDuckGo
    """
    headlines = []
    import urllib.parse

    try:
        search_url = f"https://html.duckduckgo.com/html/?q={urllib.parse.quote(query)}"

        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            response = await client.get(search_url, headers={
                **HEADERS,
                "Accept": "text/html",
            })

            if response.status_code != 200:
                return headlines

            soup = BeautifulSoup(response.text, "html.parser")
            results = soup.select(".result__a")

            seen_urls = set()

            for result in results:
                if len(headlines) >= max_results:
                    break

                title = clean_cdata(result.get_text(strip=True))
                href = clean_cdata(result.get("href", ""))

                if not title or len(title) < 10 or not href:
                    continue

                # Extract actual URL from DuckDuckGo redirect
                if "uddg=" in href:
                    parsed = urllib.parse.parse_qs(urllib.parse.urlparse(href).query)
                    if "uddg" in parsed:
                        href = parsed["uddg"][0]

                if href in seen_urls:
                    continue
                seen_urls.add(href)

                # Skip social media and non-news
                skip_domains = [
                    "facebook.com", "twitter.com", "instagram.com",
                    "youtube.com", "wikipedia.org", "tiktok.com",
                ]
                if any(domain in href.lower() for domain in skip_domains):
                    continue

                # Get summary from snippet
                summary = None
                snippet_elem = result.find_next_sibling("a", class_="result__snippet")
                if snippet_elem:
                    summary = clean_cdata(snippet_elem.get_text(strip=True))

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
        print(f"Error searching DuckDuckGo for '{query}': {e}")

    return headlines


async def search_news_for_location(
    location: str,
    language: str = "he",
    max_results: int = 15,
) -> List[HeadlineItem]:
    """
    Search for location-specific news using multiple sources.
    Uses Google News RSS as primary, DuckDuckGo as fallback.

    Args:
        location: Location to search for (e.g., "Jerusalem", "Tel Aviv")
        language: Language code for search ("he" for Hebrew, "en" for English)
        max_results: Maximum number of results to return

    Returns:
        List of HeadlineItem with fresh news about the location
    """
    # Define comprehensive search queries for each location
    queries = []

    if location.lower() in ["jerusalem", "ירושלים"]:
        queries = [
            # Hebrew news queries
            "ירושלים חדשות",
            "הכותל המערבי",
            "העיר העתיקה ירושלים",
            "אירועים בירושלים",
            # English news queries
            "Jerusalem Israel news",
            "Western Wall Kotel",
            "Old City Jerusalem",
        ]
    elif location.lower() in ["tel aviv", "תל אביב"]:
        queries = [
            # Hebrew news queries
            "תל אביב חדשות",
            "אירועים תל אביב",
            "תרבות תל אביב",
            "הופעות תל אביב",
            "מסעדות תל אביב",
            # English news queries
            "Tel Aviv Israel news",
            "Tel Aviv events",
            "Tel Aviv nightlife",
        ]
    else:
        queries = [f"{location} חדשות", f"{location} news"]

    all_headlines = []
    seen_urls = set()

    # First try Google News RSS for each query
    for query in queries:
        if len(all_headlines) >= max_results:
            break

        try:
            results = await search_google_news_rss(query, max_results=5)
            for item in results:
                if item.url not in seen_urls:
                    seen_urls.add(item.url)
                    all_headlines.append(item)
        except Exception as e:
            print(f"Google News search failed for '{query}': {e}")

    # If we don't have enough results, try DuckDuckGo
    if len(all_headlines) < max_results // 2:
        for query in queries[:3]:  # Try first 3 queries
            if len(all_headlines) >= max_results:
                break

            try:
                results = await search_duckduckgo(query, max_results=5)
                for item in results:
                    if item.url not in seen_urls:
                        seen_urls.add(item.url)
                        all_headlines.append(item)
            except Exception as e:
                print(f"DuckDuckGo search failed for '{query}': {e}")

    return all_headlines[:max_results]


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


async def scrape_judaism_news() -> List[HeadlineItem]:
    """
    Scrape Judaism and Jewish community news using web search.
    Supplements RSS feeds with fresh content from web search.

    Returns:
        List of HeadlineItem with fresh Jewish news
    """
    queries = [
        # English queries
        "Jewish news today",
        "Jewish community news",
        "Torah shiur lecture",
        "Israel Jewish news",
        # Hebrew queries
        "חדשות יהודיות",
        "קהילה יהודית",
        "שיעור תורה",
    ]

    all_headlines = []
    seen_urls = set()

    # First try Google News RSS for each query
    for query in queries:
        if len(all_headlines) >= 15:
            break

        try:
            results = await search_google_news_rss(query, max_results=4)
            for item in results:
                if item.url not in seen_urls:
                    seen_urls.add(item.url)
                    # Categorize the content
                    category = _categorize_jewish_content(item.title, item.summary)
                    item.category = category
                    all_headlines.append(item)
        except Exception as e:
            print(f"Google News search failed for '{query}': {e}")

    # Supplement with DuckDuckGo if needed
    if len(all_headlines) < 8:
        for query in queries[:3]:
            if len(all_headlines) >= 15:
                break

            try:
                results = await search_duckduckgo(query, max_results=4)
                for item in results:
                    if item.url not in seen_urls:
                        seen_urls.add(item.url)
                        category = _categorize_jewish_content(item.title, item.summary)
                        item.category = category
                        all_headlines.append(item)
            except Exception as e:
                print(f"DuckDuckGo search failed for '{query}': {e}")

    return all_headlines[:15]


def _categorize_jewish_content(title: str, summary: Optional[str] = None) -> str:
    """Categorize Jewish content based on keywords."""
    text = f"{title} {summary or ''}".lower()

    # Torah/religious content
    torah_keywords = ["torah", "shiur", "parsha", "talmud", "halacha", "rabbi", "שיעור", "תורה", "הלכה", "רב"]
    if any(kw in text for kw in torah_keywords):
        return "torah"

    # Community news
    community_keywords = ["community", "synagogue", "shul", "congregation", "קהילה", "בית כנסת"]
    if any(kw in text for kw in community_keywords):
        return "community"

    # Israel news
    israel_keywords = ["israel", "jerusalem", "tel aviv", "idf", "knesset", "ישראל", "ירושלים"]
    if any(kw in text for kw in israel_keywords):
        return "israel"

    # Culture
    culture_keywords = ["culture", "art", "music", "festival", "תרבות", "אמנות"]
    if any(kw in text for kw in culture_keywords):
        return "culture"

    return "news"


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
