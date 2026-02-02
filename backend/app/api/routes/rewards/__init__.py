"""
Rewards API Routes Module.

Provides endpoints for user rewards including points, badges, and stats.
"""

from fastapi import APIRouter

from app.api.routes.rewards.rewards_core import router as core_router

router = APIRouter()
router.include_router(core_router)

__all__ = ["router"]
