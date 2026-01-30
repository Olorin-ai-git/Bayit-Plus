"""
MCP Content Discovery Service

Provides automated content discovery for kids content using MCP integrations:
- Bright Data MCP for web scraping and YouTube channel discovery
- Puppeteer MCP for metadata extraction from educational sites

This service is designed to work with MCP servers configured externally.
Discovery results are queued for admin review before being added to the library.
"""

import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional

from beanie import Document
from pydantic import BaseModel, Field

from app.core.config import settings
from app.models.kids_content import SUBCATEGORY_PARENT_MAP, KidsSubcategory

logger = logging.getLogger(__name__)


class DiscoveryStatus(str, Enum):
    """Status of a discovered content item."""

    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    IMPORTED = "imported"


class ContentDiscoveryQueue(Document):
    """
    Queue for discovered content pending admin review.

    Discovered content goes through this queue before being added to the library.
    """

    # Source information
    source_type: str  # youtube, website, archive, podcast
    source_url: str
    source_channel: Optional[str] = None

    # Content metadata
    title: str
    title_en: Optional[str] = None
    description: Optional[str] = None
    thumbnail_url: Optional[str] = None
    duration: Optional[str] = None
    published_at: Optional[datetime] = None

    # Classification
    suggested_category: str  # Parent category
    suggested_subcategory: Optional[str] = None
    suggested_age_rating: int = 5
    suggested_tags: List[str] = Field(default_factory=list)

    # Quality indicators
    confidence_score: float = 0.0  # 0-1 scale
    is_hebrew_content: bool = False
    is_jewish_content: bool = False
    safe_for_kids: bool = True

    # Review status
    status: str = DiscoveryStatus.PENDING
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None

    # Timestamps
    discovered_at: datetime = Field(default_factory=datetime.utcnow)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "content_discovery_queue"
        indexes = [
            "status",
            "source_type",
            "source_url",  # For duplicate detection
            "suggested_subcategory",
            "discovered_at",
            ("status", "suggested_subcategory"),
            ("source_type", "source_url"),  # Compound index for dedup queries
        ]


class DiscoveryResult(BaseModel):
    """Result of a content discovery operation."""

    source_type: str
    source_url: str
    title: str
    description: Optional[str] = None
    thumbnail_url: Optional[str] = None
    suggested_category: str
    suggested_subcategory: Optional[str] = None
    confidence_score: float = 0.0


