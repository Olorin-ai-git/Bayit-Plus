"""
Trending Topics API routes.
Provides trending topics from Israeli news and content recommendations.
"""

from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.security import get_optional_user
from app.models.content import Content, LiveChannel, Podcast, RadioStation
from app.models.trending import (TrendingAnalysisResponse,
                                 TrendingContentResponse, TrendingSnapshot,
                                 TrendingTopicItem)
from app.models.user import User
from app.services.news_analyzer import (CATEGORY_LABELS, analysis_to_dict,
                                        get_trending_analysis)
from app.services.news_scraper import get_cached_headlines, headlines_to_dict

router = APIRouter()


@router.get("/topics")
async def get_trending_topics(
    current_user: Optional[User] = Depends(get_optional_user),
):
    """
    Get current trending topics from Israeli news.
    Returns AI-analyzed topics from Ynet, Walla, and Mako.
    """
    analysis = await get_trending_analysis()

    return {
        "topics": [
            {
                "title": t.title,
                "title_en": t.title_en,
                "category": t.category,
                "category_label": CATEGORY_LABELS.get(
                    t.category, CATEGORY_LABELS["general"]
                ),
                "sentiment": t.sentiment,
                "importance": t.importance,
                "summary": t.summary,
                "keywords": t.keywords,
            }
            for t in analysis.topics
        ],
        "overall_mood": analysis.overall_mood,
        "top_story": analysis.top_story,
        "analyzed_at": analysis.analyzed_at.isoformat(),
        "headline_count": analysis.headline_count,
        "sources": analysis.sources,
    }


@router.get("/headlines")
async def get_headlines(
    source: Optional[str] = Query(
        None, description="Filter by source: ynet, walla, mako"
    ),
    limit: int = Query(20, le=50),
):
    """
    Get raw headlines from Israeli news sources.
    """
    news = await get_cached_headlines()

    headlines = news.headlines
    if source:
        headlines = [h for h in headlines if h.source == source]

    headlines = headlines[:limit]

    return {
        "headlines": headlines_to_dict(headlines),
        "sources": news.sources,
        "error_sources": news.error_sources,
        "scraped_at": news.scraped_at.isoformat(),
    }


@router.get("/recommendations")
async def get_trending_recommendations(
    limit: int = Query(10, le=20),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """
    Get content recommendations based on what's trending in Israel.
    Matches platform content with current trending topics.
    """
    # Get trending analysis
    analysis = await get_trending_analysis()

    if not analysis.topics:
        return {
            "recommendations": [],
            "trending_topics": [],
            "message": "No trending topics available",
        }

    # Get all keywords from topics
    all_keywords = []
    for topic in analysis.topics:
        all_keywords.extend(topic.keywords)
        all_keywords.append(topic.title)

    # Search for matching content
    recommendations = []

    # Search VOD content
    vod_content = await Content.find(Content.is_published == True).limit(100).to_list()

    for content in vod_content:
        score = 0
        title_lower = content.title.lower()
        desc_lower = (content.description or "").lower()
        tags = [t.lower() for t in (content.tags or [])]

        matched_topic = None
        for topic in analysis.topics:
            topic_keywords = topic.keywords + [topic.title]
            for kw in topic_keywords:
                kw_lower = kw.lower()
                if kw_lower in title_lower:
                    score += 3
                    matched_topic = topic.title
                if kw_lower in desc_lower:
                    score += 2
                    matched_topic = matched_topic or topic.title
                if kw_lower in tags:
                    score += 1
                    matched_topic = matched_topic or topic.title

        if score > 0 and matched_topic:
            recommendations.append(
                {
                    "id": str(content.id),
                    "title": content.title,
                    "description": content.description,
                    "thumbnail": content.thumbnail,
                    "type": "vod",
                    "trending_topic": matched_topic,
                    "relevance_score": score,
                }
            )

    # Search live channels
    channels = await LiveChannel.find(LiveChannel.is_active == True).to_list()

    for channel in channels:
        score = 0
        name_lower = channel.name.lower()
        desc_lower = (channel.description or "").lower()

        matched_topic = None
        for topic in analysis.topics:
            if topic.category in ["politics", "security", "economy"]:
                # News channels match news-related topics
                if "news" in name_lower or "חדשות" in name_lower:
                    score += 2
                    matched_topic = topic.title
                    break

        if score > 0 and matched_topic:
            recommendations.append(
                {
                    "id": str(channel.id),
                    "title": channel.name,
                    "description": channel.description,
                    "thumbnail": channel.thumbnail or channel.logo,
                    "type": "live",
                    "trending_topic": matched_topic,
                    "relevance_score": score,
                }
            )

    # Sort by relevance
    recommendations.sort(key=lambda x: x["relevance_score"], reverse=True)
    recommendations = recommendations[:limit]

    return {
        "recommendations": recommendations,
        "trending_topics": [
            {"title": t.title, "category": t.category} for t in analysis.topics[:3]
        ],
        "analyzed_at": analysis.analyzed_at.isoformat(),
    }


@router.get("/summary")
async def get_daily_summary(current_user: Optional[User] = Depends(get_optional_user)):
    """
    Get a brief AI-generated summary of what's happening in Israel today.
    Perfect for the "Morning Ritual" feature.
    """
    analysis = await get_trending_analysis()

    if not analysis.topics:
        return {
            "summary": "לא ניתן לטעון את החדשות כרגע.",
            "summary_en": "Unable to load news at this time.",
            "topics": [],
        }

    # Build Hebrew summary
    summary_parts = []

    if analysis.top_story:
        summary_parts.append(f"📰 {analysis.top_story}")

    if analysis.overall_mood:
        summary_parts.append(f"🇮🇱 {analysis.overall_mood}")

    # Add top 3 topics
    for i, topic in enumerate(analysis.topics[:3], 1):
        emoji = {
            "security": "🔒",
            "politics": "🏛️",
            "tech": "💻",
            "culture": "🎭",
            "sports": "⚽",
            "economy": "📈",
            "entertainment": "🎬",
        }.get(topic.category, "📌")

        if topic.summary:
            summary_parts.append(f"{emoji} {topic.summary}")

    return {
        "summary": "\n\n".join(summary_parts),
        "top_story": analysis.top_story,
        "overall_mood": analysis.overall_mood,
        "topics": [
            {
                "title": t.title,
                "category": t.category,
                "category_label": CATEGORY_LABELS.get(
                    t.category, CATEGORY_LABELS["general"]
                ),
                "importance": t.importance,
            }
            for t in analysis.topics
        ],
        "sources": analysis.sources,
        "analyzed_at": analysis.analyzed_at.isoformat(),
    }


@router.get("/category/{category}")
async def get_topics_by_category(
    category: str, current_user: Optional[User] = Depends(get_optional_user)
):
    """
    Get trending topics filtered by category.
    Categories: security, politics, tech, culture, sports, economy, entertainment
    """
    valid_categories = list(CATEGORY_LABELS.keys())
    if category not in valid_categories:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid category. Must be one of: {', '.join(valid_categories)}",
        )

    analysis = await get_trending_analysis()

    filtered_topics = [t for t in analysis.topics if t.category == category]

    return {
        "category": category,
        "category_label": CATEGORY_LABELS[category],
        "topics": [
            {
                "title": t.title,
                "title_en": t.title_en,
                "sentiment": t.sentiment,
                "importance": t.importance,
                "summary": t.summary,
                "keywords": t.keywords,
            }
            for t in filtered_topics
        ],
        "count": len(filtered_topics),
    }
