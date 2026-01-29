"""
Exa.ai-based news scraper for Israeli-focused content.

Exa provides high-quality article extraction with images, summaries, and metadata.
"""

import logging
from datetime import datetime, timezone
from typing import List, Optional

from exa_py import Exa

from app.core.config import settings
from app.services.news_scraper.models import HeadlineItem

logger = logging.getLogger(__name__)

# Exa API key from environment - fail fast if not configured
EXA_API_KEY = getattr(settings, "EXA_API_KEY", None)
if not EXA_API_KEY:
    raise ValueError("EXA_API_KEY must be configured in environment variables or settings")


class ExaNewsScraperError(Exception):
    """Base exception for Exa scraper errors."""
    pass


async def search_exa_news(
    query: str,
    max_results: int = 10,
) -> List[HeadlineItem]:
    """
    Search for news articles using Exa API.

    Exa (formerly Metaphor) provides:
    - High-quality article extraction
    - Real article images
    - Clean summaries
    - Publication dates

    Args:
        query: Search query
        max_results: Maximum number of results

    Returns:
        List of HeadlineItem objects with article data and images
    """
    try:
        if not EXA_API_KEY:
            logger.error("EXA_API_KEY not configured")
            return []

        logger.info(f"Searching Exa for: '{query}' (max_results={max_results})")

        # Initialize Exa client
        exa = Exa(api_key=EXA_API_KEY)

        # Search with Exa - request contents to get images and summaries
        response = exa.search_and_contents(
            query=query,
            num_results=max_results,
            text={"max_characters": 500},  # Get summary text
            highlights=False,
        )

        headlines = []
        results = response.results

        logger.info(f"Exa returned {len(results)} results for '{query}'")

        for idx, result in enumerate(results):
            title = result.title
            url = result.url
            text = getattr(result, "text", None)
            image = result.image
            published_date = result.published_date

            if not title or not url:
                logger.debug(f"Skipping result {idx}: missing title or URL")
                continue

            # Parse published date
            pub_date = None
            if published_date:
                try:
                    # Exa returns ISO format date strings
                    pub_date = datetime.fromisoformat(published_date.replace("Z", "+00:00"))
                except Exception as e:
                    logger.debug(f"Failed to parse date '{published_date}': {e}")

            # Extract source domain from URL
            try:
                from urllib.parse import urlparse
                domain = urlparse(url).netloc.replace("www.", "")
                source = domain.split(".")[0].title()
            except Exception:
                source = "Exa"

            headline = HeadlineItem(
                title=title,
                url=url,
                source=source,
                category="news",
                summary=text[:500] if text else None,
                image_url=image if image else None,
                published_at=pub_date or datetime.now(timezone.utc),
            )

            headlines.append(headline)

            # Log with clear image status
            img_status = "✓ IMAGE" if image else "✗ NO IMAGE"
            logger.info(
                f"  {idx + 1}. {title[:60]}\n"
                f"      {img_status} | Source: {source}"
            )

        with_images = sum(1 for h in headlines if h.image_url)
        logger.info(
            f"Successfully parsed {len(headlines)} headlines from Exa\n"
            f"Articles with images: {with_images}/{len(headlines)} ({with_images*100//len(headlines) if len(headlines) > 0 else 0}%)"
        )

        return headlines

    except Exception as e:
        logger.error(f"Exa search failed for '{query}': {e}")
        raise ExaNewsScraperError(f"Exa search failed: {e}") from e


async def scrape_israeli_content_exa(
    city: str,
    state: str,
    max_results: int = 10,
) -> List[HeadlineItem]:
    """
    Search for Israeli-focused news content in a US city using Exa.

    Args:
        city: City name
        state: State code
        max_results: Maximum results to return

    Returns:
        List of HeadlineItem objects with Israeli-related articles and images
    """
    try:
        # Build search queries - Exa works well with natural language
        queries = [
            f'Israeli community news in {city} {state}',
            f'Israelis in {city} {state} news articles',
            f'Israeli business and culture in {city}',
        ]

        all_headlines: List[HeadlineItem] = []
        seen_urls: set[str] = set()

        # Try each query until we have enough results
        for query in queries:
            if len(all_headlines) >= max_results:
                break

            try:
                results = await search_exa_news(
                    query=query,
                    max_results=5,
                )

                for headline in results:
                    if headline.url not in seen_urls:
                        seen_urls.add(headline.url)
                        all_headlines.append(headline)

                        if len(all_headlines) >= max_results:
                            break

            except ExaNewsScraperError as e:
                logger.warning(f"Query '{query}' failed: {e}")
                continue

        with_images = sum(1 for h in all_headlines if h.image_url)
        logger.info(
            f"Exa scraping complete for {city}, {state}:\n"
            f"  Total articles: {len(all_headlines)}\n"
            f"  With images: {with_images}/{len(all_headlines)} ({with_images*100//len(all_headlines) if len(all_headlines) > 0 else 0}%)"
        )

        return all_headlines[:max_results]

    except Exception as e:
        logger.error(f"Failed to scrape Israeli content for {city}, {state}: {e}")
        return []  # Return empty list on error


async def scrape_israeli_businesses_exa(
    city: str,
    state: str,
    max_results: int = 15,
) -> List[HeadlineItem]:
    """
    Search for Israeli businesses in a US city using Exa.

    Focuses on business listings including:
    - Restaurants & Food
    - Tech & Startups
    - Community Services (synagogues, centers)
    - Retail & Services
    - Professional Services

    Args:
        city: City name
        state: State code
        max_results: Maximum results to return

    Returns:
        List of HeadlineItem objects with Israeli business listings
    """
    try:
        # Comprehensive business-focused queries
        queries = [
            # Restaurants & Food (HIGH PRIORITY)
            f'Israeli restaurant in {city} {state}',
            f'Israeli cafe {city}',
            f'kosher Israeli restaurant {city}',
            f'Israeli Mediterranean restaurant {city}',
            f'Israeli falafel hummus {city}',
            # Tech & Startups (HIGH PRIORITY)
            f'Israeli tech company {city} {state}',
            f'Israeli startup {city}',
            f'Israeli software cybersecurity {city}',
            # Community Services
            f'Israeli synagogue {city}',
            f'Israeli community center {city}',
            f'Hebrew school {city}',
            # Retail & Services
            f'Israeli shop store market {city}',
            f'Israeli owned business {city}',
            # Professional Services
            f'Israeli professional services {city}',
        ]

        all_headlines: List[HeadlineItem] = []
        seen_urls: set[str] = set()

        # Try each query, fetching 2-3 results per query for diversity
        for query in queries:
            if len(all_headlines) >= max_results:
                break

            try:
                results = await search_exa_news(
                    query=query,
                    max_results=2,
                )

                for headline in results:
                    if headline.url not in seen_urls:
                        seen_urls.add(headline.url)
                        all_headlines.append(headline)

                        if len(all_headlines) >= max_results:
                            break

            except ExaNewsScraperError as e:
                logger.warning(f"Business query '{query}' failed: {e}")
                continue

        with_images = sum(1 for h in all_headlines if h.image_url)
        logger.info(
            f"Exa business scraping complete for {city}, {state}:\n"
            f"  Total business listings: {len(all_headlines)}\n"
            f"  With images: {with_images}/{len(all_headlines)} ({with_images*100//len(all_headlines) if len(all_headlines) > 0 else 0}%)"
        )

        return all_headlines[:max_results]

    except Exception as e:
        logger.error(f"Failed to scrape Israeli businesses for {city}, {state}: {e}")
        return []  # Return empty list on error
