"""Builds a Content document from source API data for a single documentary item."""

import logging
from datetime import datetime
from typing import Any, Dict, Optional

from app.models.content import Content
from app.models.content_taxonomy import ContentSection

from .base_client import BaseDocSourceClient
from .source_metadata_schema import DocumentarySourceMetadata
from .taxonomy_mapper import build_content_fields
from .url_validator import validate_content_url, validate_thumbnail_url

logger = logging.getLogger(__name__)


async def build_and_insert_content(
    client: BaseDocSourceClient,
    source: str,
    source_id: str,
    title: str,
    year: Optional[int],
    topic_tags: Optional[list],
) -> Optional[Content]:
    """Fetch detail from source API, build Content document, and insert it.

    Returns the inserted Content or None if no valid video URL was found.
    """
    detail = await client.get_item_detail(source_id)
    if not detail:
        detail = {"source_id": source_id, "title": title}

    video_url = await client.get_video_url(source_id)
    thumbnail_url = await client.get_thumbnail_url(source_id)

    if video_url and not validate_content_url(video_url):
        video_url = None
    if thumbnail_url and not validate_thumbnail_url(thumbnail_url):
        thumbnail_url = None

    if not video_url:
        logger.warning(
            "No valid video URL for item",
            extra={"source": source, "source_id": source_id},
        )
        return None

    detail["keywords"] = detail.get("keywords", [])
    detail["year"] = year or detail.get("year")

    content_fields = build_content_fields(
        source_provider=source,
        source_data=detail,
        topic_overrides=topic_tags if topic_tags else None,
    )

    # Resolve section slug to ObjectId for taxonomy queries
    section_slug = content_fields.get("primary_section_id", "")
    section = await ContentSection.find_one({"slug": section_slug})
    if section:
        resolved_id = str(section.id)
        content_fields["section_ids"] = [resolved_id]
        content_fields["primary_section_id"] = resolved_id
    else:
        logger.warning(
            "ContentSection not found for slug",
            extra={"slug": section_slug, "source_id": source_id},
        )

    source_meta = DocumentarySourceMetadata(
        original_title=detail.get("title"),
        original_description=detail.get("description"),
        keywords=detail.get("keywords", []),
        date_created=detail.get("date_created") or detail.get("date_published"),
        center=detail.get("center"),
        branch=detail.get("branch"),
        record_group=detail.get("record_group"),
        credit=detail.get("credit"),
        has_captions=detail.get("has_captions", False),
    )

    now = datetime.utcnow()
    content = Content(
        **content_fields,
        stream_url=video_url,
        thumbnail=thumbnail_url,
        backdrop=thumbnail_url,
        source_metadata=source_meta.model_dump(),
        last_synced_at=now,
        created_at=now,
        updated_at=now,
    )

    await content.insert()

    logger.info(
        "Imported documentary",
        extra={"source": source, "source_id": source_id, "title": title},
    )
    return content
