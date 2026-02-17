"""
Content Service - Core service for managing VOD content.

Provides CRUD operations and query methods for Content model.
"""
import logging
import re
from typing import List, Optional, Dict, Any
from beanie import PydanticObjectId
from app.models.content import Content

logger = logging.getLogger(__name__)


class ContentService:
    """Service for managing VOD content operations."""

    async def get_by_id(self, content_id: str) -> Optional[Content]:
        """Get content by ID."""
        try:
            return await Content.get(PydanticObjectId(content_id))
        except Exception as e:
            logger.error(f"Error fetching content {content_id}: {e}")
            return None

    async def get_all(
        self,
        query: Optional[Dict[str, Any]] = None,
        limit: Optional[int] = None,
        skip: int = 0,
    ) -> List[Content]:
        """Get all content matching query."""
        try:
            find_query = Content.find(query or {})
            if skip:
                find_query = find_query.skip(skip)
            if limit:
                find_query = find_query.limit(limit)
            return await find_query.to_list()
        except Exception as e:
            logger.error(f"Error fetching content: {e}")
            return []

    async def get_movies_and_series(
        self,
        search: Optional[str] = None,
        content_type: Optional[str] = None,
    ) -> List[Content]:
        """Get movies and series content."""
        query: Dict[str, Any] = {
            "content_type": {"$in": ["movie", "series", "documentary"]}
        }

        if content_type:
            query["content_type"] = content_type

        if search:
            search = re.escape(search)
            query["$or"] = [
                {"title": {"$regex": search, "$options": "i"}},
                {"description": {"$regex": search, "$options": "i"}},
            ]

        return await self.get_all(query)

    async def update(self, content_id: str, update_data: Dict[str, Any]) -> Optional[Content]:
        """Update content by ID."""
        try:
            content = await Content.get(PydanticObjectId(content_id))
            if not content:
                return None

            for key, value in update_data.items():
                setattr(content, key, value)

            await content.save()
            return content
        except Exception as e:
            logger.error(f"Error updating content {content_id}: {e}")
            return None

    async def delete(self, content_id: str) -> bool:
        """Delete content by ID."""
        try:
            content = await Content.get(PydanticObjectId(content_id))
            if not content:
                return False

            await content.delete()
            return True
        except Exception as e:
            logger.error(f"Error deleting content {content_id}: {e}")
            return False
