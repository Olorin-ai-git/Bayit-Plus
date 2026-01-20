"""
Content Metadata Service for Olorin Platform

Adapter service for cross-database Content access. Provides Olorin services
with read-only access to Bayit+ Content metadata while maintaining database separation.
"""

import logging
from typing import List, Optional

from app.core.config import settings
from app.models.content import Content
from beanie import PydanticObjectId
from beanie.odm.queries.find import FindMany

logger = logging.getLogger(__name__)


class ContentMetadataService:
    """
    Service for accessing Content metadata from Olorin database context.

    Provides a clean adapter layer between Olorin services and Bayit+ Content model.
    Handles both shared database (Phase 1) and separate database (Phase 2) scenarios.
    """

    def __init__(self):
        """Initialize content metadata service."""
        self._initialized = False

    async def initialize(self) -> None:
        """
        Initialize service and verify Content model access.

        Called during application startup to ensure Content model is available.
        """
        if self._initialized:
            return

        # Verify Content model is accessible
        try:
            # Test query to ensure Content is registered with Beanie
            await Content.find_one()
            logger.info("ContentMetadataService initialized - Content model accessible")
            self._initialized = True
        except Exception as e:
            logger.error(f"ContentMetadataService initialization failed: {e}")
            raise RuntimeError(
                "Content model not accessible. Ensure database connection is established."
            ) from e

    async def get_content(
        self, content_id: str | PydanticObjectId
    ) -> Optional[Content]:
        """
        Get content by ID.

        Args:
            content_id: Content document ID (string or PydanticObjectId)

        Returns:
            Content document or None if not found
        """
        if not self._initialized:
            await self.initialize()

        try:
            return await Content.get(content_id)
        except Exception as e:
            logger.error(f"Error fetching content {content_id}: {e}")
            return None

    async def find_contents(self, **filters) -> FindMany[Content]:
        """
        Find contents matching filters.

        Args:
            **filters: MongoDB query filters (e.g., Content.type == "movie")

        Returns:
            Beanie FindMany query object (supports .limit(), .skip(), etc.)

        Example:
            >>> query = await content_metadata_service.find_contents(
            ...     Content.type == "movie",
            ...     Content.status == "active"
            ... )
            >>> movies = await query.limit(10).to_list()
        """
        if not self._initialized:
            await self.initialize()

        # Build find query with filters
        return Content.find(*filters)

    async def search_contents(
        self,
        query: dict,
        limit: int = 50,
        skip: int = 0,
    ) -> List[Content]:
        """
        Search contents with MongoDB query.

        Args:
            query: MongoDB query dictionary
            limit: Maximum results to return
            skip: Number of results to skip (for pagination)

        Returns:
            List of Content documents

        Example:
            >>> contents = await content_metadata_service.search_contents(
            ...     {"type": "movie", "status": "active"},
            ...     limit=10
            ... )
        """
        if not self._initialized:
            await self.initialize()

        try:
            return await Content.find(query).skip(skip).limit(limit).to_list()
        except Exception as e:
            logger.error(f"Error searching contents: {e}")
            return []

    async def count_contents(self, **filters) -> int:
        """
        Count contents matching filters.

        Args:
            **filters: MongoDB query filters

        Returns:
            Count of matching documents
        """
        if not self._initialized:
            await self.initialize()

        try:
            return await Content.find(*filters).count()
        except Exception as e:
            logger.error(f"Error counting contents: {e}")
            return 0

    async def get_contents_by_ids(
        self, content_ids: List[str | PydanticObjectId]
    ) -> List[Content]:
        """
        Get multiple contents by IDs.

        Args:
            content_ids: List of content IDs

        Returns:
            List of Content documents (may be fewer than requested if some not found)
        """
        if not self._initialized:
            await self.initialize()

        try:
            # Convert string IDs to PydanticObjectId if needed
            obj_ids = [
                PydanticObjectId(cid) if isinstance(cid, str) else cid
                for cid in content_ids
            ]

            return await Content.find({"_id": {"$in": obj_ids}}).to_list()
        except Exception as e:
            logger.error(f"Error fetching contents by IDs: {e}")
            return []

    async def get_contents_batch(
        self, content_ids: List[str | PydanticObjectId]
    ) -> dict[str, Content]:
        """
        Get multiple contents by IDs and return as a dictionary keyed by content ID.

        Optimized for batch lookups where you need to match results back to IDs.

        Args:
            content_ids: List of content IDs

        Returns:
            Dictionary mapping content ID strings to Content documents
        """
        if not content_ids:
            return {}

        contents = await self.get_contents_by_ids(content_ids)
        return {str(c.id): c for c in contents}

    async def text_search(
        self,
        query_text: str,
        content_types: Optional[List[str]] = None,
        limit: int = 50,
    ) -> List[Content]:
        """
        Perform MongoDB text search on content collection.

        Args:
            query_text: Text search query
            content_types: Optional filter for content types
            limit: Maximum results to return

        Returns:
            List of Content documents sorted by text relevance score
        """
        if not self._initialized:
            await self.initialize()

        try:
            # Build MongoDB text search query
            mongo_query = {"$text": {"$search": query_text}}

            if content_types:
                mongo_query["content_type"] = {"$in": content_types}

            # Execute search with text score projection and sorting
            cursor = (
                Content.find(
                    mongo_query,
                    projection={"score": {"$meta": "textScore"}},
                )
                .sort([("score", {"$meta": "textScore"})])
                .limit(limit)
            )

            return await cursor.to_list()

        except Exception as e:
            logger.error(f"Text search failed: {e}")
            return []


# Singleton instance
content_metadata_service = ContentMetadataService()
