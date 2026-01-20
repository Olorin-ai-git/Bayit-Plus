"""
Metering Service for Olorin.ai Platform

DEPRECATED: This module has been refactored into the metering/ subpackage.
This file is kept for backward compatibility.

Import from app.services.olorin.metering instead.
"""

# Re-export from new location for backward compatibility
from app.services.olorin.metering import MeteringService, metering_service

__all__ = ["MeteringService", "metering_service"]
