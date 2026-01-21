"""
Judaism module.

This module handles all Judaism section functionality:
- Content: Torah classes, music, prayer, holidays, documentaries
- News: Aggregated Jewish news from major US publications
- Calendar: Hebrew dates, Shabbat times, holidays, Daf Yomi
- Community: Synagogues, JCCs, kosher restaurants, mikvaot, events
- Shiurim: Torah classes from YU Torah, Chabad, TorahAnytime
- Shabbat: Featured content and status for Shabbat mode

The module is split into logical submodules for maintainability:
- content: Content categories and listings
- featured: Featured content and daily shiur
- live: Currently live Torah classes
- shabbat: Shabbat featured content and status
- calendar: Hebrew dates, holidays, Daf Yomi
- news: Jewish news aggregation
- community: Community directory
- shiurim: Torah shiurim from RSS feeds
- admin: Data management endpoints
- schemas: Pydantic request/response models
- constants: Static configuration values
"""

from fastapi import APIRouter

from app.api.routes.judaism.admin import router as admin_router
from app.api.routes.judaism.calendar import router as calendar_router
from app.api.routes.judaism.community import router as community_router
from app.api.routes.judaism.content import router as content_router
from app.api.routes.judaism.featured import router as featured_router
from app.api.routes.judaism.live import router as live_router
from app.api.routes.judaism.news import router as news_router
from app.api.routes.judaism.shabbat import router as shabbat_router
from app.api.routes.judaism.shiurim import router as shiurim_router

# Create combined router
router = APIRouter()

# Include all sub-routers
# Order matters - more specific routes first
router.include_router(content_router)
router.include_router(featured_router)
router.include_router(live_router)
router.include_router(shabbat_router)
router.include_router(calendar_router)
router.include_router(news_router)
router.include_router(community_router)
router.include_router(shiurim_router)
router.include_router(admin_router)
