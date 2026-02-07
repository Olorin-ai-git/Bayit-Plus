"""Maps source metadata to Bayit+ 5-axis taxonomy for documentary content."""

import logging
from typing import Any, Dict, List, Optional

from app.core.config import settings

logger = logging.getLogger(__name__)

# Keyword-to-taxonomy mapping (config-driven, extensible without code changes)
KEYWORD_TOPIC_MAP: Dict[str, List[str]] = {
    "iss": ["space", "iss"],
    "space station": ["space", "iss"],
    "international space station": ["space", "iss"],
    "mars": ["space", "mars"],
    "rover": ["space", "mars"],
    "perseverance": ["space", "mars"],
    "curiosity": ["space", "mars"],
    "apollo": ["space", "apollo", "historical"],
    "moon": ["space", "apollo"],
    "lunar": ["space", "apollo"],
    "shuttle": ["space", "shuttle"],
    "hubble": ["space", "astronomy"],
    "james webb": ["space", "astronomy"],
    "jwst": ["space", "astronomy"],
    "earth": ["space", "earth-science"],
    "climate": ["science", "earth-science", "climate"],
    "wwii": ["wwii", "historical", "military"],
    "world war ii": ["wwii", "historical", "military"],
    "world war 2": ["wwii", "historical", "military"],
    "d-day": ["wwii", "historical", "military"],
    "normandy": ["wwii", "historical", "military"],
    "pearl harbor": ["wwii", "historical", "military"],
    "civil rights": ["civil-rights", "historical"],
    "march on washington": ["civil-rights", "historical"],
    "humanitarian": ["military", "humanitarian"],
    "relief": ["military", "humanitarian"],
    "nuclear": ["nuclear", "historical", "cold-war"],
    "atomic": ["nuclear", "historical", "cold-war"],
    "cold war": ["historical", "cold-war"],
    "vietnam": ["vietnam", "historical", "military"],
    "korea": ["korea", "historical", "military"],
    "navy": ["military", "navy"],
    "air force": ["military", "air-force"],
    "army": ["military", "army"],
    "marine": ["military", "marines"],
    "coast guard": ["military", "coast-guard"],
}

KEYWORD_GENRE_MAP: Dict[str, List[str]] = {
    "space": ["documentary", "science"],
    "mars": ["documentary", "science"],
    "apollo": ["documentary", "historical"],
    "wwii": ["documentary", "historical"],
    "civil rights": ["documentary", "historical"],
    "humanitarian": ["documentary"],
    "nuclear": ["documentary", "historical"],
    "science": ["documentary", "science"],
    "nature": ["documentary", "nature"],
    "military": ["documentary"],
}


def map_keywords_to_topics(
    keywords: List[str],
    title: str = "",
    description: str = "",
) -> List[str]:
    """Map source keywords/title/description to topic_tags."""
    topics: set = set()
    search_text = " ".join([
        " ".join(keywords),
        title,
        description,
    ]).lower()

    for keyword, topic_list in KEYWORD_TOPIC_MAP.items():
        if keyword.lower() in search_text:
            topics.update(topic_list)

    return sorted(topics) if topics else ["documentary"]


def map_keywords_to_genres(
    keywords: List[str],
    title: str = "",
    description: str = "",
) -> List[str]:
    """Map source keywords/title/description to genre_ids."""
    genres: set = {"documentary"}
    search_text = " ".join([
        " ".join(keywords),
        title,
        description,
    ]).lower()

    for keyword, genre_list in KEYWORD_GENRE_MAP.items():
        if keyword.lower() in search_text:
            genres.update(genre_list)

    return sorted(genres)


def extract_year(date_str: Optional[str]) -> Optional[int]:
    """Extract year from various date formats."""
    if not date_str:
        return None

    import re
    match = re.search(r"(\d{4})", str(date_str))
    if match:
        year = int(match.group(1))
        if 1800 <= year <= 2100:
            return year
    return None


def build_content_fields(
    source_provider: str,
    source_data: Dict[str, Any],
    topic_overrides: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """Build Content model fields from source API data.

    Returns a dict of fields ready to be passed to Content() constructor.
    """
    title = source_data.get("title", "")
    description = source_data.get("description", "")
    keywords = source_data.get("keywords", [])

    topics = topic_overrides or map_keywords_to_topics(keywords, title, description)
    genres = map_keywords_to_genres(keywords, title, description)

    year = source_data.get("year")
    if year is None:
        year = extract_year(
            source_data.get("date_created")
            or source_data.get("date_published")
        )

    return {
        "title": title,
        "title_en": title,
        "description": description,
        "description_en": description,
        "content_format": "documentary",
        "section_ids": [settings.DOC_IMPORT_DOCUMENTARIES_SECTION_SLUG],
        "primary_section_id": settings.DOC_IMPORT_DOCUMENTARIES_SECTION_SLUG,
        "audience_id": "general",
        "stream_type": "mp4",
        "requires_subscription": "none",
        "is_published": True,
        "is_kids_content": False,
        "year": year,
        "topic_tags": topics,
        "genre_ids": genres,
        "source_provider": source_provider,
        "source_id": source_data.get("source_id", ""),
    }
