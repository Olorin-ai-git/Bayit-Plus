"""
Tavily-based news scraper for Israeli-focused content.

Provides clean article extraction with images using Tavily Search API.
"""

import logging
from datetime import datetime, timezone
from typing import List, Optional

from tavily import TavilyClient

from app.core.config import settings
from app.services.news_scraper.models import HeadlineItem

logger = logging.getLogger(__name__)

# Tavily API key from environment
TAVILY_API_KEY = getattr(settings, "TAVILY_API_KEY", "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")


class TavilyNewsScraperError(Exception):
    """Base exception for Tavily scraper errors."""
    pass


async def search_tavily_news(
    query: str,
    max_results: int = 10,
    search_depth: str = "basic",  # "basic" or "advanced"
    include_domains: Optional[List[str]] = None,
    exclude_domains: Optional[List[str]] = None,
) -> List[HeadlineItem]:
    """
    Search for news articles using Tavily API.

    Tavily provides:
    - Clean article extraction
    - Real article images
    - Structured metadata
    - Fast response times

    Args:
        query: Search query
        max_results: Maximum number of results
        search_depth: "basic" (faster) or "advanced" (more thorough)
        include_domains: Whitelist of domains to search
        exclude_domains: Domains to exclude from results

    Returns:
        List of HeadlineItem objects with article data and images
    """
    try:
        if not TAVILY_API_KEY:
            logger.error("TAVILY_API_KEY not configured")
            return []

        logger.info(f"Searching Tavily for: '{query}' (max_results={max_results})")

        # Initialize Tavily client
        client = TavilyClient(api_key=TAVILY_API_KEY)

        # Search with Tavily
        response = client.search(
            query=query,
            search_depth=search_depth,
            max_results=max_results,
            include_domains=include_domains,
            exclude_domains=exclude_domains,
            include_images=True,  # Include article images
            include_answer=False,  # We don't need AI-generated answer
        )

        headlines = []
        results = response.get("results", [])

        logger.info(f"Tavily returned {len(results)} results for '{query}'")

        for idx, result in enumerate(results):
            title = result.get("title", "")
            url = result.get("url", "")
            content = result.get("content", "")
            image_url = result.get("image_url")
            published_date = result.get("published_date")

            if not title or not url:
                logger.debug(f"Skipping result {idx}: missing title or URL")
                continue

            # Parse published date
            pub_date = None
            if published_date:
                try:
                    pub_date = datetime.fromisoformat(published_date.replace("Z", "+00:00"))
                except Exception as e:
                    logger.debug(f"Failed to parse date '{published_date}': {e}")

            # Extract source domain from URL
            try:
                from urllib.parse import urlparse
                domain = urlparse(url).netloc.replace("www.", "")
                source = domain.split(".")[0].title()
            except Exception:
                source = "Tavily"

            headline = HeadlineItem(
                title=title,
                url=url,
                source=source,
                category="news",
                summary=content[:500] if content else None,  # Limit to 500 chars
                image_url=image_url,
                published_at=pub_date or datetime.now(timezone.utc),
            )

            headlines.append(headline)
            logger.info(
                f"  {idx + 1}. {title[:60]} - "
                f"Image: {'✓' if image_url else '✗'} - "
                f"Source: {source}"
            )

        logger.info(f"Successfully parsed {len(headlines)} headlines from Tavily")
        logger.info(f"Articles with images: {sum(1 for h in headlines if h.image_url)}/{len(headlines)}")

        return headlines

    except Exception as e:
        logger.error(f"Tavily search failed for '{query}': {e}")
        raise TavilyNewsScraperError(f"Tavily search failed: {e}") from e


async def scrape_israeli_content_tavily(
    city: str,
    state: str,
    max_results: int = 10,
) -> List[HeadlineItem]:
    """
    Search for Israeli-focused NEWS content in a US city using Tavily.

    Args:
        city: City name
        state: State code
        max_results: Maximum results to return

    Returns:
        List of HeadlineItem objects with Israeli-related news articles and images
    """
    try:
        # Build NEWS-focused search queries for Israeli content
        queries = [
            f'Israeli news "{city}" {state}',
            f'Israel "{city}" {state} article',
            f'Israeli business "{city}" {state}',
            f'Israel tech "{city}"',
        ]

        all_headlines: List[HeadlineItem] = []
        seen_urls: set[str] = set()

        # Exclude social media and community sites - focus on news
        exclude_domains = [
            "facebook.com",
            "reddit.com",
            "twitter.com",
            "x.com",
            "instagram.com",
            "linkedin.com",
            "youtube.com",
        ]

        # Try each query until we have enough results
        for query in queries:
            if len(all_headlines) >= max_results:
                break

            try:
                results = await search_tavily_news(
                    query=query,
                    max_results=5,
                    search_depth="basic",  # Faster response
                    exclude_domains=exclude_domains,  # Exclude social media
                )

                for headline in results:
                    if headline.url not in seen_urls:
                        seen_urls.add(headline.url)
                        all_headlines.append(headline)

                        if len(all_headlines) >= max_results:
                            break

            except TavilyNewsScraperError as e:
                logger.warning(f"Query '{query}' failed: {e}")
                continue

        logger.info(
            f"Tavily scraping complete for {city}, {state}: "
            f"{len(all_headlines)} articles "
            f"({sum(1 for h in all_headlines if h.image_url)} with images)"
        )

        return all_headlines[:max_results]

    except Exception as e:
        logger.error(f"Failed to scrape Israeli content for {city}, {state}: {e}")
        return []  # Return empty list on error
