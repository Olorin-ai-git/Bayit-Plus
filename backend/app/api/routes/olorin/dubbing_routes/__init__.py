"""
Olorin.ai Realtime Dubbing API Package

WebSocket and REST endpoints for real-time audio dubbing.
"""

from fastapi import APIRouter

from app.api.routes.olorin.dubbing_routes.sessions import router as sessions_router
from app.api.routes.olorin.dubbing_routes.websocket import router as ws_router

router = APIRouter()
router.include_router(sessions_router)
router.include_router(ws_router)

__all__ = ["router"]
