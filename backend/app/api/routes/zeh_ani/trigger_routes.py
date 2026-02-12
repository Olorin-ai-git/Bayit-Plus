"""Zeh Ani Scene Trigger REST API endpoints."""

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.core.config import settings
from app.core.logging_config import get_logger
from app.core.security import get_current_admin_user, get_current_user
from app.models.scene_trigger import (
    ContentSceneTriggers,
    SceneTrigger,
    TriggerType,
)
from app.models.user import User

logger = get_logger(__name__)
router = APIRouter(prefix="/zeh-ani/triggers", tags=["zeh-ani"])


class TriggerCreateRequest(BaseModel):
    """Request body for creating a new scene trigger."""

    timestamp_seconds: float = Field(..., ge=0.0)
    trigger_type: TriggerType
    target_word_he: str = Field(default="")
    prompt_text_en: str = Field(default="")
    prompt_text_he: str = Field(default="")
    expected_response: str = Field(default="")
    avatar_animation: str = Field(default="celebrate")
    duration_seconds: float = Field(default=10.0, ge=1.0, le=60.0)


def _trigger_dict(trigger: SceneTrigger) -> dict:
    """Convert a SceneTrigger to API response dict."""
    return {
        "trigger_id": trigger.trigger_id,
        "timestamp_seconds": trigger.timestamp_seconds,
        "trigger_type": trigger.trigger_type.value,
        "target_word_he": trigger.target_word_he,
        "prompt_text_en": trigger.prompt_text_en,
        "prompt_text_he": trigger.prompt_text_he,
        "expected_response": trigger.expected_response,
        "avatar_animation": trigger.avatar_animation,
        "duration_seconds": trigger.duration_seconds,
    }


@router.get("/{content_id}")
async def get_triggers(
    content_id: str,
    user: User = Depends(get_current_user),
):
    """Get all scene triggers for a content item."""
    doc = await ContentSceneTriggers.find_one(
        ContentSceneTriggers.content_id == content_id,
    )
    if not doc:
        return {"content_id": content_id, "triggers": []}

    return {
        "content_id": content_id,
        "triggers": [_trigger_dict(t) for t in doc.triggers],
        "trigger_count": doc.trigger_count,
    }


@router.post("/{content_id}")
async def create_trigger(
    content_id: str,
    request: TriggerCreateRequest,
    user: User = Depends(get_current_admin_user),
):
    """Admin: add a scene trigger to a content item."""
    doc = await ContentSceneTriggers.find_one(
        ContentSceneTriggers.content_id == content_id,
    )

    if not doc:
        doc = ContentSceneTriggers(
            content_id=content_id,
            triggers=[],
            author_user_id=str(user.id),
        )
        await doc.insert()

    max_triggers = settings.SCENE_TRIGGER_MAX_PER_CONTENT
    if len(doc.triggers) >= max_triggers:
        raise HTTPException(
            status_code=400,
            detail=f"Maximum of {max_triggers} triggers per content",
        )

    trigger = SceneTrigger(
        trigger_id=str(uuid.uuid4()),
        timestamp_seconds=request.timestamp_seconds,
        trigger_type=request.trigger_type,
        target_word_he=request.target_word_he,
        prompt_text_en=request.prompt_text_en,
        prompt_text_he=request.prompt_text_he,
        expected_response=request.expected_response,
        avatar_animation=request.avatar_animation,
        duration_seconds=request.duration_seconds,
    )

    doc.triggers.append(trigger)
    doc.updated_at = datetime.now(timezone.utc)
    await doc.save()

    logger.info(
        "Scene trigger created",
        extra={
            "content_id": content_id,
            "trigger_id": trigger.trigger_id,
            "trigger_type": trigger.trigger_type.value,
            "user_id": str(user.id),
        },
    )

    return {
        "content_id": content_id,
        "trigger": _trigger_dict(trigger),
    }


@router.delete("/{content_id}/{trigger_id}")
async def delete_trigger(
    content_id: str,
    trigger_id: str,
    user: User = Depends(get_current_admin_user),
):
    """Admin: remove a scene trigger from a content item."""
    doc = await ContentSceneTriggers.find_one(
        ContentSceneTriggers.content_id == content_id,
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Content triggers not found")

    original_count = len(doc.triggers)
    doc.triggers = [t for t in doc.triggers if t.trigger_id != trigger_id]

    if len(doc.triggers) == original_count:
        raise HTTPException(status_code=404, detail="Trigger not found")

    doc.updated_at = datetime.now(timezone.utc)
    await doc.save()

    logger.info(
        "Scene trigger deleted",
        extra={
            "content_id": content_id,
            "trigger_id": trigger_id,
            "user_id": str(user.id),
        },
    )

    return {"content_id": content_id, "deleted_trigger_id": trigger_id}
