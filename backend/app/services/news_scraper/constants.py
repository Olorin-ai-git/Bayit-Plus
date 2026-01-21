"""
News Scraper Constants.

Contains HTTP headers, timeout values, and other constants used by the news scraper.
All configurable values are loaded from settings.
"""

from app.core.config import settings

# Common HTTP headers for web requests
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7",
}

# RSS-specific headers
RSS_HEADERS = {
    **HEADERS,
    "Accept": "application/rss+xml,application/xml,text/xml",
}

# HTML-specific headers
HTML_HEADERS = {
    **HEADERS,
    "Accept": "text/html",
}

# Request timeout in seconds - loaded from settings
REQUEST_TIMEOUT_SECONDS = settings.JEWISH_NEWS_REQUEST_TIMEOUT_SECONDS

# Maximum number of headlines to fetch per source
MAX_HEADLINES_PER_SOURCE = 25

# Maximum number of search results
MAX_SEARCH_RESULTS = 15

# Cache TTL - loaded from settings (used by service.py)
CACHE_TTL_MINUTES = 30

# Minimum title length to consider valid
MIN_TITLE_LENGTH = 8

# Minimum title length for RSS items
MIN_RSS_TITLE_LENGTH = 10
