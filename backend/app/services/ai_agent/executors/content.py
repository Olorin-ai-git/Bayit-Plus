"""
Content Executors

Functions for listing and retrieving content information.
"""

import logging
import random
from typing import Dict, Any, Optional

from app.models.content import Content, Category

logger = logging.getLogger(__name__)


async def execute_list_content_items(
    category_id: Optional[str] = None,
    limit: int = 20,
    random_sample: bool = False
) -> Dict[str, Any]:
    """Get a list of content items to audit."""
    try:
        limit = min(limit, 100)  # Cap at 100

        query = {"is_published": True}
        if category_id:
            query["category_id"] = category_id

        if random_sample:
            # Use simple approach: get all items then sample in Python
            # This avoids the AsyncIOMotorLatentCommandCursor issue with MongoDB aggregation
            all_items = await Content.find(query).to_list()
            if len(all_items) > limit:
                items = random.sample(all_items, limit)
            else:
                items = all_items
        else:
            # Get newest items
            items = await Content.find(query).sort([("created_at", -1)]).limit(limit).to_list()

        # Return simplified data for Claude
        return {
            "success": True,
            "count": len(items),
            "items": [
                {
                    "id": str(item.id),
                    "title": item.title,
                    "title_en": item.title_en,
                    "category_id": str(item.category_id) if item.category_id else None,
                    "content_type": item.content_type,
                    "has_poster": bool(item.poster_url),
                    "has_description": bool(item.description),
                    "has_stream": bool(item.stream_url),
                    "imdb_rating": item.imdb_rating,
                    "created_at": item.created_at.isoformat() if item.created_at else None
                }
                for item in items
            ]
        }
    except Exception as e:
        logger.error(f"Error in list_content_items: {str(e)}")
        return {"success": False, "error": str(e)}


async def execute_get_content_details(content_id: str) -> Dict[str, Any]:
    """Get detailed information about a content item."""
    try:
        content = await Content.get(content_id)
        if not content:
            return {"success": False, "error": "Content not found"}

        return {
            "success": True,
            "content": {
                "id": str(content.id),
                "title": content.title,
                "title_en": content.title_en,
                "description": content.description,
                "category_id": str(content.category_id) if content.category_id else None,
                "content_type": content.content_type,
                "thumbnail": content.thumbnail,  # Primary poster/cover image
                "poster_url": content.poster_url,  # TMDB poster URL (secondary)
                "backdrop": content.backdrop,  # Wide background image
                "stream_url": content.stream_url,
                "trailer_url": content.trailer_url,
                "imdb_id": content.imdb_id,
                "imdb_rating": content.imdb_rating,
                "tmdb_id": content.tmdb_id,
                "release_year": content.year,
                "duration": content.duration,
                "genre": content.genre,
                "genres": getattr(content, 'genres', None),  # May not exist in old documents
                "director": content.director,
                "cast": content.cast,
                "is_published": content.is_published,
                "created_at": content.created_at.isoformat() if content.created_at else None,
                "updated_at": content.updated_at.isoformat() if content.updated_at else None
            }
        }
    except Exception as e:
        logger.error(f"Error in get_content_details: {str(e)}")
        return {"success": False, "error": str(e)}


async def execute_get_categories() -> Dict[str, Any]:
    """Get all categories in the system."""
    try:
        categories = await Category.find().to_list()

        return {
            "success": True,
            "count": len(categories),
            "categories": [
                {
                    "id": str(cat.id),
                    "name": cat.name,
                    "name_en": cat.name_en,
                    "slug": cat.slug,
                    "content_type": cat.content_type
                }
                for cat in categories
            ]
        }
    except Exception as e:
        logger.error(f"Error in get_categories: {str(e)}")
        return {"success": False, "error": str(e)}
