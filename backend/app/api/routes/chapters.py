"""
Video Chapters API routes.
Provides AI-generated chapters for news and long-form content.
"""
from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, Body

from app.models.user import User
from app.models.content import Content, LiveChannel
from app.models.chapters import VideoChapters, ChapterItemModel
from app.core.security import get_optional_user, get_current_active_user
from app.services.chapter_generator import (
    generate_chapters_from_title,
    generate_chapters_from_transcript,
    chapters_to_dict,
    CHAPTER_CATEGORIES,
    parse_duration_to_seconds,
)

router = APIRouter()


@router.get("/{content_id}")
async def get_chapters(
    content_id: str,
    current_user: Optional[User] = Depends(get_optional_user)
):
    """
    Get chapters for a specific content item.
    Returns cached chapters if available, or generates new ones.
    """
    # Check for existing chapters
    existing = await VideoChapters.get_for_content(content_id)
    if existing:
        return _format_chapters_response(existing)

    # No chapters exist - check if content exists
    content = await Content.get(content_id)
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")

    # Generate chapters on-demand
    is_news = content.category_name and any(cat.lower() in (content.category_name or "").lower() for cat in ["news", "חדשות"])

    gen_chapters = await generate_chapters_from_title(
        content_id=content_id,
        content_title=content.title,
        duration=content.duration or 3600,  # Default 1 hour
        description=content.description,
        is_news=is_news,
    )

    # Save to database
    chapter_items = [
        ChapterItemModel(
            start_time=c.start_time,
            end_time=c.end_time,
            title=c.title,
            title_en=c.title_en,
            category=c.category,
            summary=c.summary,
            keywords=c.keywords,
        )
        for c in gen_chapters.chapters
    ]

    # Convert duration to seconds if it's a string
    duration_seconds = parse_duration_to_seconds(content.duration or 3600)

    saved = await VideoChapters.create_or_update(
        content_id=content_id,
        content_type="vod",
        content_title=content.title,
        chapters=chapter_items,
        total_duration=duration_seconds,
        source=gen_chapters.source,
    )

    return _format_chapters_response(saved)


@router.post("/{content_id}/generate")
async def generate_chapters(
    content_id: str,
    force: bool = Query(False, description="Force regeneration even if chapters exist"),
    transcript: Optional[str] = Body(None, description="Optional transcript for better chapters"),
    current_user: User = Depends(get_current_active_user)
):
    """
    Generate or regenerate chapters for content.
    Requires authentication. If transcript is provided, uses it for more accurate chapters.
    """
    # Check if content exists
    content = await Content.get(content_id)
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")

    # Check for existing chapters
    if not force:
        existing = await VideoChapters.get_for_content(content_id)
        if existing:
            return {
                "status": "exists",
                "message": "Chapters already exist. Use force=true to regenerate.",
                "chapters": _format_chapters_response(existing),
            }

    # Generate chapters
    is_news = content.category_name and any(cat.lower() in (content.category_name or "").lower() for cat in ["news", "חדשות"])

    if transcript:
        gen_chapters = await generate_chapters_from_transcript(
            content_id=content_id,
            content_title=content.title,
            duration=content.duration or 3600,
            transcript=transcript,
        )
    else:
        gen_chapters = await generate_chapters_from_title(
            content_id=content_id,
            content_title=content.title,
            duration=content.duration or 3600,
            description=content.description,
            is_news=is_news,
        )

    # Save to database
    chapter_items = [
        ChapterItemModel(
            start_time=c.start_time,
            end_time=c.end_time,
            title=c.title,
            title_en=c.title_en,
            category=c.category,
            summary=c.summary,
            keywords=c.keywords,
        )
        for c in gen_chapters.chapters
    ]

    # Convert duration to seconds if it's a string
    duration_seconds = parse_duration_to_seconds(content.duration or 3600)

    saved = await VideoChapters.create_or_update(
        content_id=content_id,
        content_type="vod",
        content_title=content.title,
        chapters=chapter_items,
        total_duration=duration_seconds,
        source=gen_chapters.source,
    )

    return {
        "status": "generated",
        "chapters": _format_chapters_response(saved),
    }


@router.get("/live/{channel_id}")
async def get_live_chapters(
    channel_id: str,
    current_user: Optional[User] = Depends(get_optional_user)
):
    """
    Get chapters for live channel content (if recorded).
    For live news, returns typical news structure chapters.
    """
    channel = await LiveChannel.get(channel_id)
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")

    # For live channels, generate default news chapter structure
    gen_chapters = await generate_chapters_from_title(
        content_id=channel_id,
        content_title=f"{channel.name} - שידור חי",
        duration=3600,  # 1 hour default
        description=channel.description,
        is_news=True,
    )

    return chapters_to_dict(gen_chapters)


@router.post("/{content_id}/approve")
async def approve_chapters(
    content_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """
    Approve AI-generated chapters (admin only).
    """
    if not current_user.is_admin_user():
        raise HTTPException(status_code=403, detail="Admin access required")

    chapters = await VideoChapters.get_for_content(content_id)
    if not chapters:
        raise HTTPException(status_code=404, detail="No chapters found")

    chapters.is_approved = True
    chapters.approved_by = str(current_user.id)
    chapters.approved_at = datetime.utcnow()
    await chapters.save()

    return {
        "status": "approved",
        "approved_by": current_user.name,
        "approved_at": chapters.approved_at.isoformat(),
    }


@router.get("/categories/list")
async def list_chapter_categories():
    """
    Get list of available chapter categories.
    """
    return {
        "categories": [
            {
                "id": cat_id,
                "label_he": info["he"],
                "label_en": info["en"],
                "icon": info["icon"],
            }
            for cat_id, info in CHAPTER_CATEGORIES.items()
        ]
    }


def _format_chapters_response(chapters: VideoChapters) -> dict:
    """Format VideoChapters document for API response"""
    return {
        "content_id": chapters.content_id,
        "content_title": chapters.content_title,
        "total_duration": chapters.total_duration,
        "source": chapters.source,
        "generated_at": chapters.generated_at.isoformat(),
        "is_approved": chapters.is_approved,
        "chapters": [
            {
                "start_time": c.start_time,
                "end_time": c.end_time,
                "title": c.title,
                "title_en": c.title_en,
                "category": c.category,
                "category_info": CHAPTER_CATEGORIES.get(c.category, CHAPTER_CATEGORIES["general"]),
                "summary": c.summary,
                "keywords": c.keywords,
                "formatted_start": _format_time(c.start_time),
                "formatted_end": _format_time(c.end_time),
            }
            for c in chapters.chapters
        ],
    }


def _format_time(seconds: float) -> str:
    """Format seconds as MM:SS or HH:MM:SS"""
    total_seconds = int(seconds)
    hours = total_seconds // 3600
    minutes = (total_seconds % 3600) // 60
    secs = total_seconds % 60

    if hours > 0:
        return f"{hours}:{minutes:02d}:{secs:02d}"
    return f"{minutes}:{secs:02d}"
