"""
Support Service
Main coordinator class for support system functionality.
Delegates to specialized modules for ticket, chat, FAQ, and analytics operations.
"""

from datetime import datetime
from typing import Optional, List, Tuple, AsyncIterator

import anthropic

from app.core.config import settings
from app.models.support import SupportTicket
from app.models.user import User
from app.services.support import ticket_manager, voice_chat, faq_manager, analytics
from app.services.support.conversation import rate_conversation as _rate_conversation


class SupportService:
    """
    Support system business logic.
    Handles tickets, voice chat, FAQ, and analytics.
    """

    def __init__(self) -> None:
        """Initialize SupportService with Anthropic client and configuration."""
        self.async_client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
        self.max_tokens = settings.SUPPORT_CHAT_MAX_TOKENS
        self.escalation_threshold = settings.SUPPORT_ESCALATION_THRESHOLD

    # Voice Support Chat

    async def chat(
        self, message: str, user: User, language: str = 'en',
        conversation_id: Optional[str] = None, app_context: Optional[dict] = None,
    ) -> dict:
        """Process a voice support chat message."""
        return await voice_chat.chat(
            self.async_client, message, user, language, conversation_id, app_context, self.max_tokens
        )

    async def chat_streaming(
        self, message: str, user: User, language: str = 'en',
        conversation_id: Optional[str] = None, app_context: Optional[dict] = None,
    ) -> AsyncIterator[dict]:
        """Process a voice support chat message with streaming response."""
        async for chunk in voice_chat.chat_streaming(
            self.async_client, message, user, language, conversation_id, app_context, self.max_tokens
        ):
            yield chunk

    async def rate_conversation(
        self, conversation_id: str, user: User, rating: int, feedback: Optional[str] = None,
    ) -> bool:
        """Rate a support conversation."""
        return await _rate_conversation(conversation_id, user, rating, feedback)

    # Ticket Management

    async def create_ticket(
        self, user: User, subject: str, message: str, category: str = 'general',
        priority: Optional[str] = None, language: str = 'en',
        voice_conversation_id: Optional[str] = None,
    ) -> SupportTicket:
        """Create a new support ticket."""
        return await ticket_manager.create_ticket(
            user, subject, message, category, priority, language, voice_conversation_id
        )

    async def get_ticket(
        self, ticket_id: str, user: Optional[User] = None, is_admin: bool = False,
    ) -> Optional[SupportTicket]:
        """Get a ticket by ID, with permission check."""
        return await ticket_manager.get_ticket(ticket_id, user, is_admin)

    async def list_user_tickets(
        self, user: User, page: int = 1, page_size: int = 20, status: Optional[str] = None,
    ) -> Tuple[List[SupportTicket], int]:
        """List tickets for a user."""
        return await ticket_manager.list_user_tickets(user, page, page_size, status)

    async def list_admin_tickets(
        self, page: int = 1, page_size: int = 20, status: Optional[str] = None,
        priority: Optional[str] = None, category: Optional[str] = None,
        assigned_to: Optional[str] = None,
    ) -> Tuple[List[SupportTicket], int, dict]:
        """List tickets for admin with filters and stats."""
        return await ticket_manager.list_admin_tickets(
            page, page_size, status, priority, category, assigned_to
        )

    async def update_ticket(
        self, ticket_id: str, admin: User, status: Optional[str] = None,
        priority: Optional[str] = None, assigned_to: Optional[str] = None,
        tags: Optional[List[str]] = None,
    ) -> Optional[SupportTicket]:
        """Update ticket (admin only)."""
        return await ticket_manager.update_ticket(
            ticket_id, admin, status, priority, assigned_to, tags
        )

    async def add_ticket_message(
        self, ticket_id: str, author: User, content: str, is_support: bool = False,
    ) -> Optional[SupportTicket]:
        """Add a message to a ticket thread."""
        return await ticket_manager.add_ticket_message(ticket_id, author, content, is_support)

    async def add_ticket_note(
        self, ticket_id: str, admin: User, content: str,
    ) -> Optional[SupportTicket]:
        """Add an internal note to a ticket (admin only)."""
        return await ticket_manager.add_ticket_note(ticket_id, admin, content)

    # FAQ Management

    async def get_faq_by_category(
        self, category: Optional[str] = None, language: str = 'en',
    ) -> List[dict]:
        """Get FAQ entries, optionally filtered by category."""
        return await faq_manager.get_faq_by_category(category, language)

    async def record_faq_view(self, faq_id: str) -> None:
        """Record a view for an FAQ entry."""
        await faq_manager.record_faq_view(faq_id)

    async def record_faq_feedback(self, faq_id: str, helpful: bool) -> None:
        """Record feedback for an FAQ entry."""
        await faq_manager.record_faq_feedback(faq_id, helpful)

    # Analytics

    async def get_analytics(
        self, start_date: Optional[datetime] = None, end_date: Optional[datetime] = None,
    ) -> dict:
        """Get support analytics for a date range."""
        return await analytics.get_analytics(start_date, end_date)
