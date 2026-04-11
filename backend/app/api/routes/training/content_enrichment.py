"""Training platform content enrichment routes (chapters, characters)."""

import logging

from fastapi import APIRouter, Depends

from app.api.routes.training.content_utils import load_content_for_partner
from app.api.routes.training.dependencies import get_current_training_user
from app.models.chapters import VideoChapters
from app.models.training_user import TrainingUser

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/content", tags=["training-content"])


@router.get("/{content_id}/chapters")
async def get_content_chapters(
    content_id: str,
    user: TrainingUser = Depends(get_current_training_user),
):
    """Get chapters for a training content item."""
    await load_content_for_partner(content_id, user.partner_id, user_role=user.role)
    video_chapters = await VideoChapters.get_for_content(content_id)
    if not video_chapters:
        return {"content_id": content_id, "chapters": []}
    return {
        "content_id": content_id,
        "chapters": [
            {"title": ch.title, "start_time": ch.start_time, "end_time": ch.end_time}
            for ch in video_chapters.chapters
        ],
    }


@router.get("/{content_id}/characters")
async def get_content_characters(
    content_id: str,
    user: TrainingUser = Depends(get_current_training_user),
):
    """Get extracted characters/speakers for a content item."""
    content = await load_content_for_partner(content_id, user.partner_id, user_role=user.role)
    characters = content.interactive_characters or []
    return {
        "characters": [
            _serialize_character(i, c) for i, c in enumerate(characters)
        ]
    }


def _serialize_character(idx: int, c) -> dict:
    """Serialize a character from Content.interactive_characters."""
    if isinstance(c, dict):
        return {
            "id": str(idx),
            "name": c.get("name", ""),
            "role": c.get("role", ""),
            "frame_url": c.get("frame_url") or None,
            "voice_id": c.get("voice_id") or None,
            "description": c.get("description") or None,
            "portrait_source": c.get("portrait_source") or None,
            "preset_avatar_id": c.get("preset_avatar_id") or None,
        }
    return {
        "id": str(idx),
        "name": getattr(c, "name", ""),
        "role": getattr(c, "role", ""),
        "frame_url": getattr(c, "frame_url", None) or None,
        "voice_id": getattr(c, "voice_id", None) or None,
        "description": getattr(c, "description", None) or None,
        "portrait_source": getattr(c, "portrait_source", None) or None,
        "preset_avatar_id": getattr(c, "preset_avatar_id", None) or None,
    }
