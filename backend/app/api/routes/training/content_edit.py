"""Training content editing routes (PATCH). Extracted from content.py for 200-line limit."""

import logging
from typing import List, Optional

from beanie import PydanticObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.api.routes.training.dependencies import require_training_admin
from app.models.chapters import ChapterItemModel, VideoChapters
from app.models.content import Content
from app.models.training_user import TrainingUser

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/content", tags=["training-content-edit"])


class ChapterUpdateItem(BaseModel):
    title: str
    start_time: float
    end_time: float


class CharacterUpdateItem(BaseModel):
    index: int
    display_name: str


class ContentUpdateRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[List[str]] = None
    chapters: Optional[List[ChapterUpdateItem]] = None
    characters: Optional[List[CharacterUpdateItem]] = None


@router.patch("/{content_id}")
async def update_content(
    content_id: str,
    body: ContentUpdateRequest,
    admin: TrainingUser = Depends(require_training_admin),
):
    """Update training content metadata, chapters, and character names."""
    content = await Content.get(PydanticObjectId(content_id))
    if not content or content.partner_id != admin.partner_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Content not found",
        )
    if body.title is not None:
        content.title = body.title
    if body.description is not None:
        content.description = body.description
    if body.tags is not None:
        content.topic_tags = body.tags
    if body.characters is not None:
        for update in body.characters:
            if 0 <= update.index < len(content.interactive_characters):
                content.interactive_characters[update.index].name = update.display_name
    await content.save()

    if body.chapters is not None:
        chapter_items = [
            ChapterItemModel(
                title=c.title, start_time=c.start_time, end_time=c.end_time,
            )
            for c in body.chapters
        ]
        total_dur = chapter_items[-1].end_time if chapter_items else 0.0
        await VideoChapters.create_or_update(
            content_id=content_id,
            content_type="vod",
            content_title=content.title,
            chapters=chapter_items,
            total_duration=total_dur,
            source="manual",
        )
        logger.info(
            "Updated %d chapters for content %s (manual edit)",
            len(chapter_items), content_id,
        )
    return {"updated": True, "content_id": content_id}
