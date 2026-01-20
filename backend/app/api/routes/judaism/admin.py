"""
Admin endpoints for Judaism section.

Handles data management and seeding operations.
These endpoints require admin authentication in production.

- POST /admin/community/seed - Seed sample community data
- POST /admin/news/refresh - Clear news cache
- POST /admin/shiurim/refresh - Clear Torah content cache
- POST /admin/content/seed - Seed Judaism content
- DELETE /admin/content/clear - Clear Judaism content
"""

from fastapi import APIRouter

from app.services.jewish_news_service import jewish_news_service
from app.services.community_directory_service import community_directory_service
from app.services.torah_content_service import torah_content_service
from app.services.judaism_content_seeder import judaism_content_seeder

router = APIRouter()


@router.post("/admin/community/seed")
async def seed_community_data() -> dict:
    """
    Seed sample community data for development/testing.

    Admin endpoint - requires authentication in production.
    """
    result = await community_directory_service.seed_sample_data()
    return result


@router.post("/admin/news/refresh")
async def refresh_news_cache() -> dict:
    """
    Clear news cache to force refresh on next request.

    Admin endpoint - requires authentication in production.
    """
    jewish_news_service.clear_cache()
    return {"message": "News cache cleared"}


@router.post("/admin/shiurim/refresh")
async def refresh_shiurim_cache() -> dict:
    """
    Clear Torah content cache to force refresh on next request.

    Admin endpoint - requires authentication in production.
    """
    torah_content_service.clear_cache()
    return {"message": "Shiurim cache cleared"}


@router.post("/admin/content/seed")
async def seed_judaism_content() -> dict:
    """
    Seed Judaism content with Torah videos from public sources.

    Creates sample content for Torah classes, prayers, Jewish music,
    holidays, and documentaries using publicly available YouTube videos.

    Admin endpoint - requires authentication in production.
    """
    return await judaism_content_seeder.seed_content()


@router.delete("/admin/content/clear")
async def clear_judaism_content() -> dict:
    """
    Remove all seeded Judaism content.

    Admin endpoint - requires authentication in production.
    """
    return await judaism_content_seeder.clear_judaism_content()
