"""
News Scraper Package.

Provides news scraping functionality for Israeli news sources.
This module maintains backward compatibility with the original news_scraper.py imports.

Usage:
    from app.services.news_scraper import (
        get_cached_headlines,
        headlines_to_dict,
        HeadlineItem,
        ScrapedNews,
        scrape_ynet,
        scrape_walla,
        scrape_mako,
        scrape_jerusalem_news,
        scrape_tel_aviv_news,
        scrape_judaism_news,
        HEADERS,
        NewsScraperService,
    )
"""

# Re-export constants for backward compatibility
from app.services.news_scraper.constants import HEADERS

# Re-export models
from app.services.news_scraper.models import (
    HeadlineItem,
    ScrapedNews,
    clean_cdata,
    headlines_to_dict,
)

# Re-export location scrapers
from app.services.news_scraper.location_scrapers import (
    scrape_jerusalem_news,
    scrape_judaism_news,
    scrape_tel_aviv_news,
    search_news_for_location,
)

# Re-export RSS parser utilities
from app.services.news_scraper.rss_parser import (
    parse_rss_feed,
    search_duckduckgo,
    search_google_news_rss,
)

# Re-export service functions and class
from app.services.news_scraper.service import (
    NewsScraperService,
    clear_cache,
    get_cached_headlines,
    scrape_all_sources,
)

# Re-export source scrapers
from app.services.news_scraper.source_scrapers import (
    scrape_mako,
    scrape_walla,
    scrape_ynet,
)

__all__ = [
    # Constants
    "HEADERS",
    # Models
    "HeadlineItem",
    "ScrapedNews",
    "clean_cdata",
    "headlines_to_dict",
    # Source scrapers (Israeli news)
    "scrape_ynet",
    "scrape_walla",
    "scrape_mako",
    # Location scrapers
    "scrape_jerusalem_news",
    "scrape_tel_aviv_news",
    "scrape_judaism_news",
    "search_news_for_location",
    # RSS utilities
    "parse_rss_feed",
    "search_google_news_rss",
    "search_duckduckgo",
    # Service
    "NewsScraperService",
    "get_cached_headlines",
    "scrape_all_sources",
    "clear_cache",
]
