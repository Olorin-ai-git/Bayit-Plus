"""
Quiz API Routes Module.

Provides endpoints for kids quiz feature including:
- Quiz retrieval and generation
- Quiz submission and scoring
- Quiz history
"""

from fastapi import APIRouter

from app.api.routes.quiz.quiz_core import router as core_router

router = APIRouter()
router.include_router(core_router)

__all__ = ["router"]
