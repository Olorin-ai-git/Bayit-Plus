"""
Raw document serializer for Atlas Search pipeline results.

Converts raw MongoDB document dicts (from aggregation pipelines)
to the API response format. Separated from content_serializer.py
which handles Beanie document model conversions.
"""

from typing import Any, Dict

from app.api.routes.content.utils import is_series_content


def raw_doc_to_dict(raw: dict, content_type: str) -> Dict[str, Any]:
    """Convert a raw MongoDB document dict to search result format."""
    doc_id = str(raw.get("_id", ""))

    if content_type == "live":
        return _raw_live(raw, doc_id)
    if content_type == "radio":
        return _raw_radio(raw, doc_id)
    if content_type == "podcast":
        return _raw_podcast(raw, doc_id)
    return _raw_vod(raw, doc_id)


def _raw_live(raw: dict, doc_id: str) -> Dict[str, Any]:
    return {
        "id": doc_id,
        "title": raw.get("name"),
        "title_en": raw.get("name_en"),
        "title_es": raw.get("name_es"),
        "description": raw.get("description"),
        "thumbnail": raw.get("thumbnail") or raw.get("logo"),
        "backdrop": None,
        "category_id": raw.get("category"),
        "category_name": raw.get("category"),
        "duration": None, "year": None, "rating": None,
        "genres": [raw["category"]] if raw.get("category") else [],
        "cast": None, "director": None, "author": None, "narrator": None,
        "content_type": "live",
        "is_series": False,
        "requires_subscription": raw.get("requires_subscription"),
        "is_kids_content": raw.get("category") == "kids",
        "age_rating": None,
        "available_subtitle_languages": [],
        "has_subtitles": raw.get("supports_live_subtitles", False),
        "view_count": 0, "avg_rating": 0, "is_featured": False,
        "created_at": raw.get("created_at"),
    }


def _raw_radio(raw: dict, doc_id: str) -> Dict[str, Any]:
    return {
        "id": doc_id,
        "title": raw.get("name"),
        "title_en": raw.get("name_en"),
        "title_es": raw.get("name_es"),
        "description": raw.get("description"),
        "thumbnail": raw.get("logo"),
        "backdrop": None,
        "category_id": raw.get("genre"),
        "category_name": raw.get("genre"),
        "duration": None, "year": None, "rating": None,
        "genres": [raw["genre"]] if raw.get("genre") else [],
        "cast": None, "director": None, "author": None, "narrator": None,
        "content_type": "radio",
        "is_series": False,
        "requires_subscription": "basic",
        "is_kids_content": False,
        "age_rating": None,
        "available_subtitle_languages": [],
        "has_subtitles": False,
        "view_count": 0, "avg_rating": 0, "is_featured": False,
        "created_at": raw.get("created_at"),
    }


def _raw_podcast(raw: dict, doc_id: str) -> Dict[str, Any]:
    return {
        "id": doc_id,
        "title": raw.get("title"),
        "title_en": raw.get("title_en"),
        "title_es": raw.get("title_es"),
        "description": raw.get("description"),
        "thumbnail": raw.get("cover"),
        "backdrop": None,
        "category_id": raw.get("category"),
        "category_name": raw.get("category"),
        "duration": None, "year": None, "rating": None,
        "genres": [raw["category"]] if raw.get("category") else [],
        "cast": None, "director": None, "author": raw.get("author"),
        "narrator": None,
        "content_type": "podcast",
        "is_series": False,
        "requires_subscription": "basic",
        "is_kids_content": False,
        "age_rating": None,
        "available_subtitle_languages": [],
        "has_subtitles": False,
        "view_count": 0, "avg_rating": 0,
        "is_featured": raw.get("is_featured", False),
        "created_at": raw.get("created_at"),
    }


def _raw_vod(raw: dict, doc_id: str) -> Dict[str, Any]:
    is_series = is_series_content(raw)
    return {
        "id": doc_id,
        "title": raw.get("title"),
        "title_en": raw.get("title_en"),
        "title_es": raw.get("title_es"),
        "description": raw.get("description"),
        "thumbnail": raw.get("thumbnail"),
        "backdrop": raw.get("backdrop"),
        "category_id": raw.get("category_id"),
        "category_name": raw.get("category_name"),
        "duration": raw.get("duration"),
        "year": raw.get("year"),
        "rating": raw.get("rating"),
        "genres": raw.get("genres") or ([raw["genre"]] if raw.get("genre") else []),
        "cast": raw.get("cast"),
        "director": raw.get("director"),
        "author": raw.get("author"),
        "narrator": raw.get("narrator"),
        "content_type": raw.get("content_type"),
        "is_series": is_series,
        "requires_subscription": raw.get("requires_subscription"),
        "is_kids_content": raw.get("is_kids_content"),
        "age_rating": raw.get("age_rating"),
        "available_subtitle_languages": raw.get("available_subtitle_languages", []),
        "has_subtitles": raw.get("has_subtitles", False),
        "view_count": raw.get("view_count", 0),
        "avg_rating": raw.get("avg_rating", 0),
        "is_featured": raw.get("is_featured", False),
        "created_at": raw.get("created_at"),
    }
