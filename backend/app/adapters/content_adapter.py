"""
BayitContentAdapter
Adapter that wraps Bayit+ Content model to implement Olorin IndexableContent protocol.
"""

from typing import Optional

from olorin import IndexableContent, SearchableContent

from app.core.config import settings
from app.models.content import Content


class BayitContentAdapter:
    """
    Adapter that wraps Bayit+ Content model to satisfy IndexableContent protocol.

    This enables Olorin services to work with Bayit+ content without direct
    dependency on the Content model, following the Dependency Inversion Principle.
    """

    def __init__(self, content: Content):
        """Initialize with a Content model instance."""
        self._content = content

    @property
    def id(self) -> str:
        """Unique identifier for the content."""
        return str(self._content.id)

    @property
    def title(self) -> str:
        """Primary title of the content."""
        return self._content.title

    @property
    def description(self) -> Optional[str]:
        """Optional description or summary."""
        return self._content.description

    @property
    def content_type(self) -> str:
        """Type of content (movie, series, podcast, etc.)."""
        # Use new taxonomy field if available, fall back to legacy field
        return self._content.content_format or self._content.content_type or "unknown"

    @property
    def original_language(self) -> str:
        """Original language code (e.g., 'he', 'en')."""
        # Use content's language field if available, otherwise use configured default
        return getattr(self._content, 'language', None) or settings.olorin.default_content_language

    @property
    def genres(self) -> list[str]:
        """List of genre names."""
        genres = []

        # Use new genre_ids if available
        if self._content.genre_ids:
            genres.extend(self._content.genre_ids)

        # Fall back to legacy genres field
        elif self._content.genres:
            genres.extend(self._content.genres)

        # Fall back to single genre field
        elif self._content.genre:
            genres.append(self._content.genre)

        return genres

    @property
    def tags(self) -> list[str]:
        """List of tags/keywords."""
        tags = []

        # Use topic tags from new taxonomy
        if self._content.topic_tags:
            tags.extend(self._content.topic_tags)

        # Include section IDs as tags
        if self._content.section_ids:
            tags.extend(self._content.section_ids)

        return tags

    @property
    def release_date(self) -> Optional[str]:
        """Release date as ISO string."""
        if self._content.year:
            return f"{self._content.year}-01-01"
        return None

    @property
    def duration_minutes(self) -> Optional[int]:
        """Duration in minutes for movies/episodes."""
        if not self._content.duration:
            return None

        # Parse duration string (e.g., "1:45:00" -> 105 minutes)
        try:
            parts = self._content.duration.split(":")
            if len(parts) == 3:  # HH:MM:SS
                hours, minutes, _ = parts
                return int(hours) * 60 + int(minutes)
            elif len(parts) == 2:  # MM:SS
                minutes, _ = parts
                return int(minutes)
        except (ValueError, AttributeError):
            pass

        return None

    @property
    def metadata(self) -> dict:
        """Additional metadata as key-value pairs."""
        meta = {
            "rating": str(self._content.rating) if self._content.rating else None,
            "is_series": self._content.is_series,
            "is_featured": self._content.is_featured,
            "is_kids_content": self._content.is_kids_content,
            "requires_subscription": self._content.requires_subscription,
        }

        # Add series info if applicable
        if self._content.is_series:
            meta.update({
                "season": self._content.season,
                "episode": self._content.episode,
                "series_id": str(self._content.series_id) if self._content.series_id else None,
            })

        # Add TMDB info if available
        if self._content.tmdb_id:
            meta.update({
                "tmdb_id": self._content.tmdb_id,
                "imdb_id": self._content.imdb_id,
                "imdb_rating": self._content.imdb_rating,
            })

        # Filter out None values
        return {k: v for k, v in meta.items() if v is not None}


class BayitSearchableContentAdapter(BayitContentAdapter):
    """
    Extended adapter implementing SearchableContent protocol.

    Includes additional metadata useful for vector search and semantic matching.
    """

    @property
    def cast(self) -> list[str]:
        """List of cast member names."""
        return self._content.cast or []

    @property
    def directors(self) -> list[str]:
        """List of director names."""
        if self._content.director:
            return [self._content.director]
        return []

    @property
    def keywords(self) -> list[str]:
        """Searchable keywords extracted from content."""
        keywords = []

        # Combine multiple sources of keywords
        keywords.extend(self.tags)
        keywords.extend(self.genres)

        # Add cast names
        if self._content.cast:
            keywords.extend(self._content.cast)

        # Add director
        if self._content.director:
            keywords.append(self._content.director)

        # Deduplicate
        return list(set(keywords))

    @property
    def synopsis(self) -> Optional[str]:
        """Extended synopsis or plot summary."""
        # Use description as synopsis
        return self._content.description


# Type guard function for protocol checking
def is_indexable_content(obj) -> bool:
    """Check if an object implements IndexableContent protocol."""
    return isinstance(obj, (IndexableContent, BayitContentAdapter))


def is_searchable_content(obj) -> bool:
    """Check if an object implements SearchableContent protocol."""
    return isinstance(obj, (SearchableContent, BayitSearchableContentAdapter))
