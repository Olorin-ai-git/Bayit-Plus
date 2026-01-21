"""
Content Services Module - Shared functionality for specialized content services.

This module provides base classes and utilities used by:
- youngsters_content_service (teen content)
- kids_content_service (children's content)
- tel_aviv_content_service (Tel Aviv focused content)
"""

from app.services.content_services.base_cache import ContentCache

__all__ = ["ContentCache"]
