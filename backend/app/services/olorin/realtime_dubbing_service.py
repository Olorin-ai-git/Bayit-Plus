"""
Realtime Dubbing Service for Olorin.ai Platform

DEPRECATED: This module has been refactored into the dubbing/ subpackage.
This file is kept for backward compatibility.

Import from app.services.olorin.dubbing instead.
"""

# Re-export from new location for backward compatibility
from app.services.olorin.dubbing import (
    RealtimeDubbingService,
    DubbingMessage,
    DubbingMetrics,
)

__all__ = ["RealtimeDubbingService", "DubbingMessage", "DubbingMetrics"]
