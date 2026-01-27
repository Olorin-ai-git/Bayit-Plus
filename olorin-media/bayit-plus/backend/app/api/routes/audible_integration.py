"""Audible Integration Routes

Combines OAuth, library, and search routes for complete Audible integration.

All endpoints require Premium or Family subscription tier.
Configuration requires OAuth credentials to be set in environment variables.
"""

from fastapi import APIRouter

# Import routers from modular route files
from app.api.routes.audible_oauth_routes import (
    router as oauth_router,
    AudibleOAuthRequest,
    AudibleOAuthCallback,
    AudibleOAuthUrlResponse,
    AudibleConnectionResponse,
)

from app.api.routes.audible_library_routes import (
    router as library_router,
)

from app.api.routes.audible_search_routes import (
    router as search_router,
    AudibleAudiobookResponse,
)

# Create combined router that includes all sub-routers
router = APIRouter()
router.include_router(oauth_router)
router.include_router(library_router)
router.include_router(search_router)

# Export models for external use
__all__ = [
    "router",
    "AudibleOAuthRequest",
    "AudibleOAuthCallback",
    "AudibleOAuthUrlResponse",
    "AudibleConnectionResponse",
    "AudibleAudiobookResponse",
]
