"""
Content Protocol Definitions

Defines protocol interfaces for indexable and searchable content.
These protocols follow the Dependency Inversion Principle, allowing
Olorin services to work with any content model that implements these interfaces.
"""

from typing import Optional, Protocol


class IndexableContent(Protocol):
    """
    Protocol for content that can be indexed for vector search.

    Any object implementing this protocol can be indexed by Olorin
    vector search services without direct dependency on the content model.
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


class SearchableContent(IndexableContent, Protocol):
    """
    Extended protocol for content with enhanced search metadata.

    Includes additional fields useful for semantic search,
    recommendations, and content discovery.
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
