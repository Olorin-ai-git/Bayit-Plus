"""
Admin Audiobooks Router Aggregator

Aggregates CRUD and action routes for audiobook management.
"""

from fastapi import APIRouter

from app.api.routes.admin_audiobooks_crud import router as crud_router
from app.api.routes.admin_audiobooks_actions import router as actions_router

router = APIRouter()

# Include CRUD routes
router.include_router(crud_router)

# Include action routes
router.include_router(actions_router)
