"""
Talk Back Admin Routes.

CRUD for talk back points and AI generation from subtitles.
"""

import logging
import uuid
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.core.ai_clients import get_anthropic_client
from app.core.config import settings
from app.core.security import get_current_user
from app.models.talk_back_point import (
    ContentTalkBack,
    QuestionDifficulty,
    TalkBackPointModel,
)
from app.models.user import User
from app.services.subtitle_service import fetch_subtitles

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/talk-back/admin", tags=["talk-back-admin"])


class PointCreateRequest(BaseModel):
    timestamp_seconds: float = Field(..., ge=0)
    character_name: str = Field(..., max_length=100)
    character_name_he: str = Field(..., max_length=100)
    question_text: str = Field(..., max_length=300)
    question_text_he: str = Field(..., max_length=300)
    expected_responses: List[str] = Field(..., min_length=1)
    hint_text: str = Field(default="", max_length=200)
    hint_text_he: str = Field(default="", max_length=200)
    difficulty: QuestionDifficulty = QuestionDifficulty.EASY
    vocabulary_targets: List[str] = Field(default_factory=list)
    shekel_reward: int = Field(default=5, ge=1)
    points_reward: int = Field(default=10, ge=0)


class PointUpdateRequest(BaseModel):
    timestamp_seconds: Optional[float] = Field(None, ge=0)
    character_name: Optional[str] = Field(None, max_length=100)
    character_name_he: Optional[str] = Field(None, max_length=100)
    question_text: Optional[str] = Field(None, max_length=300)
    question_text_he: Optional[str] = Field(None, max_length=300)
    expected_responses: Optional[List[str]] = None
    difficulty: Optional[QuestionDifficulty] = None
    vocabulary_targets: Optional[List[str]] = None
    shekel_reward: Optional[int] = Field(None, ge=1)


class GenerateRequest(BaseModel):
    subtitle_url: str = Field(...)
    difficulty: QuestionDifficulty = QuestionDifficulty.EASY
    max_points: int = Field(default=5, ge=1, le=20)


@router.post("/content/{content_id}/points")
async def create_talk_back_point(
    content_id: str,
    request: PointCreateRequest,
    user: User = Depends(get_current_user),
):
    """Create a new talk back point for content."""
    content_tb = await ContentTalkBack.find_one({"content_id": content_id})
    if not content_tb:
        content_tb = ContentTalkBack(content_id=content_id)
        await content_tb.insert()

    point = TalkBackPointModel(
        point_id=str(uuid.uuid4()), **request.model_dump(),
    )
    content_tb.talk_back_points.append(point)
    content_tb.total_points = len(content_tb.talk_back_points)
    content_tb.updated_at = datetime.now(timezone.utc)
    await content_tb.save()

    logger.info(
        "Talk Back point created",
        extra={
            "content_id": content_id,
            "point_id": point.point_id,
            "admin_user": str(user.id),
        },
    )
    return {"point_id": point.point_id, "content_id": content_id}


@router.put("/point/{point_id}")
async def update_talk_back_point(
    point_id: str,
    request: PointUpdateRequest,
    user: User = Depends(get_current_user),
):
    """Update an existing talk back point."""
    content_tb = await ContentTalkBack.find_one(
        {"talk_back_points.point_id": point_id}
    )
    if not content_tb:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Talk Back point not found",
        )

    updates = request.model_dump(exclude_none=True)
    for point in content_tb.talk_back_points:
        if point.point_id == point_id:
            for field, value in updates.items():
                setattr(point, field, value)
            break

    content_tb.updated_at = datetime.now(timezone.utc)
    await content_tb.save()

    logger.info(
        "Talk Back point updated",
        extra={"point_id": point_id, "admin_user": str(user.id)},
    )
    return {"point_id": point_id, "updated": True}


@router.delete("/point/{point_id}")
async def delete_talk_back_point(
    point_id: str,
    user: User = Depends(get_current_user),
):
    """Delete a talk back point."""
    content_tb = await ContentTalkBack.find_one(
        {"talk_back_points.point_id": point_id}
    )
    if not content_tb:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Talk Back point not found",
        )

    content_tb.talk_back_points = [
        p for p in content_tb.talk_back_points if p.point_id != point_id
    ]
    content_tb.total_points = len(content_tb.talk_back_points)
    content_tb.updated_at = datetime.now(timezone.utc)
    await content_tb.save()

    logger.info(
        "Talk Back point deleted",
        extra={"point_id": point_id, "admin_user": str(user.id)},
    )
    return {"point_id": point_id, "deleted": True}


@router.post("/content/{content_id}/generate")
async def generate_talk_back_points(
    content_id: str,
    request: GenerateRequest,
    user: User = Depends(get_current_user),
):
    """AI-generate Talk Back points from content subtitles."""
    subtitle_track = await fetch_subtitles(request.subtitle_url)
    if not subtitle_track or not subtitle_track.cues:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not fetch or parse subtitles",
        )

    cue_text = "\n".join(
        f"[{c.start_time:.1f}s] {c.text}"
        for c in subtitle_track.cues[:settings.TALK_BACK_GENERATE_MAX_CUES]
    )

    client = get_anthropic_client()
    prompt = (
        f"Generate {request.max_points} Talk Back question points "
        f"from these Hebrew subtitles for difficulty={request.difficulty.value}. "
        f"Return JSON array with: timestamp_seconds, character_name, "
        f"character_name_he, question_text, question_text_he, "
        f"expected_responses (array), vocabulary_targets (array).\n\n{cue_text}"
    )

    response = await client.messages.create(
        model=settings.SUBTITLE_AI_MODEL,
        max_tokens=settings.TALK_BACK_GENERATE_MAX_TOKENS,
        messages=[{"role": "user", "content": prompt}],
    )

    logger.info(
        "Talk Back points AI-generated",
        extra={
            "content_id": content_id,
            "admin_user": str(user.id),
            "cues_used": len(subtitle_track.cues),
        },
    )
    return {"content_id": content_id, "generated_text": response.content[0].text}
