"""
Trivia API Routes Package.
Modular trivia API with core, admin, and preferences routes.
"""

from fastapi import APIRouter

from .trivia_admin import router as admin_router
from .trivia_core import router as core_router
from .trivia_preferences import router as preferences_router

router = APIRouter()

# Include all trivia routes
router.include_router(core_router)
router.include_router(admin_router)
router.include_router(preferences_router)

__all__ = ["router"]
