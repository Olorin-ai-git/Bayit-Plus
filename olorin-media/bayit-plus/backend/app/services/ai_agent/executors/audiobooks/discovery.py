"""
AI Agent Executors - Audiobook Discovery

Functions for finding and grouping multi-part audiobooks.
"""

import logging
import re
from collections import defaultdict
from typing import Any, Optional

from app.models.content import Content

logger = logging.getLogger(__name__)

# Patterns to detect multi-part audiobooks
# Note: [\s_]* matches whitespace or underscores for flexibility
PART_PATTERNS = [
    # English patterns with flexible whitespace/underscore handling
    r"^(?:\d+[\s_]*)?(.+?)[\s_]*[-–_][\s_]*[Pp]art[\s_]*(\d+)[\s_]*$",
    r"^(?:\d+[\s_]*)?(.+?)[\s_]*[-–_][\s_]*[Cc]hapter[\s_]*(\d+)[\s_]*$",
    r"^(?:\d+[\s_]*)?(.+?)[\s_]*[-–_][\s_]*[Dd]isc[\s_]*(\d+)[\s_]*$",
    r"^(?:\d+[\s_]*)?(.+?)[\s_]*[-–_][\s_]*[Vv]ol(?:ume)?\.?[\s_]*(\d+)[\s_]*$",
    r"^(?:\d+[\s_]*)?(.+?)[\s_]*[-–_][\s_]*[Bb]ook[\s_]*(\d+)[\s_]*$",
    r"^(?:\d+[\s_]*)?(.+?)[\s_]*\(?[\s_]*[Pp]art[\s_]*(\d+)[\s_]*\)?[\s_]*$",
    r"^(?:\d+[\s_]*)?(.+?)[\s_]*\(?[\s_]*(\d+)[\s_]*of[\s_]*\d+[\s_]*\)?[\s_]*$",
    r"^(?:\d+[\s_]*)?(.+?)[\s_]*[-–_][\s_]*(\d+)[\s_]*$",  # "Title - 1", "Title_-_1"
    # Hebrew patterns
    r"^(?:\d+[\s_]*)?(.+?)[\s_]*[-–_][\s_]*חלק[\s_]*(\d+)[\s_]*$",
    r"^(?:\d+[\s_]*)?(.+?)[\s_]*[-–_][\s_]*פרק[\s_]*(\d+)[\s_]*$",
    r"^(?:\d+[\s_]*)?(.+?)[\s_]*[-–_][\s_]*דיסק[\s_]*(\d+)[\s_]*$",
]


def extract_part_info(title: str) -> tuple[str, Optional[int]]:
    """Extract base title and part number from an audiobook title."""
    if not title:
        return title, None

    for pattern in PART_PATTERNS:
        match = re.match(pattern, title.strip(), re.IGNORECASE)
        if match:
            base_title = match.group(1).strip()
            # Clean up underscores and normalize title
            base_title = base_title.replace("_", " ")
            base_title = " ".join(base_title.split())  # Normalize whitespace
            part_number = int(match.group(2))
            return base_title, part_number

    return title, None


def normalize_for_grouping(text: str) -> str:
    """Normalize text for grouping comparison."""
    normalized = re.sub(r"[^\w\s]", "", text.lower())
    normalized = " ".join(normalized.split())
    return normalized


async def execute_find_multi_part_audiobooks(
    limit: int = 500,
) -> dict[str, Any]:
    """Find audiobooks that are parts of the same book."""
    try:
        audiobooks = await Content.find(
            {"content_format": "audiobook"}
        ).limit(limit).to_list()

        groups: dict[str, list[dict]] = defaultdict(list)
        standalone_count = 0

        for audiobook in audiobooks:
            title = audiobook.title or ""
            base_title, part_number = extract_part_info(title)

            if part_number is not None:
                normalized_base = normalize_for_grouping(base_title)
                groups[normalized_base].append({
                    "id": str(audiobook.id),
                    "title": title,
                    "base_title": base_title,
                    "part_number": part_number,
                    "series_id": audiobook.series_id,
                    "has_poster": bool(audiobook.thumbnail or audiobook.poster_url),
                })
            else:
                standalone_count += 1

        # Filter to only multi-part groups (2+ parts)
        multi_part_groups = []
        for normalized_title, parts in groups.items():
            if len(parts) >= 2:
                sorted_parts = sorted(parts, key=lambda p: p["part_number"])
                already_unified = all(p.get("series_id") for p in sorted_parts)
                multi_part_groups.append({
                    "base_title": sorted_parts[0]["base_title"],
                    "normalized_title": normalized_title,
                    "part_count": len(sorted_parts),
                    "already_unified": already_unified,
                    "parts": sorted_parts,
                })

        return {
            "success": True,
            "total_scanned": len(audiobooks),
            "multi_part_groups": len(multi_part_groups),
            "standalone_audiobooks": standalone_count,
            "groups": multi_part_groups,
        }

    except Exception as e:
        logger.error(f"Error finding multi-part audiobooks: {e}")
        return {"success": False, "error": str(e)}


async def execute_find_audiobooks_without_posters(
    limit: int = 100,
    include_parts: bool = False,
) -> dict[str, Any]:
    """Find audiobooks that are missing poster/thumbnail images."""
    try:
        query = {
            "content_format": "audiobook",
            "$or": [
                {"thumbnail": None},
                {"thumbnail": ""},
                {"thumbnail": {"$exists": False}},
            ],
            "$and": [
                {"$or": [
                    {"poster_url": None},
                    {"poster_url": ""},
                    {"poster_url": {"$exists": False}},
                ]}
            ],
        }

        if not include_parts:
            query["$or"].append({"series_id": None})
            query["$or"].append({"series_id": {"$exists": False}})

        audiobooks = await Content.find(query).limit(limit).to_list()

        results = []
        for audiobook in audiobooks:
            results.append({
                "id": str(audiobook.id),
                "title": audiobook.title,
                "author": audiobook.author,
                "is_part": bool(audiobook.series_id),
                "series_id": audiobook.series_id,
            })

        return {
            "success": True,
            "count": len(results),
            "audiobooks": results,
        }

    except Exception as e:
        logger.error(f"Error finding audiobooks without posters: {e}")
        return {"success": False, "error": str(e)}
