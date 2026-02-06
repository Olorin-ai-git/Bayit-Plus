"""
Voice API Module
Unified voice interaction endpoints for Olorin wizard avatar
"""

from fastapi import APIRouter

from .unified import router as unified_router
from .web_search import router as web_search_router

router = APIRouter()

# Include unified voice endpoint
# POST "/unified" - unified_voice_interaction
router.include_router(unified_router)

# Include voice web search endpoint
# POST "/web-search" - voice_web_search_endpoint
router.include_router(web_search_router)
