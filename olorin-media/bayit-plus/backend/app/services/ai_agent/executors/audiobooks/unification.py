"""
AI Agent Executors - Audiobook Unification

Functions for unifying multi-part audiobooks into parent entries.
"""

import logging
import re
from datetime import datetime, timezone
from typing import Any, Optional

from bson import ObjectId

from app.models.content import Content
from app.services.ai_agent.executors._shared import handle_dry_run, log_librarian_action

from .discovery import extract_part_info, normalize_for_grouping
from .metadata import fetch_google_books_metadata, fetch_open_library_metadata

logger = logging.getLogger(__name__)


def calculate_total_duration(parts: list[Content]) -> Optional[str]:
    """Calculate total duration from all parts."""
    total_seconds = 0

    for part in parts:
        duration = part.duration
        if duration:
            try:
                time_parts = duration.split(":")
                if len(time_parts) == 3:
                    h, m, s = map(int, time_parts)
                    total_seconds += h * 3600 + m * 60 + s
                elif len(time_parts) == 2:
                    m, s = map(int, time_parts)
                    total_seconds += m * 60 + s
            except (ValueError, TypeError):
                pass

    if total_seconds > 0:
        hours = total_seconds // 3600
        minutes = (total_seconds % 3600) // 60
        seconds = total_seconds % 60
        return f"{hours}:{minutes:02d}:{seconds:02d}"

    return None


def get_best_metadata_part(parts: list[Content]) -> Content:
    """Get the part with the most complete metadata."""
    def metadata_score(part: Content) -> int:
        score = 0
        if part.thumbnail or part.poster_url:
            score += 10
        if part.description:
            score += 5
        if part.author:
            score += 3
        if part.narrator:
            score += 2
        if part.year:
            score += 1
        if part.isbn:
            score += 1
        return score

    return max(parts, key=metadata_score)


async def find_or_create_parent(
    base_title: str,
    parts: list[Content],
    fetch_metadata: bool = True,
    audit_id: str = "",
) -> Optional[str]:
    """Find existing parent or create a new one for multi-part audiobooks."""
    # Check if a parent already exists
    existing_parent = await Content.find_one({
        "content_format": "audiobook",
        "title": {"$regex": f"^{re.escape(base_title)}$", "$options": "i"},
        "$or": [
            {"series_id": None},
            {"series_id": {"$exists": False}},
        ],
        "stream_url": {"$in": ["", None]},
    })

    if existing_parent:
        return str(existing_parent.id)

    # Check if any part is already linked to a parent
    for part in parts:
        if part.series_id:
            return part.series_id

    # Create new parent audiobook
    best_part = get_best_metadata_part(parts)

    now = datetime.now(timezone.utc)
    parent_data = {
        "title": base_title,
        "title_en": best_part.title_en,
        "description": best_part.description,
        "description_en": best_part.description_en,
        "author": best_part.author,
        "narrator": best_part.narrator,
        "thumbnail": best_part.thumbnail,
        "poster_url": best_part.poster_url,
        "backdrop": best_part.backdrop,
        "content_format": "audiobook",
        "section_ids": best_part.section_ids or [],
        "primary_section_id": best_part.primary_section_id,
        "category_id": best_part.category_id,
        "is_series": True,
        "series_id": None,
        "total_episodes": len(parts),
        "stream_url": "",
        "stream_type": "audio",
        "is_published": True,
        "is_featured": best_part.is_featured or False,
        "requires_subscription": best_part.requires_subscription or "basic",
        "visibility_mode": best_part.visibility_mode or "public",
        "year": best_part.year,
        "isbn": best_part.isbn,
        "publisher_name": best_part.publisher_name,
        "audio_quality": best_part.audio_quality,
        "genre_ids": best_part.genre_ids or [],
        "topic_tags": best_part.topic_tags or [],
        "created_at": now,
        "updated_at": now,
    }

    # Calculate total duration
    total_duration = calculate_total_duration(parts)
    if total_duration:
        parent_data["duration"] = total_duration

    # Fetch metadata if needed and missing poster
    if fetch_metadata and not parent_data.get("thumbnail"):
        metadata = await fetch_google_books_metadata(base_title, best_part.author)
        if not metadata or not metadata.get("thumbnail"):
            ol_metadata = await fetch_open_library_metadata(base_title, best_part.author)
            if ol_metadata:
                if not metadata:
                    metadata = ol_metadata
                elif not metadata.get("thumbnail"):
                    metadata["thumbnail"] = ol_metadata.get("thumbnail")

        if metadata:
            if metadata.get("thumbnail"):
                parent_data["thumbnail"] = metadata["thumbnail"]
                parent_data["poster_url"] = metadata["thumbnail"]
            if metadata.get("description") and not parent_data.get("description"):
                parent_data["description"] = metadata["description"]
            if metadata.get("year") and not parent_data.get("year"):
                parent_data["year"] = metadata["year"]
            if metadata.get("isbn") and not parent_data.get("isbn"):
                parent_data["isbn"] = metadata["isbn"]
            if metadata.get("author") and not parent_data.get("author"):
                parent_data["author"] = metadata["author"]

    parent = Content(**parent_data)
    await parent.insert()

    await log_librarian_action(
        audit_id=audit_id,
        action_type="create_audiobook_parent",
        content_id=str(parent.id),
        description=f"Created parent audiobook for {len(parts)} parts",
        issue_type="multi_part_audiobook",
        after_state={"title": base_title, "part_count": len(parts)},
    )

    return str(parent.id)


