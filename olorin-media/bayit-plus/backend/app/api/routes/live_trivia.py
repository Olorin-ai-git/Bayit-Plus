"""
Live Trivia REST API Endpoints

Provides endpoints for:
- User preferences (enable/disable, frequency)
- Topic history (admin)
- Session history (admin)
- Usage statistics
"""

import logging
from typing import List, Optional

from beanie import PydanticObjectId
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from app.core.security import get_current_user
from app.models.live_trivia import LiveTriviaSession, LiveTriviaTopic
from app.models.user import User
from app.services.live_feature_quota_service import live_feature_quota_service

router = APIRouter()
logger = logging.getLogger(__name__)


# Request/Response Models
class TriviaPreferencesRequest(BaseModel):
    """User trivia preferences update request."""

    enabled: bool = Field(..., description="Enable/disable live trivia")
    frequency: str = Field(
        "normal",
        pattern="^(off|low|normal|high)$",
        description="Frequency setting: off, low, normal, high"
    )


class TriviaPreferencesResponse(BaseModel):
    """User trivia preferences response."""

    enabled: bool
    frequency: str
    quota_remaining_hour: int
    quota_remaining_day: int
    quota_remaining_month: int
    quota_limit_hour: int
    quota_limit_day: int
    quota_limit_month: int


class TriviaTopicResponse(BaseModel):
    """Topic information response."""

    topic_id: str
    topic_text: str
    entity_type: str
    channel_id: str
    mention_count: int
    facts_generated: int
    confidence_score: float
    detected_at: str


class TriviaSessionResponse(BaseModel):
    """Session information response."""

    session_id: str
    user_id: str
    channel_id: str
    session_start: str
    session_end: Optional[str]
    shown_topics_count: int
    shown_facts_count: int
    frequency: str


# User Endpoints
@router.get("/preferences", response_model=TriviaPreferencesResponse)
async def get_trivia_preferences(
    current_user: User = Depends(get_current_user)
):
    """Get current user's live trivia preferences."""
    try:
        # Get user's active session
        session = await LiveTriviaSession.find_one(
            LiveTriviaSession.user_id == str(current_user.id),
            LiveTriviaSession.session_end == None
        )

        # Get quota stats
        quota = await live_feature_quota_service.quota_manager.get_or_create_quota(
            str(current_user.id)
        )

        return TriviaPreferencesResponse(
            enabled=session is not None,
            frequency=session.frequency if session else "normal",
            quota_remaining_hour=quota.trivia_facts_per_hour - quota.trivia_usage_current_hour,
            quota_remaining_day=quota.trivia_facts_per_day - quota.trivia_usage_current_day,
            quota_remaining_month=quota.trivia_facts_per_month - quota.trivia_usage_current_month,
            quota_limit_hour=quota.trivia_facts_per_hour,
            quota_limit_day=quota.trivia_facts_per_day,
            quota_limit_month=quota.trivia_facts_per_month,
        )

    except Exception as e:
        logger.error(f"Error getting trivia preferences: {e}")
        raise HTTPException(status_code=500, detail="Failed to get preferences")


@router.put("/preferences", response_model=TriviaPreferencesResponse)
async def update_trivia_preferences(
    preferences: TriviaPreferencesRequest,
    current_user: User = Depends(get_current_user)
):
    """Update current user's live trivia preferences."""
    try:
        # Find active session
        session = await LiveTriviaSession.find_one(
            LiveTriviaSession.user_id == str(current_user.id),
            LiveTriviaSession.session_end == None
        )

        if session:
            # Update existing session
            session.frequency = preferences.frequency
            await session.save()
        else:
            logger.info(
                f"No active session for user {current_user.id}, "
                "preferences will apply to next session"
            )

        # Get quota stats
        quota = await live_feature_quota_service.quota_manager.get_or_create_quota(
            str(current_user.id)
        )

        return TriviaPreferencesResponse(
            enabled=preferences.enabled,
            frequency=preferences.frequency,
            quota_remaining_hour=quota.trivia_facts_per_hour - quota.trivia_usage_current_hour,
            quota_remaining_day=quota.trivia_facts_per_day - quota.trivia_usage_current_day,
            quota_remaining_month=quota.trivia_facts_per_month - quota.trivia_usage_current_month,
            quota_limit_hour=quota.trivia_facts_per_hour,
            quota_limit_day=quota.trivia_facts_per_day,
            quota_limit_month=quota.trivia_facts_per_month,
        )

    except Exception as e:
        logger.error(f"Error updating trivia preferences: {e}")
        raise HTTPException(status_code=500, detail="Failed to update preferences")


# Admin Endpoints
@router.get("/admin/topics/{channel_id}", response_model=List[TriviaTopicResponse])
async def get_channel_topics(
    channel_id: str,
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_user)
):
    """Get detected topics for a channel (admin only)."""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")

    try:
        topics = await LiveTriviaTopic.find(
            LiveTriviaTopic.channel_id == channel_id
        ).sort("-detected_at").limit(limit).to_list()

        return [
            TriviaTopicResponse(
                topic_id=str(topic.id),
                topic_text=topic.topic_text,
                entity_type=topic.entity_type,
                channel_id=topic.channel_id,
                mention_count=topic.mention_count,
                facts_generated=topic.facts_generated,
                confidence_score=topic.confidence_score,
                detected_at=topic.detected_at.isoformat(),
            )
            for topic in topics
        ]

    except Exception as e:
        logger.error(f"Error getting channel topics: {e}")
        raise HTTPException(status_code=500, detail="Failed to get topics")


@router.get("/admin/sessions/{user_id}", response_model=List[TriviaSessionResponse])
async def get_user_sessions(
    user_id: str,
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user)
):
    """Get trivia sessions for a user (admin only)."""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")

    try:
        sessions = await LiveTriviaSession.find(
            LiveTriviaSession.user_id == user_id
        ).sort("-session_start").limit(limit).to_list()

        return [
            TriviaSessionResponse(
                session_id=str(session.id),
                user_id=session.user_id,
                channel_id=session.channel_id,
                session_start=session.session_start.isoformat(),
                session_end=session.session_end.isoformat() if session.session_end else None,
                shown_topics_count=len(session.shown_topics),
                shown_facts_count=len(session.shown_fact_ids),
                frequency=session.frequency,
            )
            for session in sessions
        ]

    except Exception as e:
        logger.error(f"Error getting user sessions: {e}")
        raise HTTPException(status_code=500, detail="Failed to get sessions")