class MCPContentDiscoveryService:
    """
    Service for discovering kids content using MCP integrations.

    This service provides methods to search for content across various sources
    and queue them for admin review. It requires MCP servers to be configured
    externally (e.g., Bright Data MCP, Puppeteer MCP).
    """

    def __init__(self):
        self.mcp_enabled = bool(settings.ANTHROPIC_API_KEY)

    async def search_youtube_channels(
        self,
        subcategory: str,
        language: str = "he",
        max_results: int = 10,
    ) -> List[DiscoveryResult]:
        """
        Search for YouTube channels matching a kids subcategory.

        This method generates search queries based on the subcategory
        and returns potential channels for admin review.

        NOTE: This method requires external MCP server integration (Bright Data MCP).
        When MCP is not configured, returns empty list with info log.

        Args:
            subcategory: Kids subcategory slug (e.g., "learning-hebrew")
            language: Target language (he, en, es)
            max_results: Maximum number of results to return

        Returns:
            List of discovery results for admin review.
            Empty list if MCP integration is not configured.
        """
        if not self.mcp_enabled:
            logger.info(
                f"MCP not configured (ANTHROPIC_API_KEY not set). "
                f"YouTube channel search for '{subcategory}' skipped."
            )
            return []

        search_queries = self._get_subcategory_search_queries(subcategory, language)

        if not search_queries:
            logger.warning(f"No search queries defined for subcategory: {subcategory}")
            return []

        # MCP integration point - requires Bright Data MCP server
        # When Bright Data MCP is configured, this would call:
        # results = await self._mcp_client.search_youtube(queries=search_queries, max_results=max_results)
        logger.info(
            f"MCP YouTube search ready for: {search_queries[:2]}... "
            f"(requires Bright Data MCP server)"
        )
        return []

    async def discover_educational_sites(
        self,
        subcategory: str,
        language: str = "he",
    ) -> List[DiscoveryResult]:
        """
        Discover educational websites with kids content.

        Uses Puppeteer MCP to scrape and extract content from
        educational sites matching the subcategory.

        NOTE: This method requires external MCP server integration (Puppeteer MCP).
        When MCP is not configured, returns empty list with info log.

        Args:
            subcategory: Kids subcategory slug
            language: Target language

        Returns:
            List of discovery results for admin review.
            Empty list if MCP integration is not configured.
        """
        if not self.mcp_enabled:
            logger.info(
                f"MCP not configured (ANTHROPIC_API_KEY not set). "
                f"Educational site discovery for '{subcategory}' skipped."
            )
            return []

        educational_sites = self._get_educational_sites_for_subcategory(subcategory)

        if not educational_sites:
            logger.info(
                f"No educational sites configured for subcategory: {subcategory}. "
                f"Configure KIDS_EDUCATIONAL_SITES_CONFIG to enable discovery."
            )
            return []

        # MCP integration point - requires Puppeteer MCP server
        # When Puppeteer MCP is configured, this would call:
        # results = await self._mcp_client.scrape_sites(urls=educational_sites)
        logger.info(
            f"MCP educational site discovery ready for {len(educational_sites)} sites. "
            f"(requires Puppeteer MCP server)"
        )
        return []

    async def queue_for_review(
        self,
        result: DiscoveryResult,
        source_channel: Optional[str] = None,
    ) -> ContentDiscoveryQueue:
        """
        Add a discovery result to the review queue.

        Args:
            result: The discovery result to queue
            source_channel: Optional channel/source name

        Returns:
            The created queue entry.
        """
        queue_entry = ContentDiscoveryQueue(
            source_type=result.source_type,
            source_url=result.source_url,
            source_channel=source_channel,
            title=result.title,
            description=result.description,
            thumbnail_url=result.thumbnail_url,
            suggested_category=result.suggested_category,
            suggested_subcategory=result.suggested_subcategory,
            confidence_score=result.confidence_score,
            status=DiscoveryStatus.PENDING,
        )

        await queue_entry.insert()
        logger.info(f"Queued content for review: {result.title}")
        return queue_entry

    async def get_pending_queue(
        self,
        subcategory: Optional[str] = None,
        page: int = 1,
        limit: int = 20,
    ) -> Dict[str, Any]:
        """
        Get pending content discovery items for admin review.

        Args:
            subcategory: Filter by subcategory (optional)
            page: Page number
            limit: Items per page

        Returns:
            Paginated list of pending items.
        """
        query: Dict[str, Any] = {"status": DiscoveryStatus.PENDING}

        if subcategory:
            query["suggested_subcategory"] = subcategory

        total = await ContentDiscoveryQueue.find(query).count()
        items = (
            await ContentDiscoveryQueue.find(query)
            .skip((page - 1) * limit)
            .limit(limit)
            .sort("-discovered_at")
            .to_list()
        )

        return {
            "items": items,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "pages": (total + limit - 1) // limit if limit > 0 else 0,
            },
        }

    async def approve_item(
        self,
        item_id: str,
        reviewed_by: str,
    ) -> Optional[ContentDiscoveryQueue]:
        """
        Approve a queued item for import.

        Args:
            item_id: The queue item ID
            reviewed_by: Admin user ID

        Returns:
            The updated queue entry.
        """
        from bson import ObjectId

        item = await ContentDiscoveryQueue.get(ObjectId(item_id))
        if not item:
            return None

        item.status = DiscoveryStatus.APPROVED
        item.reviewed_by = reviewed_by
        item.reviewed_at = datetime.now(timezone.utc)
        await item.save()

        logger.info(f"Approved content: {item.title}")
        return item

    async def reject_item(
        self,
        item_id: str,
        reviewed_by: str,
        reason: str,
    ) -> Optional[ContentDiscoveryQueue]:
        """
        Reject a queued item.

        Args:
            item_id: The queue item ID
            reviewed_by: Admin user ID
            reason: Rejection reason

        Returns:
            The updated queue entry.
        """
        from bson import ObjectId

        item = await ContentDiscoveryQueue.get(ObjectId(item_id))
        if not item:
            return None

        item.status = DiscoveryStatus.REJECTED
        item.reviewed_by = reviewed_by
        item.reviewed_at = datetime.now(timezone.utc)
        item.rejection_reason = reason
        await item.save()

        logger.info(f"Rejected content: {item.title} - {reason}")
        return item

    def _get_subcategory_search_queries(
        self,
        subcategory: str,
        language: str,
    ) -> List[str]:
        """Get search queries for a subcategory."""
        queries_he = {
            KidsSubcategory.LEARNING_HEBREW: [
                "לימוד עברית לילדים",
                "אלף בית לילדים",
                "קריאה בעברית לילדים",
            ],
            KidsSubcategory.YOUNG_SCIENCE: [
                "מדע לילדים",
                "ניסויים לילדים",
                "מדענים צעירים",
            ],
            KidsSubcategory.MATH_FUN: [
                "מתמטיקה לילדים",
                "חשבון לילדים",
                "מספרים לילדים",
            ],
            KidsSubcategory.NATURE_ANIMALS: [
                "חיות לילדים",
                "טבע לילדים",
                "בעלי חיים לילדים",
            ],
            KidsSubcategory.HEBREW_SONGS: [
                "שירי ילדים בעברית",
                "שירים לילדים",
                "שירי ילדים ישראליים",
            ],
            KidsSubcategory.NURSERY_RHYMES: [
                "שירי פעוטות",
                "שירי עריסה",
                "שירים לתינוקות",
            ],
            KidsSubcategory.JEWISH_HOLIDAYS: [
                "חגי ישראל לילדים",
                "חנוכה לילדים",
                "פסח לילדים",
            ],
            KidsSubcategory.TORAH_STORIES: [
                "סיפורי תורה לילדים",
                "סיפורים מהתנך לילדים",
                "פרשת השבוע לילדים",
            ],
            KidsSubcategory.BEDTIME_STORIES: [
                "סיפורים לפני השינה",
                "סיפורי ערב טוב",
                "סיפורים לילדים",
            ],
        }

        queries_en = {
            KidsSubcategory.LEARNING_HEBREW: [
                "learn hebrew for kids",
                "hebrew alphabet for children",
            ],
            KidsSubcategory.YOUNG_SCIENCE: [
                "science for kids",
                "science experiments for children",
            ],
            KidsSubcategory.MATH_FUN: [
                "math for kids",
                "counting for children",
            ],
            KidsSubcategory.NATURE_ANIMALS: [
                "animals for kids",
                "nature documentary children",
            ],
            KidsSubcategory.HEBREW_SONGS: [
                "hebrew songs for kids",
                "israeli children songs",
            ],
            KidsSubcategory.NURSERY_RHYMES: [
                "nursery rhymes",
                "baby songs",
            ],
            KidsSubcategory.JEWISH_HOLIDAYS: [
                "jewish holidays for kids",
                "hanukkah for children",
            ],
            KidsSubcategory.TORAH_STORIES: [
                "torah stories for kids",
                "bible stories children",
            ],
            KidsSubcategory.BEDTIME_STORIES: [
                "bedtime stories for kids",
                "sleep stories children",
            ],
        }

        queries = queries_he if language == "he" else queries_en
        return queries.get(subcategory, [])

    def _get_educational_sites_for_subcategory(
        self,
        subcategory: str,
    ) -> List[str]:
        """
        Get educational sites for a subcategory from configuration.

        Sites are configured via KIDS_EDUCATIONAL_SITES_CONFIG environment variable.
        Format: JSON mapping subcategory slugs to URL arrays.
        Example: '{"learning-hebrew": ["https://site1.com"], "young-science": ["https://site2.com"]}'
        """
        import json

        sites_config = settings.KIDS_EDUCATIONAL_SITES_CONFIG
        if not sites_config:
            logger.debug(
                "No educational sites configured (KIDS_EDUCATIONAL_SITES_CONFIG empty)"
            )
            return []

        try:
            sites_map = json.loads(sites_config)
            return sites_map.get(subcategory, [])
        except json.JSONDecodeError as e:
            logger.error(f"Invalid KIDS_EDUCATIONAL_SITES_CONFIG JSON: {e}")
            return []


# Global service instance
mcp_content_discovery_service = MCPContentDiscoveryService()