async def link_parts_to_parent(
    parent_id: str,
    parts: list[Content],
    audit_id: str = "",
) -> int:
    """Link all parts to the parent audiobook."""
    linked_count = 0

    # Sort parts by part number
    part_info = []
    for part in parts:
        _, part_number = extract_part_info(part.title or "")
        part_info.append((part, part_number or 1))

    sorted_parts = sorted(part_info, key=lambda x: x[1])

    for part, part_number in sorted_parts:
        if part.series_id == parent_id:
            continue

        await part.set({
            "series_id": parent_id,
            "is_series": True,
            "episode": part_number,
            "updated_at": datetime.now(timezone.utc),
        })
        linked_count += 1

        await log_librarian_action(
            audit_id=audit_id,
            action_type="link_audiobook_part",
            content_id=str(part.id),
            description=f"Linked part {part_number} to parent",
            issue_type="unlinked_audiobook_part",
            after_state={"parent_id": parent_id, "part_number": part_number},
        )

    return linked_count


async def execute_unify_multi_part_audiobooks(
    base_title: Optional[str] = None,
    fetch_metadata: bool = True,
    reason: Optional[str] = None,
    *,
    audit_id: str,
    dry_run: bool = False,
) -> dict[str, Any]:
    """Unify multi-part audiobooks into parent entries."""
    dry_run_result = handle_dry_run(dry_run, "unify multi-part audiobooks")
    if dry_run_result:
        return dry_run_result

    try:
        # Get all audiobooks
        audiobooks = await Content.find({"content_format": "audiobook"}).to_list()

        # Group by base title
        groups: dict[str, list[Content]] = {}
        for audiobook in audiobooks:
            title = audiobook.title or ""
            parsed_base, part_number = extract_part_info(title)

            if part_number is not None:
                normalized = normalize_for_grouping(parsed_base)

                # Filter by specific title if provided
                if base_title:
                    if normalize_for_grouping(base_title) != normalized:
                        continue

                if normalized not in groups:
                    groups[normalized] = []
                groups[normalized].append(audiobook)

        # Process groups
        results = []
        total_parents = 0
        total_linked = 0

        for normalized_title, parts in groups.items():
            if len(parts) < 2:
                continue

            # Get base title from first part
            first_title = parts[0].title or ""
            group_base_title, _ = extract_part_info(first_title)

            # Find or create parent
            parent_id = await find_or_create_parent(
                group_base_title, parts, fetch_metadata, audit_id
            )

            if parent_id:
                # Link parts
                linked = await link_parts_to_parent(parent_id, parts, audit_id)
                total_linked += linked

                # Check if parent was created (not found)
                parent = await Content.get(ObjectId(parent_id))
                if parent and parent.created_at:
                    now = datetime.now(timezone.utc)
                    if (now - parent.created_at).total_seconds() < 60:
                        total_parents += 1

                results.append({
                    "base_title": group_base_title,
                    "parent_id": parent_id,
                    "parts_linked": linked,
                    "total_parts": len(parts),
                })

        return {
            "success": True,
            "groups_processed": len(results),
            "parents_created": total_parents,
            "parts_linked": total_linked,
            "results": results,
        }

    except Exception as e:
        logger.error(f"Error unifying multi-part audiobooks: {e}")
        return {"success": False, "error": str(e)}


async def execute_link_audiobook_parts(
    parent_id: str,
    part_ids: list[str],
    reason: Optional[str] = None,
    *,
    audit_id: str,
    dry_run: bool = False,
) -> dict[str, Any]:
    """Link audiobook parts to their parent."""
    dry_run_result = handle_dry_run(dry_run, "link audiobook parts")
    if dry_run_result:
        return dry_run_result

    try:
        # Verify parent exists
        parent = await Content.get(ObjectId(parent_id))
        if not parent:
            return {"success": False, "error": f"Parent audiobook not found: {parent_id}"}

        if parent.content_format != "audiobook":
            return {"success": False, "error": "Parent is not an audiobook"}

        # Get parts
        parts = []
        for part_id in part_ids:
            part = await Content.get(ObjectId(part_id))
            if part:
                parts.append(part)

        if not parts:
            return {"success": False, "error": "No valid parts found"}

        # Link parts
        linked = await link_parts_to_parent(parent_id, parts, audit_id)

        # Update parent total_episodes
        await parent.set({
            "total_episodes": len(part_ids),
            "updated_at": datetime.now(timezone.utc),
        })

        return {
            "success": True,
            "parent_id": parent_id,
            "parent_title": parent.title,
            "parts_linked": linked,
            "total_parts": len(parts),
        }

    except Exception as e:
        logger.error(f"Error linking audiobook parts: {e}")
        return {"success": False, "error": str(e)}
