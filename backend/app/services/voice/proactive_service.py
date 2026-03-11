"""
Proactive Voice Recommendation Service.
Generates personalized content recommendations based on
watch history, trending content, and user preferences.
"""

from typing import List, Optional

from app.core.logging_config import get_logger
from app.models.trending import ContentTrendMatch, TrendingSnapshot
from app.models.watchlist import WatchHistory

logger = get_logger(__name__)

CONTINUE_WATCHING_MIN_PROGRESS = 5.0
TRENDING_MIN_RELEVANCE = 0.3


async def get_continue_watching(
    user_id: str,
    profile_id: Optional[str],
    limit: int,
) -> List[dict]:
    """Get in-progress content for continue_watching recommendations."""
    query = {
        "user_id": user_id,
        "completed": False,
        "progress_percent": {"$gt": CONTINUE_WATCHING_MIN_PROGRESS},
    }
    if profile_id:
        query["profile_id"] = profile_id

    items = await WatchHistory.find(
        query
    ).sort("-last_watched_at").limit(limit).to_list()

    results = []
    for item in items:
        results.append({
            "content_id": item.content_id,
            "content_type": item.content_type,
            "reason_type": "continue_watching",
            "confidence": round(1.0 - (item.progress_percent / 100.0), 2),
            "context": {
                "progress_percent": item.progress_percent,
                "position": item.position,
                "duration": item.duration,
            },
        })
    return results


async def get_trending_recommendations(limit: int) -> List[dict]:
    """Get content matching current trending topics."""
    snapshot = await TrendingSnapshot.get_latest()
    if not snapshot or not snapshot.topics:
        return []

    matches = await ContentTrendMatch.find(
        ContentTrendMatch.relevance_score >= TRENDING_MIN_RELEVANCE,
    ).sort("-relevance_score").limit(limit).to_list()

    results = []
    for match in matches:
        results.append({
            "content_id": match.content_id,
            "content_type": match.content_type,
            "title": match.content_title,
            "reason_type": "trending",
            "confidence": round(match.relevance_score, 2),
            "context": {
                "trend_topic": match.matched_topic,
            },
        })
    return results


async def get_proactive_suggestions(
    user_id: str,
    profile_id: Optional[str],
    max_suggestions: int,
    platform: str,
    context: Optional[dict] = None,
) -> dict:
    """
    Build ranked list of proactive recommendations.

    Strategy:
    1. Continue watching (highest priority)
    2. Trending content
    3. Deduplicate and rank by confidence
    """
    candidates: List[dict] = []

    continue_items = await get_continue_watching(
        user_id, profile_id, limit=max_suggestions
    )
    candidates.extend(continue_items)

    trending_items = await get_trending_recommendations(
        limit=max_suggestions
    )
    candidates.extend(trending_items)

    # Deduplicate by content_id, keeping highest confidence
    seen: dict = {}
    for item in candidates:
        cid = item["content_id"]
        if cid not in seen or item["confidence"] > seen[cid]["confidence"]:
            seen[cid] = item

    ranked = sorted(
        seen.values(), key=lambda x: x["confidence"], reverse=True
    )[:max_suggestions]

    logger.info(
        "Proactive suggestions generated",
        extra={
            "user_id": user_id,
            "platform": platform,
            "total_candidates": len(candidates),
            "returned": len(ranked),
        },
    )

    return {
        "suggestions": ranked,
        "next_poll_seconds": _get_poll_interval(context),
    }


def _get_poll_interval(context: Optional[dict]) -> int:
    """Determine next poll interval based on user context."""
    if not context:
        return 120

    idle_seconds = context.get("idle_seconds", 0)
    if idle_seconds > 300:
        return 60
    if idle_seconds > 60:
        return 90
    return 120
