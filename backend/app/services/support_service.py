"""
Support Service - Backward Compatibility Module

This module re-exports the SupportService class and singleton instance
from the refactored app.services.support package.

For new code, prefer importing directly from:
    from app.services.support import SupportService, support_service

This file maintains backward compatibility for existing imports:
    from app.services.support_service import support_service
"""

from app.services.support import SupportService, support_service

__all__ = ["SupportService", "support_service"]
