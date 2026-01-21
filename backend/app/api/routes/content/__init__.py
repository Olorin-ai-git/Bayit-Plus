"""
Content module.

This module handles all content-related functionality:
- Featured content and homepage data
- Content categories and discovery
- Content details and streaming
- Series-specific endpoints
- Movie-specific endpoints

The module is split into logical submodules for maintainability:
- featured: Homepage featured content
- categories: Category listing and content by category
- discovery: All content, search, sync
- detail: Content details and streaming URLs
- series: Series details, seasons, episodes
- movies: Movie details and TMDB enrichment
- utils: Shared utility functions
"""

from fastapi import APIRouter

from app.api.routes.content.categories import router as categories_router
from app.api.routes.content.detail import router as detail_router
from app.api.routes.content.discovery import router as discovery_router
from app.api.routes.content.featured import router as featured_router
from app.api.routes.content.movies import router as movies_router
from app.api.routes.content.series import router as series_router

# Create combined router
router = APIRouter()

# Include all sub-routers
# Order matters - more specific routes first
router.include_router(featured_router)
router.include_router(categories_router)
router.include_router(discovery_router)
router.include_router(series_router)
router.include_router(movies_router)
router.include_router(detail_router)
