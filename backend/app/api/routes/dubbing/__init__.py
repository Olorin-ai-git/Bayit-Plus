"""
User Dubbing and Subtitle Routes

B2C endpoints for Chrome extension
"""

from fastapi import APIRouter

from . import sessions, websocket

router = APIRouter()

# Include sub-routers
router.include_router(sessions.router, tags=["dubbing-sessions"])
router.include_router(websocket.router, tags=["dubbing-websocket"])
