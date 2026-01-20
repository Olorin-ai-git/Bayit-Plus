"""Adapters for protocol-based integration."""

from app.adapters.content_adapter import (
    BayitContentAdapter,
    BayitSearchableContentAdapter,
    is_indexable_content,
    is_searchable_content,
)

__all__ = [
    "BayitContentAdapter",
    "BayitSearchableContentAdapter",
    "is_indexable_content",
    "is_searchable_content",
]
