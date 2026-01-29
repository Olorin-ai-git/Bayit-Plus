"""
Voice API Module
Unified voice interaction endpoints for Olorin wizard avatar
"""

from fastapi import APIRouter

from .unified import router as unified_router

router = APIRouter()

# Include unified voice endpoint
# POST "/unified" - unified_voice_interaction
router.include_router(unified_router)
