"""
Base scraper class for culture content aggregation.

Provides abstract interface and common utilities for culture-specific scrapers.
"""

import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any

import httpx
from bs4 import BeautifulSoup

from app.core.config import settings

logger = logging.getLogger(__name__)


# Default HTTP headers for web requests
DEFAULT_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}


@dataclass
class CultureHeadlineItem:
    """A single scraped headline item from a culture source."""

    source: str
    title: str
    url: str
    scraped_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    published_at: Optional[datetime] = None
    summary: Optional[str] = None
    image_url: Optional[str] = None

    # Localized content
    title_native: Optional[str] = None  # Title in native script (Chinese, Japanese, etc.)
    summary_native: Optional[str] = None

    # Classification
    category: Optional[str] = None
    tags: List[str] = field(default_factory=list)

    # Scoring
    relevance_score: float = 0.0
    matched_keywords: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for storage/serialization."""
        return {
            "source": self.source,
            "title": self.title,
            "url": self.url,
            "scraped_at": self.scraped_at,
            "published_at": self.published_at,
            "summary": self.summary,
            "image_url": self.image_url,
            "title_native": self.title_native,
            "summary_native": self.summary_native,
            "category": self.category,
            "tags": self.tags,
            "relevance_score": self.relevance_score,
            "matched_keywords": self.matched_keywords,
        }


class BaseCultureScraper(ABC):
    """
    Abstract base class for culture-specific content scrapers.

    Each culture (Israeli, Chinese, Japanese, etc.) implements its own
    scraper with culture-specific sources, keywords, and parsing logic.
    """

    # Class attributes to be overridden by subclasses
    culture_id: str = ""
    culture_name: str = ""
    primary_language: str = "en"
    timeout: float = settings.CULTURES_REQUEST_TIMEOUT_SECONDS

    # Keyword configuration (subclasses should override)
    keywords_native: Dict[str, List[str]] = {}  # Keywords in native language
    keywords_english: Dict[str, List[str]] = {}  # Keywords in English

    # Category labels (subclasses should override)
    category_labels: Dict[str, Dict[str, str]] = {}  # {category_id: {lang: label}}

    def __init__(self):
        """Initialize the scraper."""
        self._client: Optional[httpx.AsyncClient] = None

    async def get_client(self) -> httpx.AsyncClient:
        """Get or create an async HTTP client."""
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                timeout=self.timeout,
                headers=DEFAULT_HEADERS,
                follow_redirects=True,
            )
        return self._client

    async def close(self) -> None:
        """Close the HTTP client."""
        if self._client is not None and not self._client.is_closed:
            await self._client.aclose()
            self._client = None

    async def fetch_html(self, url: str, headers: Optional[Dict[str, str]] = None) -> Optional[str]:
        """Fetch HTML content from a URL."""
        try:
            client = await self.get_client()
            request_headers = {**DEFAULT_HEADERS}
            if headers:
                request_headers.update(headers)

            response = await client.get(url, headers=request_headers)
            response.raise_for_status()
            return response.text

        except Exception as e:
            logger.error(f"Failed to fetch {url}: {e}")
            return None

    def parse_html(self, html: str) -> BeautifulSoup:
        """Parse HTML content into BeautifulSoup object."""
        return BeautifulSoup(html, "html.parser")

    @abstractmethod
    async def scrape_headlines(self) -> List[CultureHeadlineItem]:
        """
        Scrape headlines from all configured sources.

        Returns a list of CultureHeadlineItem objects.
        Subclasses must implement this method.
        """
        pass

    @abstractmethod
    async def scrape_city_news(self, city_id: str) -> List[CultureHeadlineItem]:
        """
        Scrape news specific to a city within this culture.

        Args:
            city_id: The city identifier (e.g., "tokyo", "shanghai")

        Returns a list of CultureHeadlineItem objects.
        Subclasses must implement this method.
        """
        pass

    @abstractmethod
    def get_search_queries(self, city_name: str) -> List[str]:
        """
        Get search queries for a city in both native and English.

        Args:
            city_name: The city name in English

        Returns a list of search query strings.
        Subclasses must implement this method.
        """
        pass

    def calculate_relevance_score(
        self,
        title: str,
        summary: Optional[str] = None,
        city_id: Optional[str] = None,
    ) -> tuple[float, List[str], str]:
        """
        Calculate relevance score based on keyword matches.

        Returns tuple of (score, matched_keywords, category)
        """
        text = f"{title} {summary or ''}".lower()
        matched_keywords = []
        score = 0.0
        category_scores: Dict[str, int] = {}

        # Initialize category scores
        for category_id in self.category_labels.keys():
            category_scores[category_id] = 0

        # Check native language keywords (higher weight)
        native_weight = settings.CULTURES_MIN_RELEVANCE_SCORE + 1.5  # ~2.0
        for category_key, keywords in self.keywords_native.items():
            for keyword in keywords:
                keyword_lower = keyword.lower()
                if keyword_lower in text:
                    matched_keywords.append(keyword)
                    score += native_weight

                    # Increment category score
                    if category_key in category_scores:
                        category_scores[category_key] += 3

        # Check English keywords (standard weight)
        english_weight = 1.0
        for category_key, keywords in self.keywords_english.items():
            for keyword in keywords:
                keyword_lower = keyword.lower()
                if keyword_lower in text:
                    if keyword not in matched_keywords:
                        matched_keywords.append(keyword)
                        score += english_weight

                    # Increment category score
                    if category_key in category_scores:
                        category_scores[category_key] += 2

        # Determine primary category
        if category_scores:
            max_category = max(category_scores, key=category_scores.get)
            if category_scores[max_category] == 0:
                max_category = "general"
        else:
            max_category = "general"

        # Normalize score (0-10 scale)
        normalized_score = min(score / 5.0, 10.0)

        return normalized_score, matched_keywords, max_category

    def categorize_content(self, title: str, summary: Optional[str] = None) -> str:
        """Categorize content based on keywords."""
        _, _, category = self.calculate_relevance_score(title, summary)
        return category

    def extract_tags(
        self,
        title: str,
        summary: Optional[str] = None,
        max_tags: int = 5,
    ) -> List[str]:
        """Extract relevant tags from content."""
        _, matched_keywords, _ = self.calculate_relevance_score(title, summary)
        return matched_keywords[:max_tags]

    def filter_by_relevance(
        self,
        headlines: List[CultureHeadlineItem],
        min_score: float = settings.CULTURES_MIN_RELEVANCE_SCORE,
    ) -> List[CultureHeadlineItem]:
        """Filter headlines by minimum relevance score."""
        filtered = []
        for headline in headlines:
            score, keywords, category = self.calculate_relevance_score(
                headline.title, headline.summary
            )
            if score >= min_score:
                headline.relevance_score = score
                headline.matched_keywords = keywords
                headline.category = category
                headline.tags = keywords[:5]
                filtered.append(headline)

        return filtered

    def get_category_label(
        self, category_id: str, language: str = "en"
    ) -> str:
        """Get localized label for a category."""
        if category_id in self.category_labels:
            labels = self.category_labels[category_id]
            return labels.get(language, labels.get("en", category_id))
        return category_id

    def get_all_categories(self) -> List[Dict[str, Any]]:
        """Get all available categories with labels."""
        categories = []
        for category_id, labels in self.category_labels.items():
            categories.append({
                "id": category_id,
                "name": labels.get("en", category_id),
                "name_localized": labels,
            })
        return categories
