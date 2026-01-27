"""
Audiobook utilities - Shared mapper functions to eliminate duplication.

This module provides utility functions to convert Content models to
response schemas, eliminating duplicated mapping logic across routes.
"""

from app.models.content import Content
from app.api.routes.audiobook_schemas import (
    AudiobookResponse,
    AudiobookAdminResponse,
    AudiobookStreamResponse,
)


def audiobook_to_response(audiobook: Content) -> AudiobookResponse:
    """Map Content model to user-safe AudiobookResponse."""
    return AudiobookResponse(
        id=str(audiobook.id),
        title=audiobook.title,
        author=audiobook.author,
        narrator=audiobook.narrator,
        description=audiobook.description,
        duration=audiobook.duration,
        thumbnail=audiobook.thumbnail or audiobook.thumbnail_data,
        backdrop=audiobook.backdrop or audiobook.backdrop_data,
        year=audiobook.year,
        rating=audiobook.rating,
        genre_ids=[str(g) for g in audiobook.genre_ids],
        audience_id=str(audiobook.audience_id) if audiobook.audience_id else None,
        requires_subscription=audiobook.requires_subscription,
        content_format=audiobook.content_format,
        audio_quality=audiobook.audio_quality,
        isbn=audiobook.isbn,
        book_edition=audiobook.book_edition,
        publisher_name=audiobook.publisher_name,
        view_count=audiobook.view_count,
        avg_rating=audiobook.avg_rating,
        is_featured=audiobook.is_featured,
        created_at=audiobook.created_at,
        updated_at=audiobook.updated_at,
    )


def audiobook_to_admin_response(audiobook: Content) -> AudiobookAdminResponse:
    """Map Content model to AudiobookAdminResponse with all fields."""
    return AudiobookAdminResponse(
        id=str(audiobook.id),
        title=audiobook.title,
        author=audiobook.author,
        narrator=audiobook.narrator,
        description=audiobook.description,
        duration=audiobook.duration,
        thumbnail=audiobook.thumbnail or audiobook.thumbnail_data,
        backdrop=audiobook.backdrop or audiobook.backdrop_data,
        year=audiobook.year,
        rating=audiobook.rating,
        genre_ids=[str(g) for g in audiobook.genre_ids],
        audience_id=str(audiobook.audience_id) if audiobook.audience_id else None,
        section_ids=[str(s) for s in audiobook.section_ids],
        primary_section_id=str(audiobook.primary_section_id) if audiobook.primary_section_id else None,
        requires_subscription=audiobook.requires_subscription,
        content_format=audiobook.content_format,
        audio_quality=audiobook.audio_quality,
        isbn=audiobook.isbn,
        book_edition=audiobook.book_edition,
        publisher_name=audiobook.publisher_name,
        is_published=audiobook.is_published,
        is_featured=audiobook.is_featured,
        visibility_mode=audiobook.visibility_mode,
        view_count=audiobook.view_count,
        avg_rating=audiobook.avg_rating,
        created_at=audiobook.created_at,
        updated_at=audiobook.updated_at,
    )


def audiobook_to_stream_response(audiobook: Content) -> AudiobookStreamResponse:
    """Map Content model to AudiobookStreamResponse for streaming."""
    return AudiobookStreamResponse(
        id=str(audiobook.id),
        title=audiobook.title,
        author=audiobook.author,
        narrator=audiobook.narrator,
        stream_url=audiobook.stream_url,
        stream_type=audiobook.stream_type,
        duration=audiobook.duration,
        audio_quality=audiobook.audio_quality,
        is_drm_protected=audiobook.is_drm_protected,
    )
