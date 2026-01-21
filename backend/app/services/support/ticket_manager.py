"""
Ticket Manager - CRUD operations for support tickets.
"""

import logging
from datetime import datetime, timezone
from typing import List, Optional, Tuple

from app.models.support import SupportTicket, TicketMessage, TicketNote
from app.models.user import User
from app.services.support.constants import (DEFAULT_PRIORITY,
                                            HIGH_PRIORITY_WORDS,
                                            LOW_PRIORITY_WORDS,
                                            URGENT_PRIORITY_WORDS)

logger = logging.getLogger(__name__)


def detect_priority(subject: str, message: str) -> str:
    """Auto-detect ticket priority based on content."""
    text = f"{subject} {message}".lower()
    if any(word in text for word in URGENT_PRIORITY_WORDS):
        return "urgent"
    if any(word in text for word in HIGH_PRIORITY_WORDS):
        return "high"
    if any(word in text for word in LOW_PRIORITY_WORDS):
        return "low"
    return DEFAULT_PRIORITY


async def create_ticket(
    user: User,
    subject: str,
    message: str,
    category: str = "general",
    priority: Optional[str] = None,
    language: str = "en",
    voice_conversation_id: Optional[str] = None,
) -> SupportTicket:
    """Create a new support ticket."""
    if not priority:
        priority = detect_priority(subject, message)

    ticket = SupportTicket(
        user_id=user.id,
        user_email=user.email,
        user_name=user.name,
        subject=subject,
        message=message,
        category=category,
        priority=priority,
        language=language,
        voice_conversation_id=voice_conversation_id,
    )
    await ticket.insert()
    logger.info(f"Created ticket {ticket.id} for user {user.id}")
    return ticket


async def get_ticket(
    ticket_id: str,
    user: Optional[User] = None,
    is_admin: bool = False,
) -> Optional[SupportTicket]:
    """Get a ticket by ID, with permission check."""
    try:
        ticket = await SupportTicket.get(ticket_id)
        if not ticket:
            return None
        if not is_admin and user and ticket.user_id != user.id:
            return None
        return ticket
    except Exception as e:
        logger.error(f"Error getting ticket {ticket_id}: {e}")
        return None


async def list_user_tickets(
    user: User,
    page: int = 1,
    page_size: int = 20,
    status: Optional[str] = None,
) -> Tuple[List[SupportTicket], int]:
    """List tickets for a user."""
    query = SupportTicket.find(SupportTicket.user_id == user.id)
    if status:
        query = query.find(SupportTicket.status == status)
    total = await query.count()
    tickets = (
        await query.sort(-SupportTicket.created_at)
        .skip((page - 1) * page_size)
        .limit(page_size)
        .to_list()
    )
    return tickets, total


async def get_ticket_stats() -> dict:
    """Get aggregate ticket statistics using MongoDB aggregation pipeline."""
    stats = {"by_status": {}, "by_priority": {}, "by_category": {}}

    # Use aggregation pipeline for efficient statistics calculation on database side
    pipeline_status = [{"$group": {"_id": "$status", "count": {"$sum": 1}}}]
    pipeline_priority = [{"$group": {"_id": "$priority", "count": {"$sum": 1}}}]
    pipeline_category = [{"$group": {"_id": "$category", "count": {"$sum": 1}}}]

    # Execute aggregations in parallel using gather
    import asyncio

    status_results, priority_results, category_results = await asyncio.gather(
        SupportTicket.aggregate(pipeline_status).to_list(),
        SupportTicket.aggregate(pipeline_priority).to_list(),
        SupportTicket.aggregate(pipeline_category).to_list(),
    )

    # Build stats dictionaries from aggregation results
    stats["by_status"] = {result["_id"]: result["count"] for result in status_results}
    stats["by_priority"] = {
        result["_id"]: result["count"] for result in priority_results
    }
    stats["by_category"] = {
        result["_id"]: result["count"] for result in category_results
    }

    return stats


async def list_admin_tickets(
    page: int = 1,
    page_size: int = 20,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    category: Optional[str] = None,
    assigned_to: Optional[str] = None,
) -> Tuple[List[SupportTicket], int, dict]:
    """List tickets for admin with filters and stats."""
    query = SupportTicket.find()
    if status:
        query = query.find(SupportTicket.status == status)
    if priority:
        query = query.find(SupportTicket.priority == priority)
    if category:
        query = query.find(SupportTicket.category == category)
    if assigned_to:
        query = query.find(SupportTicket.assigned_to == assigned_to)

    total = await query.count()
    tickets = (
        await query.sort(
            [
                ("priority", -1),
                ("created_at", -1),
            ]
        )
        .skip((page - 1) * page_size)
        .limit(page_size)
        .to_list()
    )
    stats = await get_ticket_stats()
    return tickets, total, stats


async def update_ticket(
    ticket_id: str,
    admin: User,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    assigned_to: Optional[str] = None,
    tags: Optional[List[str]] = None,
) -> Optional[SupportTicket]:
    """Update ticket (admin only)."""
    ticket = await SupportTicket.get(ticket_id)
    if not ticket:
        return None

    if status:
        ticket.status = status
        if status == "resolved":
            ticket.resolved_at = datetime.now(timezone.utc)
            if ticket.created_at:
                delta = datetime.now(timezone.utc) - ticket.created_at
                ticket.resolution_time_minutes = int(delta.total_seconds() / 60)
        elif status == "closed":
            ticket.closed_at = datetime.now(timezone.utc)

    if priority:
        ticket.priority = priority
    if assigned_to is not None:
        ticket.assigned_to = assigned_to
        ticket.assigned_at = datetime.now(timezone.utc) if assigned_to else None
    if tags is not None:
        ticket.tags = tags

    ticket.updated_at = datetime.now(timezone.utc)
    await ticket.save()
    logger.info(f"Updated ticket {ticket_id} by admin {admin.id}")
    return ticket


async def add_ticket_message(
    ticket_id: str,
    author: User,
    content: str,
    is_support: bool = False,
) -> Optional[SupportTicket]:
    """Add a message to a ticket thread."""
    ticket = await SupportTicket.get(ticket_id)
    if not ticket:
        return None

    message = TicketMessage(
        author_id=str(author.id),
        author_name=author.name,
        author_role="support" if is_support else "user",
        content=content,
    )
    ticket.messages.append(message)
    ticket.updated_at = datetime.now(timezone.utc)

    if is_support and not ticket.first_response_at:
        ticket.first_response_at = datetime.now(timezone.utc)

    await ticket.save()
    return ticket


async def add_ticket_note(
    ticket_id: str,
    admin: User,
    content: str,
) -> Optional[SupportTicket]:
    """Add an internal note to a ticket (admin only)."""
    ticket = await SupportTicket.get(ticket_id)
    if not ticket:
        return None

    note = TicketNote(
        author_id=str(admin.id),
        author_name=admin.name,
        content=content,
    )
    ticket.notes.append(note)
    ticket.updated_at = datetime.now(timezone.utc)
    await ticket.save()
    return ticket
