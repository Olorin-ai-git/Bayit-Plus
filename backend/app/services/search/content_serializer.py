"""
Content serializers for search results.

Converts Beanie document models to API response dictionaries.
Extracted from the former UnifiedSearchService to be shared
across the search pipeline and voice handlers.
"""

from typing import Any, Dict

from app.api.routes.content.utils import is_series_content
from app.models.content import Content, LiveChannel, Podcast, RadioStation
from app.services.search.raw_serializer import raw_doc_to_dict  # noqa: F401


def content_to_dict(content: Content) -> Dict[str, Any]:
    """Convert Content document to search result dictionary."""
    is_series = is_series_content(content.model_dump())
    return {
        "id": str(content.id),
        "title": content.title,
        "title_en": content.title_en,
        "title_es": content.title_es,
        "description": content.description,
        "thumbnail": content.thumbnail,
        "backdrop": content.backdrop,
        "category_id": content.category_id,
        "category_name": content.category_name,
        "duration": content.duration,
        "year": content.year,
        "rating": content.rating,
        "genres": content.genres or ([content.genre] if content.genre else []),
        "cast": content.cast,
        "director": content.director,
        "author": content.author,
        "narrator": content.narrator,
        "content_type": content.content_type,
        "is_series": is_series,
        "requires_subscription": content.requires_subscription,
        "is_kids_content": content.is_kids_content,
        "age_rating": content.age_rating,
        "available_subtitle_languages": content.available_subtitle_languages,
        "has_subtitles": content.has_subtitles,
        "view_count": content.view_count,
        "avg_rating": content.avg_rating,
        "is_featured": content.is_featured,
        "created_at": content.created_at,
    }


def live_channel_to_dict(channel: LiveChannel) -> Dict[str, Any]:
    """Convert LiveChannel document to search result dictionary."""
    return {
        "id": str(channel.id),
        "title": channel.name,
        "title_en": channel.name_en,
        "title_es": channel.name_es,
        "description": channel.description,
        "thumbnail": channel.thumbnail or channel.logo,
        "backdrop": None,
        "category_id": channel.category,
        "category_name": channel.category,
        "duration": None, "year": None, "rating": None,
        "genres": [channel.category] if channel.category else [],
        "cast": None, "director": None, "author": None, "narrator": None,
        "content_type": "live",
        "is_series": False,
        "requires_subscription": channel.requires_subscription,
        "is_kids_content": channel.category == "kids" if channel.category else False,
        "age_rating": None,
        "available_subtitle_languages": [],
        "has_subtitles": channel.supports_live_subtitles,
        "view_count": 0, "avg_rating": 0, "is_featured": False,
        "created_at": channel.created_at,
    }


def radio_station_to_dict(station: RadioStation) -> Dict[str, Any]:
    """Convert RadioStation document to search result dictionary."""
    return {
        "id": str(station.id),
        "title": station.name,
        "title_en": station.name_en,
        "title_es": station.name_es,
        "description": station.description,
        "thumbnail": station.logo,
        "backdrop": None,
        "category_id": station.genre,
        "category_name": station.genre,
        "duration": None, "year": None, "rating": None,
        "genres": [station.genre] if station.genre else [],
        "cast": None, "director": None, "author": None, "narrator": None,
        "content_type": "radio",
        "is_series": False,
        "requires_subscription": "basic",
        "is_kids_content": False,
        "age_rating": None,
        "available_subtitle_languages": [],
        "has_subtitles": False,
        "view_count": 0, "avg_rating": 0, "is_featured": False,
        "created_at": station.created_at,
    }


def podcast_to_dict(podcast: Podcast) -> Dict[str, Any]:
    """Convert Podcast document to search result dictionary."""
    return {
        "id": str(podcast.id),
        "title": podcast.title,
        "title_en": podcast.title_en,
        "title_es": podcast.title_es,
        "description": podcast.description,
        "thumbnail": podcast.cover,
        "backdrop": None,
        "category_id": podcast.category,
        "category_name": podcast.category,
        "duration": None, "year": None, "rating": None,
        "genres": [podcast.category] if podcast.category else [],
        "cast": None, "director": None, "author": podcast.author,
        "narrator": None,
        "content_type": "podcast",
        "is_series": False,
        "requires_subscription": "basic",
        "is_kids_content": False,
        "age_rating": None,
        "available_subtitle_languages": [],
        "has_subtitles": False,
        "view_count": 0, "avg_rating": 0,
        "is_featured": podcast.is_featured,
        "created_at": podcast.created_at,
    }
