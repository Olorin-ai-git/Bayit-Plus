"""
Trivia Analytics Service

Provides analytics queries for live trivia feature monitoring:
topics detected, sessions, content coverage, and usage stats.
"""

from typing import Optional

from app.core.logging_config import get_logger
from app.models.live_trivia import LiveTriviaTopic, LiveTriviaSession
from app.models.trivia import ContentTrivia

logger = get_logger(__name__)


async def get_stats() -> dict:
    """Aggregate trivia statistics: topics, facts, sessions, coverage."""
    total_topics = await LiveTriviaTopic.count()
    total_facts = await LiveTriviaTopic.find().sum("facts_generated") or 0

    active_sessions = await LiveTriviaSession.find(
        {"session_end": None},   # noqa: E711
    ).count()

    total_content = await ContentTrivia.count()
    enriched_content = await ContentTrivia.find(
        {"is_enriched": True},   # noqa: E712
    ).count()

    coverage_pct = (
        round(enriched_content / total_content * 100, 1)
        if total_content
        else 0.0
    )

    return {
        "total_topics": total_topics,
        "total_facts_generated": total_facts,
        "active_sessions": active_sessions,
        "content_trivia_count": total_content,
        "enriched_content_count": enriched_content,
        "content_coverage_percentage": coverage_pct,
    }


async def get_recent_topics(
    limit: int = 20, offset: int = 0
) -> dict:
    """Paginated list of recent LiveTriviaTopic documents."""
    total = await LiveTriviaTopic.count()
    topics = (
        await LiveTriviaTopic.find()
        .sort("-detected_at")
        .skip(offset)
        .limit(limit)
        .to_list()
    )

    items = [
        {
            "topic_text": t.topic_text,
            "entity_type": t.entity_type,
            "channel_id": t.channel_id,
            "detected_at": t.detected_at.isoformat(),
            "mention_count": t.mention_count,
            "confidence_score": t.confidence_score,
            "facts_generated": t.facts_generated,
        }
        for t in topics
    ]

    return {
        "items": items,
        "total": total,
        "limit": limit,
        "offset": offset,
    }


async def get_sessions(
    status: Optional[str] = None, limit: int = 20
) -> list[dict]:
    """Get active or recent LiveTriviaSession list."""
    query_filters = {}
    if status == "active":
        query_filters["session_end"] = None
    elif status == "ended":
        query_filters["session_end"] = {"$ne": None}

    sessions = (
        await LiveTriviaSession.find(query_filters)
        .sort("-session_start")
        .limit(limit)
        .to_list()
    )

    return [
        {
            "user_id": s.user_id,
            "channel_id": s.channel_id,
            "session_start": s.session_start.isoformat(),
            "session_end": s.session_end.isoformat() if s.session_end else None,
            "shown_topics_count": len(s.shown_topics),
            "shown_facts_count": len(s.shown_fact_ids),
            "frequency": s.frequency,
        }
        for s in sessions
    ]


async def get_content_coverage() -> dict:
    """ContentTrivia enrichment statistics breakdown."""
    total = await ContentTrivia.count()
    enriched = await ContentTrivia.find(
        {"is_enriched": True},   # noqa: E712
    ).count()
    not_enriched = total - enriched

    all_docs = await ContentTrivia.find().to_list()
    total_facts = sum(len(d.facts) for d in all_docs)
    avg_facts = round(total_facts / total, 1) if total else 0.0

    sources: dict[str, int] = {}
    for doc in all_docs:
        for src in doc.sources_used:
            sources[src] = sources.get(src, 0) + 1

    return {
        "total_content": total,
        "enriched": enriched,
        "not_enriched": not_enriched,
        "coverage_percentage": round(enriched / total * 100, 1) if total else 0.0,
        "total_facts": total_facts,
        "average_facts_per_content": avg_facts,
        "sources_breakdown": sources,
    }
