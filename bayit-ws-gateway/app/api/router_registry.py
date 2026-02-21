"""
WebSocket Gateway Router Registry.

Registers WebSocket routes migrated from the monolith. Routes are imported
from the monolith package (bayit-backend path dependency) and registered
on the gateway FastAPI app.

Migration phases:
  4a: Channel chat, diagnostics (no REST coupling)
  4b: Single-user routes (dubbing, subtitles, trivia, etc.)
  4c: Multi-user social routes (party, chess, DM)
  4d: Admin/B2B routes
"""

import logging

from fastapi import FastAPI

from app.core.config import settings

logger = logging.getLogger(__name__)


def register_ws_routes(app: FastAPI) -> None:
    """Register all migrated WebSocket routes on the gateway."""
    prefix = settings.API_V1_PREFIX

    # ============================================
    # Phase 4a: Channel Chat + Diagnostics
    # ============================================
    from app.api.routes import websocket_channel_chat, websocket_diagnostics

    app.include_router(
        websocket_channel_chat.router,
        prefix=prefix,
        tags=["websocket", "channel-chat"],
    )
    app.include_router(
        websocket_diagnostics.router,
        tags=["websocket", "diagnostics"],
    )
    logger.info("Phase 4a routes registered: channel-chat, diagnostics")

    # ============================================
    # Phase 4b: Single-user routes
    # ============================================
    from app.api.routes import (
        websocket_live_dubbing,
        websocket_live_subtitles,
        websocket_live_trivia,
        websocket_bilingual_dubbing,
        websocket_talk_back,
        websocket_vod_interaction,
    )

    app.include_router(
        websocket_live_dubbing.router,
        prefix=prefix,
        tags=["websocket", "live-dubbing"],
    )
    app.include_router(
        websocket_live_subtitles.router,
        prefix=prefix,
        tags=["websocket", "live-subtitles"],
    )
    app.include_router(
        websocket_live_trivia.router,
        prefix=prefix,
        tags=["websocket", "live-trivia"],
    )
    app.include_router(
        websocket_bilingual_dubbing.router,
        prefix=prefix,
        tags=["websocket", "bilingual-dubbing"],
    )
    app.include_router(
        websocket_talk_back.router,
        prefix=prefix,
        tags=["websocket", "talk-back"],
    )
    app.include_router(
        websocket_vod_interaction.router,
        prefix=prefix,
        tags=["websocket", "vod-interaction"],
    )

    # Conditional single-user routes (may have import guards)
    try:
        from app.api.routes import websocket_interactive_mission
        app.include_router(
            websocket_interactive_mission.router,
            prefix=prefix,
            tags=["websocket", "interactive-missions"],
        )
    except ImportError:
        logger.warning("websocket_interactive_mission not available")

    try:
        from app.api.routes import websocket_phonetic_mirror
        app.include_router(
            websocket_phonetic_mirror.router,
            prefix=prefix,
            tags=["websocket", "phonetic-mirror"],
        )
    except ImportError:
        logger.warning("websocket_phonetic_mirror not available")

    try:
        from app.api.routes import websocket_v2v
        app.include_router(
            websocket_v2v.router,
            prefix=prefix,
            tags=["websocket", "zeh-ani"],
        )
    except ImportError:
        logger.warning("websocket_v2v not available")

    try:
        from app.api.routes import websocket_live_layer
        app.include_router(
            websocket_live_layer.router,
            prefix=prefix,
            tags=["websocket", "zeh-ani"],
        )
    except ImportError:
        logger.warning("websocket_live_layer not available")

    logger.info("Phase 4b routes registered: single-user WS routes")

    # ============================================
    # Phase 4c: Multi-user social routes
    # ============================================
    from app.api.routes import websocket, websocket_chess, websocket_dm

    app.include_router(
        websocket.router, prefix=prefix, tags=["websocket"]
    )
    app.include_router(
        websocket_chess.router, prefix=prefix, tags=["websocket", "chess"]
    )
    app.include_router(
        websocket_dm.router, prefix=prefix, tags=["websocket", "direct-messages"]
    )
    logger.info("Phase 4c routes registered: party, chess, DM")

    # ============================================
    # Phase 4d: Admin/B2B routes
    # ============================================
    try:
        from app.api.routes.admin_uploads import websocket as admin_ws
        app.include_router(
            admin_ws.router, prefix=prefix, tags=["websocket", "admin-uploads"]
        )
    except ImportError:
        logger.warning("admin_uploads websocket not available")

    try:
        from app.api.routes.dubbing import websocket as dubbing_ws
        app.include_router(
            dubbing_ws.router, prefix=prefix, tags=["websocket", "dubbing"]
        )
    except ImportError:
        logger.warning("dubbing websocket not available")

    try:
        from app.api.routes.olorin.dubbing_routes import websocket as olorin_dubbing_ws
        app.include_router(
            olorin_dubbing_ws.router, prefix=prefix, tags=["websocket", "olorin-dubbing"]
        )
    except ImportError:
        logger.warning("olorin dubbing websocket not available")

    logger.info("Phase 4d routes registered: admin/B2B WS routes")
    logger.info("WebSocket Gateway: All route phases registered")
