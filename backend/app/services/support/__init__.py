"""
Support Service Package
Provides support system functionality including ticket management,
voice chat, FAQ, and analytics.

This module re-exports the main SupportService class and singleton instance
for backward compatibility with existing imports.
"""

from app.services.support import (
    analytics,
    chat_utils,
    constants,
    conversation,
    faq_manager,
    ticket_manager,
    voice_chat,
)
from app.services.support.service import SupportService

# Singleton instance for backward compatibility
support_service = SupportService()

__all__ = [
    "SupportService",
    "support_service",
    "constants",
    "ticket_manager",
    "voice_chat",
    "faq_manager",
    "analytics",
    "conversation",
    "chat_utils",
]
