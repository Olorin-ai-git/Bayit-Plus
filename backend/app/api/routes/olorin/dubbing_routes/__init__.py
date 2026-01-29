"""
Olorin.ai Realtime Dubbing API Package

WebSocket, REST, SSE, and voice training endpoints for real-time audio dubbing.
"""

from fastapi import APIRouter

from app.api.routes.olorin.dubbing_routes.sessions import \
    router as sessions_router
from app.api.routes.olorin.dubbing_routes.voice_training import \
    router as voice_training_router
from app.api.routes.olorin.dubbing_routes.websocket import router as ws_router

router = APIRouter()
router.include_router(sessions_router)
router.include_router(ws_router)

# P3-1: Voice training endpoints
router.include_router(voice_training_router)

# P3-4: SSE fallback for restricted networks
try:
    from app.services.olorin.dubbing.sse_fallback import \
        router as sse_router

    router.include_router(sse_router)
except ImportError:
    pass

__all__ = ["router"]
