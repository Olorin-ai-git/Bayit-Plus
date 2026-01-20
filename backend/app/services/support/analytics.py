"""
Support Analytics Module
Handles analytics calculations for support system.
"""

from datetime import datetime, timezone, timedelta
from typing import Optional

from app.models.support import SupportTicket, SupportConversation


async def get_analytics(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
) -> dict:
    """Get support analytics for a date range."""
    if not end_date:
        end_date = datetime.now(timezone.utc)
    if not start_date:
        start_date = end_date - timedelta(days=30)

    tickets = await SupportTicket.find(
        SupportTicket.created_at >= start_date,
        SupportTicket.created_at <= end_date,
    ).to_list()

    conversations = await SupportConversation.find(
        SupportConversation.created_at >= start_date,
        SupportConversation.created_at <= end_date,
    ).to_list()

    tickets_resolved = len([t for t in tickets if t.status == 'resolved'])
    tickets_open = len([t for t in tickets if t.status == 'open'])

    voice_escalations = len([c for c in conversations if c.escalated])
    escalation_rate = voice_escalations / len(conversations) if conversations else 0

    response_times = [
        (t.first_response_at - t.created_at).total_seconds() / 60
        for t in tickets
        if t.first_response_at
    ]
    avg_response = sum(response_times) / len(response_times) if response_times else None

    resolution_times = [t.resolution_time_minutes for t in tickets if t.resolution_time_minutes]
    avg_resolution = sum(resolution_times) / len(resolution_times) if resolution_times else None

    rated_conversations = [c for c in conversations if c.rating]
    avg_rating = (
        sum(c.rating for c in rated_conversations) / len(rated_conversations)
        if rated_conversations else None
    )

    by_category: dict = {}
    for t in tickets:
        by_category[t.category] = by_category.get(t.category, 0) + 1

    by_priority: dict = {}
    for t in tickets:
        by_priority[t.priority] = by_priority.get(t.priority, 0) + 1

    return {
        'period_start': start_date,
        'period_end': end_date,
        'tickets_created': len(tickets),
        'tickets_resolved': tickets_resolved,
        'tickets_open': tickets_open,
        'tickets_by_category': by_category,
        'tickets_by_priority': by_priority,
        'voice_conversations': len(conversations),
        'voice_escalations': voice_escalations,
        'escalation_rate': round(escalation_rate, 2),
        'avg_first_response_minutes': round(avg_response, 1) if avg_response else None,
        'avg_resolution_minutes': round(avg_resolution, 1) if avg_resolution else None,
        'avg_rating': round(avg_rating, 2) if avg_rating else None,
        'ratings_count': len(rated_conversations),
        'common_topics': [],
    }
