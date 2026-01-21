"""
Olorin.ai Realtime Dubbing API

DEPRECATED: This module has been refactored into the dubbing_routes/ subpackage.
This file is kept for backward compatibility.

Import from app.api.routes.olorin.dubbing_routes instead.
"""

# Re-export router from new location for backward compatibility
from app.api.routes.olorin.dubbing_routes import router
from app.api.routes.olorin.dubbing_routes.models import (CreateSessionRequest,
                                                         SessionEndResponse,
                                                         SessionResponse,
                                                         VoiceInfo,
                                                         VoicesResponse)

__all__ = [
    "router",
    "CreateSessionRequest",
    "SessionResponse",
    "SessionEndResponse",
    "VoiceInfo",
    "VoicesResponse",
]
