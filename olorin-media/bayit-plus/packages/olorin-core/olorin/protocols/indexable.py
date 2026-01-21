"""
IndexableContent Protocol
Defines the minimal interface for content that can be indexed by Olorin services.
"""

from typing import Protocol, Optional, runtime_checkable


@runtime_checkable
class IndexableContent(Protocol):
    """
    Protocol for content that can be indexed by Olorin services.

    This protocol defines the minimal interface needed by:
    - Vector search indexing
    - Recap generation
    - Cultural context detection

    Any class implementing these properties can be used with Olorin services,
    enabling loose coupling between Olorin and content storage systems.
    """

    @property
    def id(self) -> str:
        """Unique identifier for the content."""
        ...

    @property
    def title(self) -> str:
        """Primary title of the content."""
        ...

    @property
    def description(self) -> Optional[str]:
        """Optional description or summary."""
        ...

    @property
    def content_type(self) -> str:
        """Type of content (movie, series, podcast, etc.)."""
        ...

    @property
    def original_language(self) -> str:
        """Original language code (e.g., 'he', 'en')."""
        ...

    @property
    def genres(self) -> list[str]:
        """List of genre names."""
        ...

    @property
    def tags(self) -> list[str]:
        """List of tags/keywords."""
        ...

    @property
    def release_date(self) -> Optional[str]:
        """Release date as ISO string."""
        ...

    @property
    def duration_minutes(self) -> Optional[int]:
        """Duration in minutes for movies/episodes."""
        ...

    @property
    def metadata(self) -> dict:
        """Additional metadata as key-value pairs."""
        ...


@runtime_checkable
class SearchableContent(IndexableContent, Protocol):
    """
    Extended protocol for content that can be searched with additional metadata.

    Adds fields specifically useful for vector search and semantic matching.
    """

    @property
    def cast(self) -> list[str]:
        """List of cast member names."""
        ...

    @property
    def directors(self) -> list[str]:
        """List of director names."""
        ...

    @property
    def keywords(self) -> list[str]:
        """Searchable keywords extracted from content."""
        ...

    @property
    def synopsis(self) -> Optional[str]:
        """Extended synopsis or plot summary."""
        ...
